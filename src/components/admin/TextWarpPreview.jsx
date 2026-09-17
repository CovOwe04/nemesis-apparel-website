import IdentityNameOverlay from '@/components/IdentityNameOverlay';
import StaticNameOverlay from '@/components/StaticNameOverlay';

// Thin wrapper that renders the SAME overlay the user sees on the Arsenal /
// Identity Lab pages, so the admin preview is WYSIWYG — position, size, and
// style changes in the designer translate proportionally to the storefront.
export default function TextWarpPreview({
  imageUrl = '',
  nameStyle = {},
  numberStyle = {},
  customFontUrl = '',
  customFontName = '',
  fontId = 'block',
  enableName = true,
  enableNumber = true,
  staticDisplay = false,
}) {
  const aspectCls = staticDisplay ? 'aspect-square bg-black' : 'aspect-[3/4] bg-steel';

  if (staticDisplay) {
    return (
      <StaticNameOverlay
        image={imageUrl}
        customName={enableName ? 'YOUR NAME' : ''}
        customNumber={enableNumber ? '00' : ''}
        nameStyle={nameStyle}
        numberStyle={numberStyle}
        customFontUrl={customFontUrl}
        customFontName={customFontName}
        showNamePlaceholder={false}
        showNumberPlaceholder={false}
        className={`w-full overflow-hidden rounded-[6px] ${aspectCls}`}
      />
    );
  }
  return (
    <IdentityNameOverlay
      back_image={imageUrl}
      customName={enableName ? 'YOUR NAME' : ''}
      customNumber={enableNumber ? '00' : ''}
      fontId={fontId}
      nameStyle={nameStyle}
      numberStyle={numberStyle}
      customFontUrl={customFontUrl}
      customFontName={customFontName}
      showNamePlaceholder={false}
      showNumberPlaceholder={false}
      className={`w-full overflow-hidden rounded-[6px] ${aspectCls}`}
    />
  );
}