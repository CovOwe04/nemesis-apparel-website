import { Image } from '@/components/ui/image';

// Renders a static promotional jersey image with the custom name overlaid on
// the left side (the back-view portion of the promo image). Used for jerseys
// that ship as a single promotional image rather than separate front/back
// photos. Uses a bold block font (Archivo Black) to match team-jersey lettering.
export default function StaticNameOverlay({
  image,
  customName,
  showPlaceholder = false,
  className = '',
}) {
  const displayName = (customName || '').toUpperCase() || (showPlaceholder ? 'YOUR NAME' : '');
  const len = displayName.length;
  const fontSizeCqw = len > 10 ? Math.max(3, 6 - (len - 10) * 0.25) : 6;

  return (
    <div
      className={`relative overflow-hidden bg-black ${className}`}
      style={{ containerType: 'inline-size' }}
    >
      <Image src={image} alt="jersey" fittingType="fit" className="w-full h-full" />
      {displayName && (
        <div
          className="absolute pointer-events-none"
          style={{
            left: '25%',
            top: '42%',
            transform: 'translate(-50%, -50%)',
          }}
        >
          <span
            style={{
              fontFamily: "'Archivo Black', sans-serif",
              fontSize: `${fontSizeCqw}cqw`,
              lineHeight: 1.1,
              color: '#FFFFFF',
              textShadow:
                '0.12em 0.12em 0 rgba(10,10,10,0.95), -0.06em -0.06em 0 rgba(10,10,10,0.95), 0.06em -0.06em 0 rgba(10,10,10,0.95), -0.06em 0.06em 0 rgba(10,10,10,0.95)',
              letterSpacing: '0.04em',
              whiteSpace: 'nowrap',
              textTransform: 'uppercase',
            }}
          >
            {displayName}
          </span>
        </div>
      )}
    </div>
  );
}