import { useState, useEffect } from 'react';
import ArtworkNameOverlay from '@/components/admin/ArtworkNameOverlay';

// Renders a single color + name/number combo using the SAME ArtworkNameOverlay
// the admin sees in the Artwork Position Designer — so storefront, approval,
// and admin previews are all WYSIWYG consistent.
export default function ComboImageRenderer({
  imageUrl,
  customName,
  customNumber,
  nameStyle,
  numberStyle,
  customFontUrl,
  customFontName,
  staticDisplay = false,
  isArtwork = false,
  aspectRatio: propAspectRatio = 1,
  enableName = true,
  enableNumber = true,
  artworkPosition,
}) {
  const [aspectRatio, setAspectRatio] = useState(propAspectRatio);

  useEffect(() => {
    if (isArtwork) {
      setAspectRatio(propAspectRatio);
      return;
    }
    if (!imageUrl) return;
    const img = new Image();
    img.onload = () => setAspectRatio(img.naturalWidth / img.naturalHeight || 1);
    img.onerror = () => setAspectRatio(1);
    img.src = imageUrl;
  }, [imageUrl, isArtwork, propAspectRatio]);

  return (
    <ArtworkNameOverlay
      artworkUrl={imageUrl}
      customName={enableName ? customName : ''}
      customNumber={enableNumber ? customNumber : ''}
      nameStyle={nameStyle}
      numberStyle={numberStyle}
      customFontUrl={customFontUrl}
      customFontName={customFontName}
      aspectRatio={aspectRatio}
      enableName={enableName}
      enableNumber={enableNumber}
      horizOffset={artworkPosition?.horiz_offset ?? 55}
      vertOffset={artworkPosition?.vert_offset ?? -5}
      staticDisplay={staticDisplay}
    />
  );
}