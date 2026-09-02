import { useState } from 'react';

export const PATTERNS = [
  { id: 'solid', label: 'SOLID' },
  { id: 'accent-sleeves', label: 'ACCENT SLEEVES' },
  { id: 'chest-band', label: 'CHEST BAND' },
  { id: 'shoulder-stripe', label: 'SHOULDER STRIPE' },
  { id: 'side-panels', label: 'SIDE PANELS' },
  { id: 'tri-tone', label: 'TRI-TONE' },
];

// Real white jersey photo (1024x1024, pure black background). The photo is used
// three ways: as the visible jersey (with real seams/shading), as a luminance
// mask that clips everything to the jersey silhouette, and as the base for the
// multiply tint. Pattern fills are drawn in the photo's native coordinate space
// along the detected seam landmarks, so each region follows the real jersey.
const TEMPLATE_URL =
  'https://media.base44.com/images/public/6a95dbf0d98672e2f49452f4/c14bd3065_generated_image.png';

// Seam-derived regions in 1024x1024 photo space. Sleeves are curved to follow the
// sleeve contour; the inner edge sits on the armhole seam so color stops there.
const SLEEVE_LEFT =
  'M 285 204 C 220 220, 130 255, 100 318 C 85 375, 115 438, 165 450 C 200 438, 248 425, 273 408 C 279 360, 282 282, 285 204 Z';
const SLEEVE_RIGHT =
  'M 725 204 C 804 220, 894 255, 924 318 C 939 375, 909 438, 859 450 C 824 438, 776 425, 727 408 C 721 360, 718 282, 725 204 Z';
const CHEST_BAND = { y: 472, h: 72 };
const SHOULDER_LEFT = 'M 427 196 L 285 204 L 273 360 L 427 300 Z';
const SHOULDER_RIGHT = 'M 583 196 L 725 204 L 727 360 L 583 300 Z';
const SIDE_LEFT = 'M 273 408 L 322 408 L 312 834 L 273 834 Z';
const SIDE_RIGHT = 'M 727 408 L 678 408 L 688 834 L 727 834 Z';

export default function JerseyTemplate({ primary, secondary, tertiary, pattern }) {
  const [size, setSize] = useState({ w: 1024, h: 1024 });
  const maskId = 'jersey-mask';

  const accentSleeves = pattern === 'accent-sleeves' || pattern === 'tri-tone';
  const chestBand = pattern === 'chest-band' || pattern === 'tri-tone';
  const shoulderStripe = pattern === 'shoulder-stripe';
  const sidePanels = pattern === 'side-panels';

  return (
    <div className="absolute inset-0" style={{ isolation: 'isolate' }}>
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox={`0 0 ${size.w} ${size.h}`}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          {/* Luminance mask: white jersey = opaque, black background = transparent.
              CORS is open on the asset so the mask renders cleanly. */}
          <mask
            id={maskId}
            maskContentUnits="userSpaceOnUse"
            x="0"
            y="0"
            width={size.w}
            height={size.h}
          >
            <image
              href={TEMPLATE_URL}
              x="0"
              y="0"
              width={size.w}
              height={size.h}
              preserveAspectRatio="xMidYMid meet"
              crossOrigin="anonymous"
            />
          </mask>
        </defs>

        {/* Everything in this group is clipped to the jersey silhouette, so the
            canvas background (provided by the stage) shows through untouched and
            is never tinted by the design colors. */}
        <g mask={`url(#${maskId})`}>
          {/* Visible jersey photo — provides the real seams and fabric shading */}
          <image
            href={TEMPLATE_URL}
            x="0"
            y="0"
            width={size.w}
            height={size.h}
            preserveAspectRatio="xMidYMid meet"
            crossOrigin="anonymous"
          />

          {/* Color overlay — multiply tints the jersey while preserving seams and
              shading. Clipped to the jersey by the mask above. */}
          <g style={{ mixBlendMode: 'multiply' }}>
            <rect x="0" y="0" width={size.w} height={size.h} fill={primary} />

            {accentSleeves && (
              <>
                <path d={SLEEVE_LEFT} fill={secondary} />
                <path d={SLEEVE_RIGHT} fill={secondary} />
              </>
            )}

            {chestBand && (
              <rect x="0" y={CHEST_BAND.y} width={size.w} height={CHEST_BAND.h} fill={tertiary} />
            )}

            {shoulderStripe && (
              <>
                <path d={SHOULDER_LEFT} fill={tertiary} />
                <path d={SHOULDER_RIGHT} fill={tertiary} />
              </>
            )}

            {sidePanels && (
              <>
                <path d={SIDE_LEFT} fill={tertiary} />
                <path d={SIDE_RIGHT} fill={tertiary} />
              </>
            )}
          </g>
        </g>
      </svg>

      {/* Hidden preload to read natural dimensions (keeps viewBox exact) */}
      <img
        src={TEMPLATE_URL}
        alt=""
        className="hidden"
        onLoad={(e) => {
          const nw = e.currentTarget.naturalWidth;
          const nh = e.currentTarget.naturalHeight;
          if (nw && nh) setSize({ w: nw, h: nh });
        }}
      />
    </div>
  );
}