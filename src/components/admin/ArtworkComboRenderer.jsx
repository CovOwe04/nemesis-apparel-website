import { useEffect } from 'react';

// Dedicated renderer for compositing name/number onto print-ready artwork files.
// Uses px-based font sizing (not cqw) so html2canvas can capture the text correctly.
// Positioning mirrors StaticNameOverlay (percentage-based, same formulas).

const DEFAULT_NAME_STYLE = {
  color: '#F5F5F7', outline: true, outline_color: '#0A0A0A', outline_thickness: 1.4,
  arch: 0, rise: 0, flag: 0, horiz_pos: 12, vert_pos: 99, font_size: 8,
};
const DEFAULT_NUMBER_STYLE = {
  color: '#F5F5F7', outline: true, outline_color: '#0A0A0A', outline_thickness: 1.4,
  arch: 0, rise: 0, flag: 0, horiz_pos: 12, vert_pos: 23, font_size: 35,
};

export default function ArtworkComboRenderer({
  imageUrl,
  customName,
  customNumber,
  nameStyle = {},
  numberStyle = {},
  customFontUrl = '',
  customFontName = '',
  enableName = true,
  enableNumber = true,
  containerWidth = 600,
}) {
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

  const fontFam = customFontName
    ? `'${customFontName}', 'Archivo Black', sans-serif`
    : "'Archivo Black', sans-serif";

  const displayName = enableName ? (customName || '').toUpperCase() : '';
  const displayNumber = enableNumber ? customNumber || '' : '';

  // Positioning (same as StaticNameOverlay — percentage-based)
  const namePosX = 25 + ns.horiz_pos / 2;
  const namePosY = (62.5 + ns.vert_pos) / 4;
  const numPosX = 25 + nus.horiz_pos / 2;
  const numPosY = (150 + 2 * nus.vert_pos) / 4;

  // Font size: SVG units (300w viewBox) → px based on container width
  // 1 cqw = containerWidth/100 px, and font_size/3 cqw → font_size/3 * containerWidth/100 = font_size * containerWidth / 300
  const nameLen = displayName.length;
  const nameBasePx = (ns.font_size / 300) * containerWidth;
  const nameFontSizePx = nameLen > 10 ? Math.max(2, nameBasePx - (nameLen - 10) * (nameBasePx * 0.008)) : nameBasePx;
  const numFontSizePx = (nus.font_size / 300) * containerWidth;

  const makeShadow = (s) => s.outline
    ? `0.12em 0.12em 0 ${s.outline_color}, -0.06em -0.06em 0 ${s.outline_color}, 0.06em -0.06em 0 ${s.outline_color}, -0.06em 0.06em 0 ${s.outline_color}`
    : 'none';

  return (
    <div className="relative overflow-hidden w-full h-full">
      <img src={imageUrl} alt="artwork" crossOrigin="anonymous" className="w-full h-full object-contain" />
      {displayName && (
        <div className="absolute pointer-events-none" style={{ left: `${namePosX}%`, top: `${namePosY}%`, transform: 'translate(-50%, -50%)' }}>
          <span style={{
            fontFamily: fontFam,
            fontSize: `${nameFontSizePx}px`,
            lineHeight: 1.1,
            color: ns.color,
            textShadow: makeShadow(ns),
            whiteSpace: 'nowrap',
            textTransform: 'uppercase',
          }}>
            {displayName}
          </span>
        </div>
      )}
      {displayNumber && (
        <div className="absolute pointer-events-none" style={{ left: `${numPosX}%`, top: `${numPosY}%`, transform: 'translate(-50%, -50%)' }}>
          <span style={{
            fontFamily: fontFam,
            fontSize: `${numFontSizePx}px`,
            lineHeight: 1.1,
            color: nus.color,
            textShadow: makeShadow(nus),
            whiteSpace: 'nowrap',
          }}>
            {displayNumber}
          </span>
        </div>
      )}
    </div>
  );
}