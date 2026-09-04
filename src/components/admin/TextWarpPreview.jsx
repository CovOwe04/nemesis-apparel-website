import { useId, useEffect } from 'react';

// SVG text renderer that applies arch, rise, and flag simultaneously via
// independent sliders (no single warp-mode select). Arch bows the text
// upward, flag ripples it (left up / right down), rise tilts the whole group.
// A placeholder number "00" is always shown so the number vertical position
// slider has a visible target.
export default function TextWarpPreview({
  text = 'NEMESIS',
  archAmount = 0,
  riseAngle = 0,
  flagAmount = 0,
  color = '#F5F5F7',
  outline = true,
  outlineColor = '#0A0A0A',
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

  const displayName = (text || '').toUpperCase() || 'PREVIEW';
  const stroke = outline ? outlineColor : 'none';
  const strokeWidth = outline ? 1.4 : 0;
  const archPct = archAmount / 100;
  const flagPct = flagAmount / 100;
  const hasCurve = archPct > 0 || flagPct > 0;

  // Combined path blending arch (upward bow) and flag (left-up, right-down wave)
  const buildPath = (y) => {
    const archOffset = 22 * archPct;
    const flagLeft = -14 * flagPct;
    const flagMid = 6 * flagPct;
    const flagRight = 20 * flagPct;
    const startY = y + flagLeft;
    const midY = y - archOffset + flagMid;
    const endY = y + 18 + flagRight;
    return `M 40 ${startY} Q 95 ${startY} 150 ${midY} T 260 ${endY}`;
  };

  const renderText = (content, yPct, isNumber = false) => {
    const y = yPct * 2;
    const fs = isNumber ? fontSize * 1.3 : fontSize;
    const keyId = `${uid}-${isNumber ? 'num' : 'name'}`;
    const rotation = riseAngle !== 0 ? `rotate(${-riseAngle} 150 ${y})` : undefined;

    const textProps = {
      fontFamily: fontFam,
      fontSize: fs,
      fill: color,
      stroke,
      strokeWidth,
      paintOrder: 'stroke fill',
      letterSpacing: '1.5',
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
    <svg viewBox="0 0 300 200" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
      {renderText(displayName, nameY)}
      {renderText('00', numberY, true)}
    </svg>
  );
}