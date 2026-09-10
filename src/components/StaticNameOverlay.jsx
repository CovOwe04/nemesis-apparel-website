import { useEffect } from 'react';
import { Image } from '@/components/ui/image';

const DEFAULT_NAME_STYLE = {
  color: '#F5F5F7', outline: true, outline_color: '#0A0A0A', outline_thickness: 1.4,
  arch: 0, rise: 0, flag: 0, horiz_pos: 12, vert_pos: 99, font_size: 8
};
const DEFAULT_NUMBER_STYLE = {
  color: '#F5F5F7', outline: true, outline_color: '#0A0A0A', outline_thickness: 1.4,
  arch: 0, rise: 0, flag: 0, horiz_pos: 12, vert_pos: 23, font_size: 35
};

export default function StaticNameOverlay({
  image,
  customName,
  customNumber = '',
  nameStyle = {},
  numberStyle = {},
  customFontUrl = '',
  customFontName = '',
  letterSpacing = 0,
  showPlaceholder = false,
  className = '',
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

  const fontFam = customFontName ? `'${customFontName}', 'Archivo Black', sans-serif` : "'Archivo Black', sans-serif";
  const displayName = (customName || '').toUpperCase() || (showPlaceholder ? 'YOUR NAME' : '');
  const displayNumber = customNumber || (showPlaceholder ? '00' : '');

  // Map admin SVG coordinates to percentages (WYSIWYG with admin preview)
  // Name: baselineY = 112.5 + (vert_pos - 50) in 400h → posY = (62.5 + vert_pos) / 4
  // Number: baselineY = 250 + (vert_pos - 50) * 2 in 400h → posY = (150 + 2*vert_pos) / 4
  // X: 75 + (horiz_pos/100)*150 in 300w → posX = 25 + horiz_pos / 2
  const namePosX = 25 + ns.horiz_pos / 2;
  const namePosY = (62.5 + ns.vert_pos) / 4;
  const numPosX = 25 + nus.horiz_pos / 2;
  const numPosY = (150 + 2 * nus.vert_pos) / 4;

  // Font size: SVG units to cqw (300w viewBox → 1 cqw = 3 SVG units)
  const nameLen = displayName.length;
  const nameBaseCqw = ns.font_size / 3;
  const nameFontSizeCqw = nameLen > 10 ? Math.max(2, nameBaseCqw - (nameLen - 10) * 0.08) : nameBaseCqw;
  const numFontSizeCqw = nus.font_size / 3;

  const ls = letterSpacing ? letterSpacing / 1000 : 0;

  const makeShadow = (s) => s.outline
    ? `0.12em 0.12em 0 ${s.outline_color}, -0.06em -0.06em 0 ${s.outline_color}, 0.06em -0.06em 0 ${s.outline_color}, -0.06em 0.06em 0 ${s.outline_color}`
    : 'none';

  return (
    <div className={`relative overflow-hidden bg-black ${className}`} style={{ containerType: 'inline-size' }}>
      <Image src={image} alt="jersey" fittingType="fit" className="w-full h-full" />
      {displayName && (
        <div className="absolute pointer-events-none" style={{ left: `${namePosX}%`, top: `${namePosY}%`, transform: 'translate(-50%, -50%)' }}>
          <span style={{
            fontFamily: fontFam,
            fontSize: `${nameFontSizeCqw}cqw`,
            lineHeight: 1.1,
            color: ns.color,
            textShadow: makeShadow(ns),
            letterSpacing: `${ls}em`,
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
            fontSize: `${numFontSizeCqw}cqw`,
            lineHeight: 1.1,
            color: nus.color,
            textShadow: makeShadow(nus),
            letterSpacing: `${ls}em`,
            whiteSpace: 'nowrap',
          }}>
            {displayNumber}
          </span>
        </div>
      )}
    </div>
  );
}