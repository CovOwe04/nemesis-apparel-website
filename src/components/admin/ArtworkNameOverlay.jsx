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

// Default artwork position offsets (admin-adjustable via ArtworkPositionDesigner)
const DEFAULT_HORIZ_OFFSET = 55;
const DEFAULT_VERT_OFFSET = -5;

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
  horizOffset = DEFAULT_HORIZ_OFFSET,
  vertOffset = DEFAULT_VERT_OFFSET,
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

  // Apply shared offsets — both name and number move together.
  // horizOffset shifts both horizontally; vertOffset shifts both vertically
  // by the same pixel amount so they stay in the same relative position.
  const nameHorizPos = Math.min(95, Math.max(5, ns.horiz_pos + horizOffset));
  const numHorizPos = Math.min(95, Math.max(5, nus.horiz_pos + horizOffset));

  // Force flag=0 and rise=0 on artwork — tilt/slope from designer values
  // looks wrong on the flat artwork surface (unlike the jersey back preview)
  const nameArchPct = ns.arch / 100;
  const nameFlagPct = 0;
  const baseNameY = 112.5 + (ns.vert_pos - 50);
  const nameRotation = undefined;

  const numArchPct = nus.arch / 100;
  const numFlagPct = 0;
  const baseNumY = 250 + (nus.vert_pos - 50) * 2;

  // Ensure minimum vertical gap so the name stays above the number
  const minGap = ns.font_size + nus.font_size * 0.8;
  const adjustedNumY = Math.max(baseNumY, baseNameY + minGap);

  // Apply shared vertical offset (moves both together)
  const nameBaselineY = baseNameY + vertOffset;
  const numBaselineY = adjustedNumY + vertOffset;
  const numRotation = undefined;

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