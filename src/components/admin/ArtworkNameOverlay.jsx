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
  arch: 0, rise: 0, flag: 0, horiz_pos: 12, vert_pos: 99, font_size: 8
};
const DEFAULT_NUMBER_STYLE = {
  color: '#F5F5F7', outline: true, outline_color: '#0A0A0A', outline_thickness: 1.4,
  arch: 0, rise: 0, flag: 0, horiz_pos: 12, vert_pos: 23, font_size: 35
};

// Offsets to map designer (jersey back) positions → artwork (front) positions.
// Designer values are calibrated for the jersey back image; the front artwork
// has a different design layout so we shift the name/number into the center area.
const VERT_OFFSET_NAME = 30;    // push name down into chest-center zone
const VERT_OFFSET_NUMBER = 12; // push number down below name
const HORIZ_OFFSET = 38;       // center horizontally (designer default 12 → 50)

function buildPath(cx, y, archPct, flagPct) {
  const archOffset = 22 * archPct;
  const flagLeft = -14 * flagPct;
  const flagMid = 6 * flagPct;
  const flagRight = 20 * flagPct;
  const halfW = 75;
  return `M ${cx - halfW} ${y + flagLeft} Q ${cx} ${y - archOffset + flagMid} ${cx + halfW} ${y + 18 + flagRight}`;
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
}) {
  const uid = useId();
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

  // Apply offsets to designer positioning values
  const nameVertPos = ns.vert_pos + VERT_OFFSET_NAME;
  const numVertPos = nus.vert_pos + VERT_OFFSET_NUMBER;
  const nameHorizPos = Math.min(95, Math.max(5, ns.horiz_pos + HORIZ_OFFSET));
  const numHorizPos = Math.min(95, Math.max(5, nus.horiz_pos + HORIZ_OFFSET));

  const nameArchPct = ns.arch / 100;
  const nameFlagPct = ns.flag / 100;
  const nameBaselineY = 112.5 + (nameVertPos - 50);
  const nameRotation = ns.rise !== 0 ? `rotate(${-ns.rise} ${cx} ${nameBaselineY})` : undefined;

  const numArchPct = nus.arch / 100;
  const numFlagPct = nus.flag / 100;
  const numBaselineY = 250 + (numVertPos - 50) * 2;
  const numRotation = nus.rise !== 0 ? `rotate(${-nus.rise} ${cx} ${numBaselineY})` : undefined;

  // Text wrapping for long names
  const ARC_WIDTH = 150;
  const charFactor = 0.7;
  const words = displayName.split(' ').filter(Boolean);
  const longestWord = Math.max(...words.map((w) => w.length), 1);
  const fitForLongest = (ARC_WIDTH - Math.max(0, longestWord - 1) * ls) / (longestWord * charFactor);
  const actualNameFontSize = Math.min(ns.font_size, fitForLongest);
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
    <div className="relative overflow-hidden w-full h-full">
      <img src={artworkUrl} alt="artwork" crossOrigin="anonymous" className="w-full h-full object-contain" />
      {displayName && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox={`0 0 ${vbWidth} ${vbHeight}`} preserveAspectRatio="xMidYMid meet">
          <defs>
            {lines.map((line, i) => (
              <path key={i} id={`${uid}-arc-${i}`} d={buildPath(cx, startBase + i * lineHeight, nameArchPct, nameFlagPct)} fill="none" />
            ))}
            {displayNumber && (
              <path id={`${uid}-num`} d={buildPath(cx, numBaselineY, numArchPct, numFlagPct)} fill="none" />
            )}
          </defs>
          <g transform={nameRotation}>
            <text
              fontFamily={fontFam}
              fontSize={actualNameFontSize}
              fill={ns.color}
              stroke={ns.outline ? ns.outline_color : 'none'}
              strokeWidth={ns.outline ? ns.outline_thickness : 0}
              paintOrder="stroke fill"
              letterSpacing={ls}
              style={{ textTransform: 'uppercase' }}
            >
              {lines.map((line, i) => (
                <textPath key={i} href={`#${uid}-arc-${i}`} startOffset={`${nameHorizPos}%`} textAnchor="middle">
                  {line}
                </textPath>
              ))}
            </text>
          </g>
          {displayNumber && (
            <g transform={numRotation}>
              <text
                fontFamily={fontFam}
                fontSize={nus.font_size}
                fill={nus.color}
                stroke={nus.outline ? nus.outline_color : 'none'}
                strokeWidth={nus.outline ? nus.outline_thickness : 0}
                paintOrder="stroke fill"
              >
                <textPath href={`#${uid}-num`} startOffset={`${numHorizPos}%`} textAnchor="middle">
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