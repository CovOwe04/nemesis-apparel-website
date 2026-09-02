import { useState } from 'react';

export const PATTERNS = [
  { id: 'solid', label: 'SOLID' },
  { id: 'accent-sleeves', label: 'ACCENT SLEEVES' },
  { id: 'chest-band', label: 'CHEST BAND' },
  { id: 'shoulder-stripe', label: 'SHOULDER STRIPE' },
  { id: 'side-panels', label: 'SIDE PANELS' },
  { id: 'tri-tone', label: 'TRI-TONE' },
];

// Real white jersey photo (1024x1024, pure black background). Pattern fills are
// drawn in the photo's native coordinate space and mapped to the jersey's
// actual seams (detected landmarks), so each region follows the real jersey.
const TEMPLATE_URL =
  'https://media.base44.com/images/public/6a95dbf0d98672e2f49452f4/c14bd3065_generated_image.png';

// Seam-derived regions in 1024x1024 photo space.
const SLEEVE_LEFT = 'M 285 204 L 107 319 L 171 444 L 273 408 Z';
const SLEEVE_RIGHT = 'M 725 204 L 893 319 L 829 444 L 727 408 Z';
const CHEST_BAND = { y: 472, h: 72 };
const SHOULDER_LEFT = 'M 427 196 L 285 204 L 273 360 L 427 300 Z';
const SHOULDER_RIGHT = 'M 583 196 L 725 204 L 727 360 L 583 300 Z';
const SIDE_LEFT = 'M 273 408 L 322 408 L 312 834 L 273 834 Z';
const SIDE_RIGHT = 'M 727 408 L 678 408 L 688 834 L 727 834 Z';

export default function JerseyTemplate({ primary, secondary, tertiary, pattern }) {
  const [size, setSize] = useState({ w: 1024, h: 1024 });

  const accentSleeves = pattern === 'accent-sleeves' || pattern === 'tri-tone';
  const chestBand = pattern === 'chest-band' || pattern === 'tri-tone';
  const shoulderStripe = pattern === 'shoulder-stripe';
  const sidePanels = pattern === 'side-panels';

  return (
    <div className="absolute inset-0 bg-black" style={{ isolation: 'isolate' }}>
      {/* Real jersey photo — provides the silhouette, seams and fabric shading */}
      <img
        src={TEMPLATE_URL}
        alt="jersey template"
        className="absolute inset-0 w-full h-full object-contain"
        draggable={false}
        onLoad={(e) => {
          const nw = e.currentTarget.naturalWidth;
          const nh = e.currentTarget.naturalHeight;
          if (nw && nh) setSize({ w: nw, h: nh });
        }}
      />

      {/* Color overlay — multiply tints the white jersey (black background stays
          black), and the photo's seams/shading show through the tint. Shapes are
          positioned to the jersey's real seams so fills follow the jersey. */}
      <svg
        className="absolute inset-0 w-full h-full mix-blend-multiply"
        viewBox={`0 0 ${size.w} ${size.h}`}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Base tint */}
        <rect x="0" y="0" width={size.w} height={size.h} fill={primary} />

        {/* Accent sleeves — follow the sleeve seams */}
        {accentSleeves && (
          <>
            <path d={SLEEVE_LEFT} fill={secondary} />
            <path d={SLEEVE_RIGHT} fill={secondary} />
          </>
        )}

        {/* Chest band — sits across the chest below the armholes */}
        {chestBand && (
          <rect x="0" y={CHEST_BAND.y} width={size.w} height={CHEST_BAND.h} fill={tertiary} />
        )}

        {/* Shoulder stripes — follow the shoulder seams */}
        {shoulderStripe && (
          <>
            <path d={SHOULDER_LEFT} fill={tertiary} />
            <path d={SHOULDER_RIGHT} fill={tertiary} />
          </>
        )}

        {/* Side panels — follow the side seams */}
        {sidePanels && (
          <>
            <path d={SIDE_LEFT} fill={tertiary} />
            <path d={SIDE_RIGHT} fill={tertiary} />
          </>
        )}
      </svg>
    </div>
  );
}