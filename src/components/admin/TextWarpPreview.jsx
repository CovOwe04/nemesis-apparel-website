import { useId, useEffect } from 'react';
import { Image } from '@/components/ui/image';

// Designer preview: renders the admin's base image as the jersey background
// with the text overlaid in the same position as the buy-screen IdentityNameOverlay
// (viewBox 0 0 300 400). Arch, rise, and flag are applied simultaneously via
// independent sliders. A placeholder number "00" is shown so the number
// vertical position slider has a visible target.
export default function TextWarpPreview({
  imageUrl = '',
  text = 'YOUR NAME',
  number = '00',
  archAmount = 0,
  riseAngle = 0,
  flagAmount = 0,
  color = '#F5F5F7',
  outline = true,
  outlineColor = '#0A0A0A',
  outlineThickness = 1.4,
  fontSize = 42,
  nameY = 25,
  numberY = 50,
  fontFamily = "'Archivo Black', sans-serif",
  customFontUrl = '',
  customFontName = '',
}) {
  const uid = useId();
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

  const displayName = (text || '').toUpperCase() || 'YOUR NAME';
  const displayNumber = number || '00';
  const stroke = outline ? outlineColor : 'none';
  const strokeWidth = outline ? outlineThickness : 0;
  const archPct = archAmount / 100;
  const flagPct = flagAmount / 100;
  const hasCurve = archPct > 0 || flagPct > 0;

  // Match IdentityNameOverlay positioning (viewBox 0 0 300 400)
  const nameBaselineY = 100 + (nameY / 100) * 50;
  const numberBaselineY = 200 + (numberY / 100) * 100;

  const buildPath = (y) => {
    const archOffset = 22 * archPct;
    const flagLeft = -14 * flagPct;
    const flagMid = 6 * flagPct;
    const flagRight = 20 * flagPct;
    const startY = y + flagLeft;
    const midY = y - archOffset + flagMid;
    const endY = y + 18 + flagRight;
    return `M 75 ${startY} Q 150 ${midY} 225 ${endY}`;
  };

  const renderText = (content, y, isNumber = false) => {
    const fs = isNumber ? fontSize * 1.8 : fontSize;
    const keyId = `${uid}-${isNumber ? 'num' : 'name'}`;
    const rotation = riseAngle !== 0 ? `rotate(${-riseAngle} 150 ${y})` : undefined;
    const textProps = {
      fontFamily: fontFam,
      fontSize: fs,
      fill: color,
      stroke,
      strokeWidth,
      paintOrder: 'stroke fill',
      letterSpacing: isNumber ? '2' : '1.5',
    };

    if (hasCurve) {
      return (
        <g transform={rotation}>
          <defs>
            <path id={`${keyId}-path`} d={buildPath(y)} fill="none" />
          </defs>
          <text {...textProps}>
            <textPath href={`#${keyId}-path`} startOffset="50%" textAnchor="middle">
              {content}
            </textPath>
          </text>
        </g>
      );
    }
    return (
      <g transform={rotation}>
        <text x="150" y={y} {...textProps} textAnchor="middle">
          {content}
        </text>
      </g>
    );
  };

  return (
    <div className="relative w-full overflow-hidden bg-steel rounded-[6px]" style={{ aspectRatio: '3/4' }}>
      {imageUrl ? (
        <Image src={imageUrl} alt="preview" fittingType="fill" className="absolute inset-0 w-full h-full" />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="mono-label text-fog/30 text-center px-4">UPLOAD A BASE IMAGE TO PREVIEW</span>
        </div>
      )}
      <svg viewBox="0 0 300 400" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid meet">
        {renderText(displayName, nameBaselineY)}
        {renderText(displayNumber, numberBaselineY, true)}
      </svg>
    </div>
  );
}