import IdentityNameOverlay from '@/components/IdentityNameOverlay';
import StaticNameOverlay from '@/components/StaticNameOverlay';

// Renders a single color + name/number combo with the jersey overlay.
// Uses plain <img> (plainImage prop) for reliable html2canvas capture.
export default function ComboImageRenderer({
  imageUrl,
  customName,
  customNumber,
  nameStyle,
  numberStyle,
  customFontUrl,
  customFontName,
  staticDisplay,
  enableName = true,
  enableNumber = true,
}) {
  if (staticDisplay) {
    return (
      <StaticNameOverlay
        image={imageUrl}
        customName={enableName ? customName : ''}
        customNumber={enableNumber ? customNumber : ''}
        nameStyle={nameStyle}
        numberStyle={numberStyle}
        customFontUrl={customFontUrl}
        customFontName={customFontName}
        plainImage
        className="w-full h-full"
      />
    );
  }
  return (
    <IdentityNameOverlay
      back_image={imageUrl}
      customName={enableName ? customName : ''}
      customNumber={enableNumber ? customNumber : ''}
      nameStyle={nameStyle}
      numberStyle={numberStyle}
      customFontUrl={customFontUrl}
      customFontName={customFontName}
      plainImage
      className="w-full h-full"
    />
  );
}