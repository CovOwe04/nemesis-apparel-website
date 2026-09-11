import { useId, useEffect } from 'react';

export const FONTS = [
  { id: 'block', label: 'BLOCK', family: "'Archivo Black', sans-serif" },
  { id: 'condensed', label: 'CONDENSED', family: "'Anton', sans-serif" },
  { id: 'athletic', label: 'ATHLETIC', family: "'Oswald', sans-serif" },
  { id: 'tech', label: 'TECH', family: "'Space Grotesk', sans-serif" },
  { id: 'clean', label: 'CLEAN', family: "'Inter', sans-serif" },
];

const DEFAULT_NAME_STYLE = {
  color: '#F5F5F7', outline: true, outline_color: '#0A0A0A', outline_thickness: 1.4,
  arch: 0, rise: 0, flag: 0, horiz_pos: 30, vert_pos: 40, font_size: 8
};
const DEFAULT_NUMBER_STYLE = {
  color: '#F5F5F7', outline: true, outline_color: '#0A0A0A', outline_thickness: 1.4,
  arch: 0, rise: 0, flag: 0, horiz_pos: 30, vert_pos: 50, font_size: 35
};

const DEFAULT_HORIZ_OFFSET = 55;
const DEFAULT_VERT_OFFSET = -5;

// Adobe-style warp:
//  ARCH (Arc):  cubic bezier, control points lifted → upward bow (spans text width only)
//  FLAG:        cubic bezier wave — start up, end down (flipped for negative)
//  RISE:        applied as <g> rotation (separate, not in path)
function buildPath(cx, y, textWidth, archPct, flagPct, scale) {
  const w = Math.max(textWidth, 1);
  const halfW = w / 2;
  const archHeight = 50 * scale * archPct;
  const flagHeight = 35 * scale * flagPct;
  const startX = cx - halfW;
  const endX = cx + halfW;
  return `M ${startX} ${y - flagHeight} C ${startX + w / 3} ${y - flagHeight - archHeight}, ${endX - w / 3} ${y + flagHeight - archHeight}, ${endX} ${y + flagHeight}`;
}

export default function ArtworkNameOverlay({
  artworkUrl,
  customName,
  customNumber = '',
  fontId = 'block',
  nameStyle = {},
  numberStyle = {},
  customFontUrl = '',
  customFontName = '',
  letterSpacing = 0,
  aspectRatio = 1,
  enableName = true,
  enableNumber = true,
  horizOffset = DEFAULT_HORIZ_OFFSET,
  vertOffset = DEFAULT_VERT_OFFSET,
  staticDisplay = false,
}) {
  const uid = useId().replace(/:/g, '');
  const font = FONTS.find((f) => f.id === fontId) || FONTS[0];
  const ns = { ...DEFAULT_NAME_STYLE, ...nameStyle };
  const nus = { ...DEFAULT_NUMBER_STYLE, ...numberStyle };

  useEffect(() => {
    if (!customFontUrl || !customFontName) return;
    const id = `fontface-artwork-${customFontName.replace(/\s+/g, '-')}`;
    if (document.getElementById(id)) return;
    const style = document.createElement('style');
    style.id = id;
    style.textContent = `@font-face { font-family: '${customFontName}'; src: url('${customFontUrl}') format('truetype'); }`;
    document.head.appendChild(style);
  }, [customFontUrl, customFontName]);

  const fontFam = customFontName ? `'${customFontName}', ${font.family}` : font.family;
  const displayName = enableName ? (customName || '').toUpperCase() : '';
  const displayNumber = enableNumber ? (customNumber || '') : '';
  const ls = letterSpacing ? letterSpacing / 10 : 0;

  // ViewBox matches artwork aspect ratio; height stays 400 so designer Y formulas transfer
  const vbHeight = 400;
  const vbWidth = Math.round(400 * aspectRatio);
  const cx = vbWidth / 2;
  const FONT_SCALE = staticDisplay ? 4 / 3 : 1;

  // Same formulas as IdentityNameOverlay, plus shared offsets that move both together
  const nameArchPct = ns.arch / 100;
  const nameFlagPct = ns.flag / 100;
  const nameBaselineY = (ns.vert_pos / 100) * vbHeight + vertOffset;
  const nameRotation = ns.rise !== 0 ? `rotate(${-ns.rise} ${cx} ${nameBaselineY})` : undefined;

  const numArchPct = nus.arch / 100;
  const numFlagPct = nus.flag / 100;
  const numBaselineY = (nus.vert_pos / 100) * vbHeight + vertOffset;
  const numRotation = nus.rise !== 0 ? `rotate(${-nus.rise} ${cx} ${numBaselineY})` : undefined;

  // Apply shared horizontal offset (moves both together)
  const nameHorizPos = Math.min(95, Math.max(5, ns.horiz_pos + horizOffset));
  const numHorizPos = Math.min(95, Math.max(5, nus.horiz_pos + horizOffset));
  const namePathCenterX = vbWidth * (nameHorizPos / 100);
  const numPathCenterX = vbWidth * (numHorizPos / 100);

  // Text wrapping for long names (scaled to match Identity Lab visual size)
  const ARC_WIDTH = 150 * FONT_SCALE;
  const charFactor = 0.7;
  const words = displayName.split(' ').filter(Boolean);
  const longestWord = Math.max(...words.map((w) => w.length), 1);
  const fitForLongest = (ARC_WIDTH - Math.max(0, longestWord - 1) * ls) / (longestWord * charFactor);
  const actualNameFontSize = Math.min(ns.font_size * FONT_SCALE, fitForLongest);
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
    <div className="relative overflow-hidden w-full h-full">
      <img src={artworkUrl} alt="artwork" crossOrigin="anonymous" className="w-full h-full object-contain" />
      {displayName && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox={`0 0 ${vbWidth} ${vbHeight}`} preserveAspectRatio="xMidYMid meet">
          <g transform={nameRotation} key={`g-name-${ns.arch}-${ns.flag}-${ns.rise}-${ns.vert_pos}`}>
            {lines.map((line, i) => (
              <path key={`p-${i}`} id={`${uid}-arc-${i}`} d={buildPath(namePathCenterX, startBase + i * lineHeight, textWidth(line), nameArchPct, nameFlagPct, FONT_SCALE)} fill="none" stroke="none" />
            ))}
            <text
              fontFamily={fontFam}
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
          {displayNumber && (
            <g transform={numRotation} key={`g-num-${nus.arch}-${nus.flag}-${nus.rise}-${nus.vert_pos}`}>
              <path id={`${uid}-num`} d={buildPath(numPathCenterX, numBaselineY, numTextWidth, numArchPct, numFlagPct, FONT_SCALE)} fill="none" stroke="none" />
              <text
                fontFamily={fontFam}
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