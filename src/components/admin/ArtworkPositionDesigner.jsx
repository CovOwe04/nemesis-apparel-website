import { useState, useEffect } from 'react';
import ArtworkNameOverlay from '@/components/admin/ArtworkNameOverlay';

const PIECES = [
  { key: 'artwork_front', label: 'FRONT' },
  { key: 'artwork_back', label: 'BACK' },
  { key: 'artwork_sleeve', label: 'SLEEVE' },
  { key: 'artwork_hood', label: 'HOOD' },
];

export default function ArtworkPositionDesigner({
  colors,
  nameStyle,
  numberStyle,
  customFontUrl,
  customFontName,
  enableName,
  enableNumber,
  artworkPosition,
  onChange,
}) {
  const availablePieces = PIECES.filter((p) => colors.some((c) => c[p.key]));
  const [selectedPiece, setSelectedPiece] = useState(availablePieces[0]?.key || 'artwork_front');
  const [aspectRatio, setAspectRatio] = useState(1);

  const artworkUrl = colors.find((c) => c[selectedPiece])?.[selectedPiece] || '';

  useEffect(() => {
    if (!artworkUrl) return;
    const img = new Image();
    img.onload = () => setAspectRatio(img.naturalWidth / img.naturalHeight || 1);
    img.onerror = () => setAspectRatio(1);
    img.src = artworkUrl;
  }, [artworkUrl]);

  const horizOffset = artworkPosition?.horiz_offset ?? 55;
  const vertOffset = artworkPosition?.vert_offset ?? -5;

  if (availablePieces.length === 0) {
    return <p className="mono-label text-fog/30 py-8 text-center">Upload artwork in the Colors section first.</p>;
  }

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <div className="space-y-2">
        <div className="flex gap-2">
          {availablePieces.map((p) => (
            <button key={p.key} type="button" onClick={() => setSelectedPiece(p.key)}
              className={`mono-label px-3 py-1.5 border rounded-[4px] text-[0.65rem] transition-colors ${selectedPiece === p.key ? 'bg-kinetic text-void border-kinetic' : 'border-steel text-fog/60 hover:text-fog'}`}>
              {p.label}
            </button>
          ))}
        </div>
        {artworkUrl ? (
          <div className="relative w-full bg-card rounded-[4px] overflow-hidden" style={{ aspectRatio }}>
            <ArtworkNameOverlay
              artworkUrl={artworkUrl}
              customName="SAMPLE"
              customNumber="00"
              nameStyle={nameStyle}
              numberStyle={numberStyle}
              customFontUrl={customFontUrl}
              customFontName={customFontName}
              aspectRatio={aspectRatio}
              enableName={enableName}
              enableNumber={enableNumber}
              horizOffset={horizOffset}
              vertOffset={vertOffset}
            />
          </div>
        ) : (
          <p className="mono-label text-fog/30 py-8 text-center">No artwork for this piece.</p>
        )}
      </div>
      <div className="space-y-3">
        <p className="mono-label text-fog/50 text-[0.65rem] leading-relaxed normal-case tracking-normal">
          Position controls move both name and number together. Font, size, arch, rise, and flag use the Identity Lab designer values.
        </p>
        <div className="flex items-center gap-2">
          <span className="mono-label text-fog/50 w-20 shrink-0 text-[0.65rem]">HORIZ POS</span>
          <input type="range" min={-50} max={100} value={horizOffset}
            onChange={(e) => onChange({ ...artworkPosition, horiz_offset: Number(e.target.value) })}
            className="flex-1 min-w-0" />
          <input type="number" min={-50} max={100} value={horizOffset}
            onChange={(e) => onChange({ ...artworkPosition, horiz_offset: Number(e.target.value) })}
            className="w-12 bg-white text-black border border-steel rounded-[4px] px-1.5 py-1 text-xs text-center no-spinner focus:border-kinetic outline-none" />
        </div>
        <div className="flex items-center gap-2">
          <span className="mono-label text-fog/50 w-20 shrink-0 text-[0.65rem]">VERT POS</span>
          <input type="range" min={-100} max={100} value={vertOffset}
            onChange={(e) => onChange({ ...artworkPosition, vert_offset: Number(e.target.value) })}
            className="flex-1 min-w-0" />
          <input type="number" min={-100} max={100} value={vertOffset}
            onChange={(e) => onChange({ ...artworkPosition, vert_offset: Number(e.target.value) })}
            className="w-12 bg-white text-black border border-steel rounded-[4px] px-1.5 py-1 text-xs text-center no-spinner focus:border-kinetic outline-none" />
        </div>
      </div>
    </div>
  );
}