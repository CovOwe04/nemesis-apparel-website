export const PATTERNS = [
  { id: 'solid', label: 'SOLID' },
  { id: 'accent-sleeves', label: 'ACCENT SLEEVES' },
  { id: 'chest-band', label: 'CHEST BAND' },
  { id: 'shoulder-stripe', label: 'SHOULDER STRIPE' },
  { id: 'side-panels', label: 'SIDE PANELS' },
  { id: 'tri-tone', label: 'TRI-TONE' },
];

// Blank white jersey photo (front view, dark background) — the same kind of
// jersey imagery used in the Arsenal. It acts as a single luminance mask over
// the whole canvas, clipping every color layer to the jersey silhouette at
// once (so the mask stays aligned regardless of each layer's size).
const TEMPLATE_URL =
  'https://media.base44.com/images/public/6a95dbf0d98672e2f49452f4/c14bd3065_generated_image.png';

const maskStyle = {
  WebkitMaskImage: `url(${TEMPLATE_URL})`,
  maskImage: `url(${TEMPLATE_URL})`,
  WebkitMaskSize: 'contain',
  maskSize: 'contain',
  WebkitMaskRepeat: 'no-repeat',
  maskRepeat: 'no-repeat',
  WebkitMaskPosition: 'center',
  maskPosition: 'center',
  WebkitMaskMode: 'luminance',
  maskMode: 'luminance',
  isolation: 'isolate',
};

export default function JerseyTemplate({ primary, secondary, tertiary, pattern }) {
  const accentSleeves = pattern === 'accent-sleeves' || pattern === 'tri-tone';
  const chestBand = pattern === 'chest-band' || pattern === 'tri-tone';
  const shoulderStripe = pattern === 'shoulder-stripe';
  const sidePanels = pattern === 'side-panels';

  return (
    <div className="absolute inset-0" style={maskStyle}>
      {/* Base fill */}
      <div className="absolute inset-0" style={{ backgroundColor: primary }} />

      {/* Accent sleeves / shoulders */}
      {accentSleeves && (
        <div className="absolute inset-x-0 top-0 h-[26%]" style={{ backgroundColor: secondary }} />
      )}

      {/* Chest band */}
      {chestBand && (
        <div className="absolute inset-x-0 top-[42%] h-[9%]" style={{ backgroundColor: tertiary }} />
      )}

      {/* Shoulder stripes */}
      {shoulderStripe && (
        <>
          <div className="absolute left-0 top-0 w-[30%] h-[28%]" style={{ backgroundColor: tertiary }} />
          <div className="absolute right-0 top-0 w-[30%] h-[28%]" style={{ backgroundColor: tertiary }} />
        </>
      )}

      {/* Side panels */}
      {sidePanels && (
        <>
          <div className="absolute left-0 top-0 w-[13%] h-full" style={{ backgroundColor: tertiary }} />
          <div className="absolute right-0 top-0 w-[13%] h-full" style={{ backgroundColor: tertiary }} />
        </>
      )}

      {/* Fabric shading — restores folds/highlights over the solid fill */}
      <div
        className="absolute inset-0 opacity-40 mix-blend-multiply"
        style={{
          backgroundImage: `url(${TEMPLATE_URL})`,
          backgroundSize: 'contain',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      />
    </div>
  );
}