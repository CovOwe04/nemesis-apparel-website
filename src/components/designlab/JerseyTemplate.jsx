export const PATTERNS = [
  { id: 'solid', label: 'SOLID' },
  { id: 'accent-sleeves', label: 'ACCENT SLEEVES' },
  { id: 'chest-band', label: 'CHEST BAND' },
  { id: 'shoulder-stripe', label: 'SHOULDER STRIPE' },
  { id: 'side-panels', label: 'SIDE PANELS' },
  { id: 'tri-tone', label: 'TRI-TONE' },
];

// Blank white jersey photo (front view, dark background) — the same kind of
// jersey imagery used in the Arsenal. Used both as the visible fabric shading
// and as a luminance mask that clips every color layer to the jersey
// silhouette, so fills work for any color (including black).
const TEMPLATE_URL =
  'https://media.base44.com/images/public/6a95dbf0d98672e2f49452f4/0afbde217_generated_image.png';

const maskStyle = {
  WebkitMaskImage: `url(${TEMPLATE_URL})`,
  maskImage: `url(${TEMPLATE_URL})`,
  WebkitMaskSize: 'cover',
  maskSize: 'cover',
  WebkitMaskRepeat: 'no-repeat',
  maskRepeat: 'no-repeat',
  WebkitMaskPosition: 'center',
  maskPosition: 'center',
  WebkitMaskMode: 'luminance',
  maskMode: 'luminance',
};

function Layer({ className, style }) {
  return <div className={`absolute ${className}`} style={{ ...maskStyle, ...style }} />;
}

export default function JerseyTemplate({ primary, secondary, tertiary, pattern }) {
  const accentSleeves = pattern === 'accent-sleeves' || pattern === 'tri-tone';
  const chestBand = pattern === 'chest-band' || pattern === 'tri-tone';
  const shoulderStripe = pattern === 'shoulder-stripe';
  const sidePanels = pattern === 'side-panels';

  return (
    <div className="absolute inset-0">
      {/* Base fill */}
      <Layer className="inset-0" style={{ backgroundColor: primary }} />

      {/* Accent sleeves / shoulders */}
      {accentSleeves && (
        <Layer className="inset-x-0 top-0 h-[26%]" style={{ backgroundColor: secondary }} />
      )}

      {/* Chest band */}
      {chestBand && (
        <Layer className="inset-x-0 top-[42%] h-[9%]" style={{ backgroundColor: tertiary }} />
      )}

      {/* Shoulder stripes */}
      {shoulderStripe && (
        <>
          <Layer className="left-0 top-0 w-[30%] h-[28%]" style={{ backgroundColor: tertiary }} />
          <Layer className="right-0 top-0 w-[30%] h-[28%]" style={{ backgroundColor: tertiary }} />
        </>
      )}

      {/* Side panels */}
      {sidePanels && (
        <>
          <Layer className="left-0 top-0 w-[13%] h-full" style={{ backgroundColor: tertiary }} />
          <Layer className="right-0 top-0 w-[13%] h-full" style={{ backgroundColor: tertiary }} />
        </>
      )}

      {/* Fabric shading — restores folds/highlights over the solid fill */}
      <div
        className="absolute inset-0 opacity-40 mix-blend-multiply"
        style={{
          backgroundImage: `url(${TEMPLATE_URL})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          ...maskStyle,
        }}
      />
    </div>
  );
}