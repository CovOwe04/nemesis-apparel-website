export const PATTERNS = [
  { id: 'solid', label: 'SOLID' },
  { id: 'accent-sleeves', label: 'ACCENT SLEEVES' },
  { id: 'chest-band', label: 'CHEST BAND' },
  { id: 'shoulder-stripe', label: 'SHOULDER STRIPE' },
  { id: 'side-panels', label: 'SIDE PANELS' },
  { id: 'tri-tone', label: 'TRI-TONE' },
];

// Front-view jersey SVG. Regions (body / sleeves / collar) are recolored per
// pattern, with overlay accents (chest band, shoulder stripes, side panels)
// drawn on top for the tertiary color.
export default function JerseyTemplate({ primary, secondary, tertiary, pattern }) {
  const accentSleeves = ['accent-sleeves', 'shoulder-stripe', 'tri-tone'].includes(pattern);
  const sleeves = accentSleeves ? secondary : primary;
  const collar = pattern === 'tri-tone' ? tertiary : primary;
  const showChestBand = pattern === 'chest-band' || pattern === 'tri-tone';
  const showShoulderStripe = pattern === 'shoulder-stripe';
  const showSidePanels = pattern === 'side-panels';

  return (
    <svg viewBox="0 0 300 360" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
      {/* Sleeves */}
      <path d="M 88 96 L 38 142 L 54 172 L 104 118 Z" fill={sleeves} stroke="#0A0A0A" strokeWidth="2" />
      <path d="M 212 96 L 262 142 L 246 172 L 196 118 Z" fill={sleeves} stroke="#0A0A0A" strokeWidth="2" />
      {/* Body */}
      <path
        d="M 100 78 L 125 78 Q 150 99 175 78 L 200 78 L 212 96 L 212 342 L 88 342 L 88 96 Z"
        fill={primary}
        stroke="#0A0A0A"
        strokeWidth="2"
      />
      {/* Collar band */}
      <path d="M 125 78 Q 150 99 175 78 L 173 85 Q 150 104 127 85 Z" fill={collar} stroke="#0A0A0A" strokeWidth="1.5" />

      {/* Overlays */}
      {showChestBand && <rect x="88" y="150" width="124" height="30" fill={tertiary} opacity="0.92" />}
      {showShoulderStripe && (
        <>
          <path d="M 100 80 L 124 80 L 118 112 L 96 112 Z" fill={tertiary} />
          <path d="M 200 80 L 176 80 L 182 112 L 204 112 Z" fill={tertiary} />
        </>
      )}
      {showSidePanels && (
        <>
          <rect x="94" y="112" width="14" height="226" fill={tertiary} opacity="0.85" />
          <rect x="192" y="112" width="14" height="226" fill={tertiary} opacity="0.85" />
        </>
      )}
    </svg>
  );
}