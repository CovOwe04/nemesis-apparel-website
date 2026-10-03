import { useId, useEffect, useState } from 'react';
import { Image } from '@/components/ui/image';
import { FONTS } from '@/lib/fonts';
import { MOCKUP_NAME_HORIZ_POS, MOCKUP_NUMBER_HORIZ_POS, resolveFont } from '@/lib/jerseyStyle';

const DEFAULT_NAME_STYLE = {
  color: '#F5F5F7', outline: true, outline_color: '#0A0A0A', outline_thickness: 1.4,
  arch: 0, rise: 0, flag: 0, horiz_pos: MOCKUP_NAME_HORIZ_POS, vert_pos: 40, font_size: 8
};
const DEFAULT_NUMBER_STYLE = {
  color: '#F5F5F7', outline: true, outline_color: '#0A0A0A', outline_thickness: 1.4,
  arch: 0, rise: 0, flag: 0, horiz_pos: MOCKUP_NUMBER_HORIZ_POS, vert_pos: 50, font_size: 35
};

// Static display uses a square (1:1) container, so the SVG viewBox is 400x400.
// IdentityNameOverlay uses 300x400; we scale font/stroke by 4/3 to match visually.
const FONT_SCALE = 4 / 3;

// Adobe-style warp (400x400 viewBox):
//  ARCH (Arc):  cubic bezier, control points lifted → upward bow (spans text width only)
//  FLAG:        cubic bezier wave — start up, end down (flipped for negative)
//  RISE:        applied as <g> rotation (separate, not in path)
function buildPath(cx, y, textWidth, archPct, flagPct) {
  const w = Math.max(textWidth, 1);
  const halfW = w / 2;
  const warpScale = 4 / 3;
  const archHeight = 50 * warpScale * archPct;
  const flagHeight = 35 * warpScale * flagPct;
  const startX = cx - halfW;
  const endX = cx + halfW;
  return `M ${startX} ${y - flagHeight} C ${startX + w / 3} ${y - flagHeight - archHeight}, ${endX - w / 3} ${y + flagHeight - archHeight}, ${endX} ${y + flagHeight}`;
}

export default function StaticNameOverlay({
  image,
  customName,
  customNumber = '',
  fontId = 'block',
  nameStyle = {},
  numberStyle = {},
  customFontUrl = '',
  customFontName = '',
  letterSpacing = 0,
  showNamePlaceholder = false,
  showNumberPlaceholder = false,
  className = '',
  plainImage = false,
}) {
  const uid = useId().replace(/:/g, '');
  const ns = { ...DEFAULT_NAME_STYLE, ...nameStyle, horiz_pos: MOCKUP_NAME_HORIZ_POS };
  const nus = { ...DEFAULT_NUMBER_STYLE, ...numberStyle, horiz_pos: MOCKUP_NUMBER_HORIZ_POS };
  const nameFont = resolveFont(nameStyle, fontId, customFontUrl, customFontName);
  const numberFont = resolveFont(numberStyle, fontId, customFontUrl, customFontName);

  useEffect(() => {
    for (const f of [nameFont, numberFont]) {
      if (!f.customFontUrl || !f.customFontName) continue;
      const id = `fontface-${f.customFontName.replace(/\s+/g, '-')}`;
      if (document.getElementById(id)) continue;
      const style = document.createElement('style');
      style.id = id;
      style.textContent = `@font-face { font-family: '${f.customFontName}'; src: url('${f.customFontUrl}'); }`;
      document.head.appendChild(style);
    }
  }, [nameFont.customFontUrl, nameFont.customFontName, numberFont.customFontUrl, numberFont.customFontName]);

  const [imgAspect, setImgAspect] = useState(1);
  useEffect(() => {
    if (!image) return;
    const img = new window.Image();
    img.onload = () => setImgAspect(img.naturalWidth / img.naturalHeight || 1);
    img.onerror = () => setImgAspect(1);
    img.src = image;
  }, [image]);
  const displayName = (customName || '').toUpperCase() || (showNamePlaceholder ? 'YOUR NAME' : '');
  const displayNumber = customNumber || (showNumberPlaceholder ? '00' : '');
  const ls = letterSpacing ? letterSpacing / 10 : 0;

  // ViewBox matches image aspect ratio so text positions map correctly
  // to the actual image — not just the square container
  const VB_WIDTH = Math.round(400 * imgAspect);
  const VB_HEIGHT = 400;

  // Same Y formulas as IdentityNameOverlay (both use 400h)
  const nameArchPct = ns.arch / 100;
  const nameFlagPct = ns.flag / 100;
  const nameBaselineY = (ns.vert_pos / 100) * VB_HEIGHT;
  const nameRotation = ns.rise !== 0 ? `rotate(${-ns.rise} ${VB_WIDTH / 2} ${nameBaselineY})` : undefined;

  const numArchPct = nus.arch / 100;
  const numFlagPct = nus.flag / 100;
  const numBaselineY = (nus.vert_pos / 100) * VB_HEIGHT;
  const numRotation = nus.rise !== 0 ? `rotate(${-nus.rise} ${VB_WIDTH / 2} ${numBaselineY})` : undefined;

  // Path center X based on horiz_pos
  const namePathCenterX = VB_WIDTH * (ns.horiz_pos / 100);
  const numPathCenterX = VB_WIDTH * (nus.horiz_pos / 100);

  // Text wrapping for long names (scales with viewBox width)
  const ARC_WIDTH = VB_WIDTH / 2;
  const charFactor = 0.7;
  const scaledNameSize = ns.font_size * FONT_SCALE;
  const words = displayName.split(' ').filter(Boolean);
  const longestWord = Math.max(...words.map((w) => w.length), 1);
  const fitForLongest = (ARC_WIDTH - Math.max(0, longestWord - 1) * ls) / (longestWord * charFactor);
  const actualNameFontSize = Math.min(scaledNameSize, fitForLongest);
  const lineHeight = actualNameFontSize * 1.15;
  const textWidth = (t) => t.length * actualNameFontSize * charFactor + Math.max(0, t.length - 1) * ls;
  const lines = [];
  let cur = '';
  for (const w of words) {
    const trial = cur ? `${cur} ${w}` : w;
    if (textWidth(trial) <= ARC_WIDTH) cur = trial;
    else { if (cur) lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);

  const numLines = Math.max(lines.length, 1);
  const startBase = nameBaselineY - ((numLines - 1) / 2) * lineHeight;
  const numTextWidth = displayNumber.length * nus.font_size * FONT_SCALE * charFactor + Math.max(0, displayNumber.length - 1) * ls;

  return (
    <div className={`relative overflow-hidden bg-black ${className}`}>
      {plainImage ? (
        <img src={image} alt="jersey" crossOrigin="anonymous" className="w-full h-full object-contain" />
      ) : (
        <Image src={image} alt="jersey" fittingType="fit" className="w-full h-full" />
      )}
      {(displayName || displayNumber) && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox={`0 0 ${VB_WIDTH} ${VB_HEIGHT}`} preserveAspectRatio="xMidYMid meet">
          {displayName && (
            <g data-overlay-name transform={nameRotation} key={`g-name-${ns.arch}-${ns.flag}-${ns.rise}-${ns.vert_pos}`}>
              {lines.map((line, i) => (
                <path key={`p-${i}`} id={`${uid}-arc-${i}`} d={buildPath(namePathCenterX, startBase + i * lineHeight, textWidth(line), nameArchPct, nameFlagPct)} fill="none" stroke="none" />
              ))}
              <text
                fontFamily={nameFont.fontFam}
                fontSize={actualNameFontSize}
                fill={ns.color}
                stroke={ns.outline ? ns.outline_color : 'none'}
                strokeWidth={ns.outline ? ns.outline_thickness * FONT_SCALE : 0}
                paintOrder="stroke fill"
                letterSpacing={ls}
                style={{ textTransform: 'uppercase' }}
              >
                {lines.map((line, i) => (
                  <textPath key={`tp-${i}`} href={`#${uid}-arc-${i}`} xlinkHref={`#${uid}-arc-${i}`} startOffset="50%" textAnchor="middle">
                    {line}
                  </textPath>
                ))}
              </text>
            </g>
          )}
          {displayNumber && (
            <g data-overlay-number transform={numRotation} key={`g-num-${nus.arch}-${nus.flag}-${nus.rise}-${nus.vert_pos}`}>
              <path id={`${uid}-num`} d={buildPath(numPathCenterX, numBaselineY, numTextWidth, numArchPct, numFlagPct)} fill="none" stroke="none" />
              <text
                fontFamily={numberFont.fontFam}
                fontSize={nus.font_size * FONT_SCALE}
                fill={nus.color}
                stroke={nus.outline ? nus.outline_color : 'none'}
                strokeWidth={nus.outline ? nus.outline_thickness * FONT_SCALE : 0}
                paintOrder="stroke fill"
              >
                <textPath href={`#${uid}-num`} xlinkHref={`#${uid}-num`} startOffset="50%" textAnchor="middle">
                  {displayNumber}
                </textPath>
              </text>
            </g>
          )}
        </svg>
      )}
    </div>
  );
}