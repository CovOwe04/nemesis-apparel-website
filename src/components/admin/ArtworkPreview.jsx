import { useState, useEffect } from 'react';
import ArtworkNameOverlay from '@/components/admin/ArtworkNameOverlay';

// Thin wrapper around ArtworkNameOverlay that auto-calculates the
// artwork's aspect ratio, so text positioning matches the admin's
// Artwork Position Designer exactly. Used by the Identity Lab,
// Arsenal, and order approval modal for visual consistency.
export default function ArtworkPreview({
  artworkUrl,
  customName = '',
  customNumber = '',
  fontId = 'block',
  nameStyle = {},
  numberStyle = {},
  customFontUrl = '',
  customFontName = '',
  letterSpacing = 0,
  enableName = true,
  enableNumber = true,
  horizOffset = 55,
  vertOffset = -5,
  staticDisplay = false,
}) {
  const [aspectRatio, setAspectRatio] = useState(1);

  useEffect(() => {
    if (!artworkUrl) { setAspectRatio(1); return; }
    const img = new window.Image();
    img.onload = () => setAspectRatio(img.naturalWidth / img.naturalHeight || 1);
    img.onerror = () => setAspectRatio(1);
    img.src = artworkUrl;
  }, [artworkUrl]);

  if (!artworkUrl) return null;

  return (
    <ArtworkNameOverlay
      artworkUrl={artworkUrl}
      customName={customName}
      customNumber={customNumber}
      fontId={fontId}
      nameStyle={nameStyle}
      numberStyle={numberStyle}
      customFontUrl={customFontUrl}
      customFontName={customFontName}
      letterSpacing={letterSpacing}
      aspectRatio={aspectRatio}
      enableName={enableName}
      enableNumber={enableNumber}
      horizOffset={horizOffset}
      vertOffset={vertOffset}
      staticDisplay={staticDisplay}
    />
  );
}