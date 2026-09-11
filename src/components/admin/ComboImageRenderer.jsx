import IdentityNameOverlay from '@/components/IdentityNameOverlay';
import StaticNameOverlay from '@/components/StaticNameOverlay';
import ArtworkNameOverlay from '@/components/admin/ArtworkNameOverlay';

// Renders a single color + name/number combo with the jersey overlay.
// Uses plain <img> (plainImage prop) for reliable html2canvas capture.
// When isArtwork is true, uses ArtworkNameOverlay which applies positioning
// offsets so the designer values land correctly on the print-ready artwork.
export default function ComboImageRenderer({
  imageUrl,
  customName,
  customNumber,
  nameStyle,
  numberStyle,
  customFontUrl,
  customFontName,
  staticDisplay,
  isArtwork = false,
  aspectRatio = 1,
  enableName = true,
  enableNumber = true,
  artworkPosition,
}) {
  if (isArtwork) {
    return (
      <ArtworkNameOverlay
        artworkUrl={imageUrl}
        customName={customName}
        customNumber={customNumber}
        nameStyle={nameStyle}
        numberStyle={numberStyle}
        customFontUrl={customFontUrl}
        customFontName={customFontName}
        aspectRatio={aspectRatio}
        enableName={enableName}
        enableNumber={enableNumber}
        horizOffset={artworkPosition?.horiz_offset ?? 55}
        vertOffset={artworkPosition?.vert_offset ?? -5}
      />
    );
  }

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