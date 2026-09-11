import { useId, useEffect } from 'react';
import { Image } from '@/components/ui/image';

const DEFAULT_NAME_STYLE = {
  color: '#F5F5F7', outline: true, outline_color: '#0A0A0A', outline_thickness: 1.4,
  arch: 0, rise: 0, flag: 0, horiz_pos: 12, vert_pos: 99, font_size: 8
};
const DEFAULT_NUMBER_STYLE = {
  color: '#F5F5F7', outline: true, outline_color: '#0A0A0A', outline_thickness: 1.4,
  arch: 0, rise: 0, flag: 0, horiz_pos: 12, vert_pos: 23, font_size: 35
};

// Static display uses a square (1:1) container, so the SVG viewBox is 400x400.
// IdentityNameOverlay uses 300x400; we scale font/stroke by 4/3 to match visually.
const FONT_SCALE = 4 / 3;

function buildPath(y, archPct, flagPct) {
  const archOffset = 22 * archPct;
  const flagLeft = -14 * flagPct;
  const flagMid = 6 * flagPct;
  const flagRight = 20 * flagPct;
  return `M 100 ${y + flagLeft} Q 200 ${y - archOffset + flagMid} 300 ${y + 18 + flagRight}`;
}

export default function StaticNameOverlay({
  image,
  customName,
  customNumber = '',
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
  const ns = { ...DEFAULT_NAME_STYLE, ...nameStyle };
  const nus = { ...DEFAULT_NUMBER_STYLE, ...numberStyle };

  useEffect(() => {
    if (!customFontUrl || !customFontName) return;
    const id = `fontface-${customFontName.replace(/\s+/g, '-')}`;
    if (document.getElementById(id)) return;
    const style = document.createElement('style');
    style.id = id;
    style.textContent = `@font-face { font-family: '${customFontName}'; src: url('${customFontUrl}') format('truetype'); }`;
    document.head.appendChild(style);
  }, [customFontUrl, customFontName]);

  const fontFam = customFontName ? `'${customFontName}', 'Archivo Black', sans-serif` : "'Archivo Black', sans-serif";
  const displayName = (customName || '').toUpperCase() || (showNamePlaceholder ? 'YOUR NAME' : '');
  const displayNumber = customNumber || (showNumberPlaceholder ? '00' : '');
  const ls = letterSpacing ? letterSpacing / 10 : 0;

  // Same Y formulas as IdentityNameOverlay (both use 400h)
  const nameArchPct = ns.arch / 100;
  const nameFlagPct = ns.flag / 100;
  const nameBaselineY = 112.5 + (ns.vert_pos - 50);
  const nameRotation = ns.rise !== 0 ? `rotate(${-ns.rise} 200 ${nameBaselineY})` : undefined;

  const numArchPct = nus.arch / 100;
  const numFlagPct = nus.flag / 100;
  const numBaselineY = 250 + (nus.vert_pos - 50) * 2;
  const numRotation = nus.rise !== 0 ? `rotate(${-nus.rise} 200 ${numBaselineY})` : undefined;

  // Text wrapping for long names (path width is 200 in 400w viewBox)
  const ARC_WIDTH = 200;
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

  return (
    <div className={`relative overflow-hidden bg-black ${className}`}>
      {plainImage ? (
        <img src={image} alt="jersey" crossOrigin="anonymous" className="w-full h-full object-contain" />
      ) : (
        <Image src={image} alt="jersey" fittingType="fit" className="w-full h-full" />
      )}
      {(displayName || displayNumber) && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 400 400" preserveAspectRatio="xMidYMid meet">
          {displayName && (
            <g transform={nameRotation} key={`g-name-${ns.arch}-${ns.flag}-${ns.rise}-${ns.vert_pos}`}>
              {lines.map((line, i) => (
                <path key={`p-${i}`} id={`${uid}-arc-${i}`} d={buildPath(startBase + i * lineHeight, nameArchPct, nameFlagPct)} fill="none" stroke="none" />
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
                  <textPath key={`tp-${i}`} href={`#${uid}-arc-${i}`} xlinkHref={`#${uid}-arc-${i}`} startOffset={`${ns.horiz_pos}%`} textAnchor="middle">
                    {line}
                  </textPath>
                ))}
              </text>
            </g>
          )}
          {displayNumber && (
            <g transform={numRotation} key={`g-num-${nus.arch}-${nus.flag}-${nus.rise}-${nus.vert_pos}`}>
              <path id={`${uid}-num`} d={buildPath(numBaselineY, numArchPct, numFlagPct)} fill="none" stroke="none" />
              <text
                fontFamily={fontFam}
                fontSize={nus.font_size * FONT_SCALE}
                fill={nus.color}
                stroke={nus.outline ? nus.outline_color : 'none'}
                strokeWidth={nus.outline ? nus.outline_thickness * FONT_SCALE : 0}
                paintOrder="stroke fill"
              >
                <textPath href={`#${uid}-num`} xlinkHref={`#${uid}-num`} startOffset={`${nus.horiz_pos}%`} textAnchor="middle">
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