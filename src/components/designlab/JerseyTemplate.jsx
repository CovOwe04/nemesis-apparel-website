import { useState } from 'react';
import { REGIONS_BY_PATTERN, REGION_COLOR, DEFAULT_GEOMETRY, buildPath } from './geometry';

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

export default function JerseyTemplate({
  primary,
  secondary,
  tertiary,
  pattern,
  geometry = DEFAULT_GEOMETRY,
}) {
  const [size, setSize] = useState({ w: 1024, h: 1024 });
  const maskId = 'jersey-mask';

  const colorFor = (slot) => (slot === 'secondary' ? secondary : tertiary);
  const regions = REGIONS_BY_PATTERN[pattern] || [];

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

            {regions.map((rid) => (
              <path
                key={rid}
                d={buildPath(geometry[rid])}
                fill={colorFor(REGION_COLOR[rid])}
              />
            ))}
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