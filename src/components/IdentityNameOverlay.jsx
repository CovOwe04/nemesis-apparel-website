import { useId } from 'react';
import { Image } from '@/components/ui/image';

export const FONTS = [
  { id: 'block', label: 'BLOCK', family: "'Archivo Black', sans-serif" },
  { id: 'condensed', label: 'CONDENSED', family: "'Anton', sans-serif" },
  { id: 'athletic', label: 'ATHLETIC', family: "'Oswald', sans-serif" },
  { id: 'tech', label: 'TECH', family: "'Space Grotesk', sans-serif" },
  { id: 'clean', label: 'CLEAN', family: "'Inter', sans-serif" },
];

// Renders a jersey back image with the custom name overlaid exactly as it
// appears in the Identity Lab, so the cart thumbnail matches the live preview.
// useId keeps SVG path ids unique across multiple instances on the page.
export default function IdentityNameOverlay({
  back_image,
  customName,
  fontId = 'block',
  size = 40,
  curve = 0,
  height = 25,
  showPlaceholder = false,
  className = '',
}) {
  const uid = useId();
  const font = FONTS.find((f) => f.id === fontId) || FONTS[0];
  const baseSize = 4 + (size / 100) * 40;
  const curveAmount = (curve / 100) * 45;
  const baselineY = 100 + (height / 100) * 50;
  const ARC_WIDTH = 150;
  const displayName = (customName || '').toUpperCase() || (showPlaceholder ? 'YOUR NAME' : '');
  const charFactor = 0.7;
  const letterSpacing = 1.5;
  const words = displayName.split(' ').filter(Boolean);
  const longestWord = Math.max(...words.map((w) => w.length), 1);
  const fitForLongest =
    (ARC_WIDTH - Math.max(0, longestWord - 1) * letterSpacing) / (longestWord * charFactor);
  const fontSize = Math.min(baseSize, fitForLongest);
  const lineHeight = fontSize * 1.15;
  const textWidth = (t) =>
    t.length * fontSize * charFactor + Math.max(0, t.length - 1) * letterSpacing;
  const lines = [];
  let cur = '';
  for (const w of words) {
    const trial = cur ? `${cur} ${w}` : w;
    if (textWidth(trial) <= ARC_WIDTH) cur = trial;
    else {
      if (cur) lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);

  const numLines = Math.max(lines.length, 1);
  const startBase = baselineY - ((numLines - 1) / 2) * lineHeight;
  const linePath = (i) => {
    const y = startBase + i * lineHeight;
    return `M 75 ${y + curveAmount / 2} Q 150 ${y - curveAmount} 225 ${y + curveAmount / 2}`;
  };

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <Image src={back_image} alt="jersey back" fittingType="fill" className="w-full h-full" />
      {displayName && (
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 300 400"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            {lines.map((line, i) => (
              <path key={i} id={`${uid}-arc-${i}`} d={linePath(i)} fill="none" />
            ))}
          </defs>
          <text
            fontFamily={font.family}
            fontSize={fontSize}
            fill="#F5F5F7"
            stroke="#0A0A0A"
            strokeWidth="1.4"
            paintOrder="stroke fill"
            letterSpacing="1.5"
            style={{ textTransform: 'uppercase' }}
          >
            {lines.map((line, i) => (
              <textPath key={i} href={`#${uid}-arc-${i}`} startOffset="50%" textAnchor="middle">
                {line}
              </textPath>
            ))}
          </text>
        </svg>
      )}
    </div>
  );
}