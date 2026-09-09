import { useId, useEffect } from 'react';
import { Image } from '@/components/ui/image';

const NAME_DEFAULTS = {
  color: '#F5F5F7', outline: true, outline_color: '#0A0A0A', outline_thickness: 1.4,
  arch: 0, rise: 0, flag: 0, horiz_pos: 50, vert_pos: 50, font_size: 42,
};
const NUMBER_DEFAULTS = {
  ...NAME_DEFAULTS, font_size: 76,
};

// Designer preview: renders the admin's base image (contained, not stretched)
// with name and number text overlaid. Each part has its own style object so
// the admin can customize them independently via the Name/Number tabs.
export default function TextWarpPreview({
  imageUrl = '',
  fontFamily = "'Archivo Black', sans-serif",
  customFontUrl = '',
  customFontName = '',
  nameStyle = {},
  numberStyle = {},
  enableName = true,
  enableNumber = true,
}) {
  const uid = useId();
  const ns = { ...NAME_DEFAULTS, ...nameStyle };
  const nus = { ...NUMBER_DEFAULTS, ...numberStyle };
  const fontFam = customFontName ? `'${customFontName}', 'Archivo Black', sans-serif` : fontFamily;

  useEffect(() => {
    if (!customFontUrl || !customFontName) return;
    const id = `fontface-${customFontName.replace(/\s+/g, '-')}`;
    if (document.getElementById(id)) return;
    const style = document.createElement('style');
    style.id = id;
    style.textContent = `@font-face { font-family: '${customFontName}'; src: url('${customFontUrl}') format('truetype'); }`;
    document.head.appendChild(style);
  }, [customFontUrl, customFontName]);

  const renderPart = (s, isNumber) => {
    const text = isNumber ? '00' : 'YOUR NAME';
    const archPct = s.arch / 100;
    const flagPct = s.flag / 100;
    const hasCurve = archPct > 0 || flagPct > 0;
    const stroke = s.outline ? s.outline_color : 'none';
    const strokeWidth = s.outline ? s.outline_thickness : 0;
    const baselineY = isNumber
      ? 250 + (s.vert_pos - 50) * 2
      : 112.5 + (s.vert_pos - 50);
    const x = 75 + (s.horiz_pos / 100) * 150;
    const rotation = s.rise !== 0 ? `rotate(${-s.rise} ${x} ${baselineY})` : undefined;
    const keyId = `${uid}-${isNumber ? 'num' : 'name'}`;

    const textProps = {
      fontFamily: fontFam,
      fontSize: s.font_size,
      fill: s.color,
      stroke,
      strokeWidth,
      paintOrder: 'stroke fill',
      letterSpacing: isNumber ? '2' : '1.5',
    };

    if (hasCurve) {
      const buildPath = (y) => {
        const archOffset = 22 * archPct;
        const flagLeft = -14 * flagPct;
        const flagMid = 6 * flagPct;
        const flagRight = 20 * flagPct;
        return `M 75 ${y + flagLeft} Q 150 ${y - archOffset + flagMid} 225 ${y + 18 + flagRight}`;
      };
      return (
        <g transform={rotation}>
          <defs>
            <path id={`${keyId}-path`} d={buildPath(baselineY)} fill="none" />
          </defs>
          <text {...textProps}>
            <textPath href={`#${keyId}-path`} startOffset={`${s.horiz_pos}%`} textAnchor="middle">
              {text}
            </textPath>
          </text>
        </g>
      );
    }
    return (
      <g transform={rotation}>
        <text x={x} y={baselineY} {...textProps} textAnchor="middle">
          {text}
        </text>
      </g>
    );
  };

  return (
    <div className="relative w-full overflow-hidden bg-steel rounded-[6px]" style={{ aspectRatio: '3/4' }}>
      {imageUrl ? (
        <Image src={imageUrl} alt="preview" fittingType="fit" className="absolute inset-0 w-full h-full" />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="mono-label text-fog/30 text-center px-4">UPLOAD A BASE IMAGE TO PREVIEW</span>
        </div>
      )}
      <svg viewBox="0 0 300 400" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid meet">
        {enableName && renderPart(ns, false)}
        {enableNumber && renderPart(nus, true)}
      </svg>
    </div>
  );
}