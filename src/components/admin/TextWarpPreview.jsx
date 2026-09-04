import { useId, useEffect } from 'react';

// SVG text renderer that visualizes the three warp styles:
// - arch: text follows a convex upward arc (rainbow/smile)
// - rise: text tilted at a linear angle
// - flag: text follows a rippling wave path (left up, right down)
// Used in the admin product manager as a live preview of default text styling.
export default function TextWarpPreview({
  text = 'NEMESIS',
  number = '00',
  warp = 'none',
  color = '#F5F5F7',
  outline = true,
  outlineColor = '#0A0A0A',
  fontSize = 42,
  nameY = 40,
  numberY = 70,
  showNumber = false,
  fontFamily = "'Archivo Black', sans-serif",
  customFontUrl = '',
  customFontName = '',
}) {
  const uid = useId();
  const fontFam = customFontName ? `'${customFontName}', 'Archivo Black', sans-serif` : fontFamily;

  // Inject @font-face for custom uploaded fonts so the preview renders correctly.
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

  // Arch path: convex upward — middle peaks higher (lower Y)
  const archPath = (y) => `M 40 ${y + 18} Q 150 ${y - 22} 260 ${y + 18}`;

  // Flag path: wave — left side up, right side down, rippling through middle
  const flagPath = (y) => `M 40 ${y - 14} Q 95 ${y - 14} 150 ${y + 6} T 260 ${y + 20}`;

  const renderText = (content, y, isNumber = false) => {
    const fs = isNumber ? fontSize * 1.3 : fontSize;
    if (warp === 'arch') {
      return (
        <>
          <defs>
            <path id={`${uid}-arc-${isNumber ? 'num' : 'name'}`} d={archPath(y)} fill="none" />
          </defs>
          <text
            fontFamily={fontFam}
            fontSize={fs}
            fill={color}
            stroke={stroke}
            strokeWidth={strokeWidth}
            paintOrder="stroke fill"
            letterSpacing="1.5"
          >
            <textPath href={`#${uid}-arc-${isNumber ? 'num' : 'name'}`} startOffset="50%" textAnchor="middle">
              {content}
            </textPath>
          </text>
        </>
      );
    }
    if (warp === 'flag') {
      return (
        <>
          <defs>
            <path id={`${uid}-flag-${isNumber ? 'num' : 'name'}`} d={flagPath(y)} fill="none" />
          </defs>
          <text
            fontFamily={fontFam}
            fontSize={fs}
            fill={color}
            stroke={stroke}
            strokeWidth={strokeWidth}
            paintOrder="stroke fill"
            letterSpacing="1.5"
          >
            <textPath href={`#${uid}-flag-${isNumber ? 'num' : 'name'}`} startOffset="50%" textAnchor="middle">
              {content}
            </textPath>
          </text>
        </>
      );
    }
    if (warp === 'rise') {
      // Tilt the text group upward left-to-right (~15°)
      return (
        <g transform={`rotate(-15 150 ${y})`}>
          <text
            x="150"
            y={y}
            fontFamily={fontFam}
            fontSize={fs}
            fill={color}
            stroke={stroke}
            strokeWidth={strokeWidth}
            paintOrder="stroke fill"
            letterSpacing="1.5"
            textAnchor="middle"
          >
            {content}
          </text>
        </g>
      );
    }
    // none — straight text
    return (
      <text
        x="150"
        y={y}
        fontFamily={fontFam}
        fontSize={fs}
        fill={color}
        stroke={stroke}
        strokeWidth={strokeWidth}
        paintOrder="stroke fill"
        letterSpacing="1.5"
        textAnchor="middle"
      >
        {content}
      </text>
    );
  };

  return (
    <svg
      viewBox="0 0 300 200"
      className="w-full h-full"
      preserveAspectRatio="xMidYMid meet"
    >
      {renderText(displayName, nameY * 2)}
      {showNumber && renderText(number || '00', numberY * 2, true)}
    </svg>
  );
}