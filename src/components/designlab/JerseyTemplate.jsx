import { useId } from 'react';

export const PATTERNS = [
  { id: 'solid', label: 'SOLID' },
  { id: 'accent-sleeves', label: 'ACCENT SLEEVES' },
  { id: 'chest-band', label: 'CHEST BAND' },
  { id: 'shoulder-stripe', label: 'SHOULDER STRIPE' },
  { id: 'side-panels', label: 'SIDE PANELS' },
  { id: 'tri-tone', label: 'TRI-TONE' },
];

// Vector jersey silhouette — seams, sleeve cuffs, side seams and a curved hem
// are built in so every pattern fill follows the jersey, not the canvas box.
const SILHOUETTE =
  'M 125 78 Q 150 100 175 78 L 200 90 L 236 101 L 241 152 L 214 147 L 211 296 Q 150 320 89 296 L 86 147 L 59 152 L 64 101 L 100 90 Z';

export default function JerseyTemplate({ primary, secondary, tertiary, pattern }) {
  const uid = useId();
  const clipId = `jersey-${uid}`;
  const shadeId = `shade-${uid}`;

  const accentSleeves = pattern === 'accent-sleeves' || pattern === 'tri-tone';
  const chestBand = pattern === 'chest-band' || pattern === 'tri-tone';
  const shoulderStripe = pattern === 'shoulder-stripe';
  const sidePanels = pattern === 'side-panels';

  return (
    <svg
      className="absolute inset-0 w-full h-full"
      viewBox="0 0 300 400"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <clipPath id={clipId}>
          <path d={SILHOUETTE} />
        </clipPath>
        <linearGradient id={shadeId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.16" />
          <stop offset="55%" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.28" />
        </linearGradient>
      </defs>

      <g clipPath={`url(#${clipId})`}>
        {/* Base fill */}
        <rect x="0" y="0" width="300" height="400" fill={primary} />

        {/* Accent sleeves */}
        {accentSleeves && (
          <>
            <path d="M 100 90 L 64 101 L 59 152 L 86 147 Z" fill={secondary} />
            <path d="M 200 90 L 236 101 L 241 152 L 214 147 Z" fill={secondary} />
          </>
        )}

        {/* Chest band */}
        {chestBand && <rect x="0" y="150" width="300" height="30" fill={tertiary} />}

        {/* Shoulder stripes */}
        {shoulderStripe && (
          <>
            <rect x="0" y="0" width="120" height="42" fill={tertiary} />
            <rect x="180" y="0" width="120" height="42" fill={tertiary} />
          </>
        )}

        {/* Side panels */}
        {sidePanels && (
          <>
            <rect x="0" y="140" width="24" height="170" fill={tertiary} />
            <rect x="276" y="140" width="24" height="170" fill={tertiary} />
          </>
        )}

        {/* Seam lines */}
        <g stroke="rgba(0,0,0,0.35)" strokeWidth="2" fill="none" strokeLinecap="round">
          <path d="M 125 78 Q 150 100 175 78" />
          <path d="M 125 78 L 100 90" />
          <path d="M 175 78 L 200 90" />
          <path d="M 100 90 L 86 147" />
          <path d="M 200 90 L 214 147" />
          <path d="M 86 147 L 89 296" />
          <path d="M 214 147 L 211 296" />
          <path d="M 59 152 Q 72 150 86 147" />
          <path d="M 241 152 Q 228 150 214 147" />
        </g>

        {/* Curved hem */}
        <path d="M 89 296 Q 150 320 211 296" stroke="rgba(0,0,0,0.5)" strokeWidth="3" fill="none" />

        {/* Fabric shading for depth */}
        <rect x="0" y="0" width="300" height="400" fill={`url(#${shadeId})`} />
      </g>

      {/* Silhouette outline */}
      <path d={SILHOUETTE} fill="none" stroke="rgba(0,0,0,0.55)" strokeWidth="2" />
    </svg>
  );
}