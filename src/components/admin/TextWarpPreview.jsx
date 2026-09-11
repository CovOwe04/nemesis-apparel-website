import { useState, useEffect } from 'react';
import ArtworkNameOverlay from '@/components/admin/ArtworkNameOverlay';

// Uses the SAME ArtworkNameOverlay as the Artwork Position Designer so the
// admin preview is WYSIWYG with the storefront.
export default function TextWarpPreview({
  imageUrl = '',
  nameStyle = {},
  numberStyle = {},
  customFontUrl = '',
  customFontName = '',
  enableName = true,
  enableNumber = true,
  staticDisplay = false,
  artworkPosition,
}) {
  const [aspectRatio, setAspectRatio] = useState(1);

  useEffect(() => {
    if (!imageUrl) return;
    const img = new Image();
    img.onload = () => setAspectRatio(img.naturalWidth / img.naturalHeight || 1);
    img.onerror = () => setAspectRatio(1);
    img.src = imageUrl;
  }, [imageUrl]);

  const aspectCls = staticDisplay ? 'aspect-square bg-black' : 'aspect-[3/4] bg-steel';

  return (
    <div className={`relative w-full overflow-hidden rounded-[6px] ${aspectCls}`}>
      <ArtworkNameOverlay
        artworkUrl={imageUrl}
        customName={enableName ? 'YOUR NAME' : ''}
        customNumber={enableNumber ? '00' : ''}
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
    </div>
  );
}