import { buildPath } from './geometry';

export const PATTERNS = [
  { id: 'accent-sleeves', label: 'ACCENT SLEEVES' },
  { id: 'chest-band', label: 'CHEST BAND' },
  { id: 'shoulder-stripe', label: 'SHOULDER STRIPE' },
  { id: 'side-panels', label: 'SIDE PANELS' },
];

// Real white jersey photo (1024x1024, pure black background). The photo is used
// three ways: as the visible jersey (with real seams/shading), as a luminance
// mask that clips everything to the jersey silhouette, and as the base for the
// multiply tint. Pattern fills are drawn in the photo's native coordinate space
// along the detected seam landmarks, so each region follows the real jersey.
export const TEMPLATE_URL =
  'https://media.base44.com/images/public/6a95dbf0d98672e2f49452f4/c14bd3065_generated_image.png';

export const BACK_TEMPLATE_URL =
  'https://media.base44.com/images/public/6a95dbf0d98672e2f49452f4/62eb8c0d5_generated_image.png';

// `regions` is a list of { id, fill } — the caller resolves which regions are
// active and what color each one gets (built-in patterns keep their assigned
// slot; custom shapes carry their own). `geometry` holds the anchors/handles.
// `templateUrl` selects which jersey photo to use (front vs back).
export default function JerseyTemplate({ primary, regions, geometry = {}, templateUrl = TEMPLATE_URL }) {
  // Fixed 1024x1024 coordinate space — keeps geometry anchors compatible across
  // front and back templates regardless of each photo's natural dimensions.
  const size = { w: 1024, h: 1024 };
  const maskId = 'jersey-mask';

  return (
    <div className="absolute inset-0" style={{ isolation: 'isolate' }}>
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox={`0 0 ${size.w} ${size.h}`}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          {/* Luminance mask: white jersey = opaque, black background = transparent. */}
          <mask
            id={maskId}
            maskContentUnits="userSpaceOnUse"
            x="0"
            y="0"
            width={size.w}
            height={size.h}
          >
            <image
              href={templateUrl}
              x="0"
              y="0"
              width={size.w}
              height={size.h}
              preserveAspectRatio="xMidYMid meet"
              crossOrigin="anonymous"
            />
          </mask>
        </defs>

        {/* Everything here is clipped to the jersey silhouette, so the canvas
            background shows through untouched and is never tinted. */}
        <g mask={`url(#${maskId})`}>
          <image
            href={templateUrl}
            x="0"
            y="0"
            width={size.w}
            height={size.h}
            preserveAspectRatio="xMidYMid meet"
            crossOrigin="anonymous"
          />

          {/* Color overlay — multiply tints the jersey while preserving seams. */}
          <g style={{ mixBlendMode: 'multiply' }}>
            <rect x="0" y="0" width={size.w} height={size.h} fill={primary} />

            {regions.map((r) => (
              <path key={r.id} d={buildPath(geometry[r.id])} fill={r.fill} />
            ))}
          </g>
        </g>
      </svg>
    </div>
  );
}