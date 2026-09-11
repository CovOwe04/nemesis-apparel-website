import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, Upload } from 'lucide-react';
import html2canvas from 'html2canvas';
import ArtworkNameOverlay from '@/components/admin/ArtworkNameOverlay';

const PIECES = [
  { key: 'artwork_front', label: 'FRONT' },
  { key: 'artwork_back', label: 'BACK' },
  { key: 'artwork_sleeve', label: 'SLEEVE' },
  { key: 'artwork_hood', label: 'HOOD' },
];

const PREVIEW_NAME = 'YOUR NAME';
const PREVIEW_NUMBER = '00';

export default function ArtworkPositionDesigner({
  colors,
  combos = [],
  nameStyle,
  numberStyle,
  customFontUrl,
  customFontName,
  enableName,
  enableNumber,
  artworkPosition,
  onChange,
  jerseyId,
  staticDisplay = false,
}) {
  const availablePieces = PIECES.filter((p) => colors.some((c) => c[p.key]));
  const [selectedPiece, setSelectedPiece] = useState(availablePieces[0]?.key || 'artwork_front');
  const [aspectRatio, setAspectRatio] = useState(1);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [uploadError, setUploadError] = useState('');
  const renderRef = useRef(null);
  const [currentRender, setCurrentRender] = useState(null);

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

  const uploadToMerchize = async () => {
    if (!jerseyId) {
      setUploadError('Save the jersey first.');
      return;
    }
    setUploading(true);
    setUploadError('');
    setUploadStatus('');

    try {
      const pieceKey = selectedPiece.replace('artwork_', '');
      const colorsWithArtwork = colors.filter((c) => c[selectedPiece]);

      // Build render targets: one per color+combo (or just color if no combos)
      const renderTargets = [];
      for (const color of colorsWithArtwork) {
        const validCombos = (combos || []).filter((c) => c.name || c.number);
        if (validCombos.length > 0) {
          for (const combo of validCombos) {
            renderTargets.push({ color, comboName: combo.name || '', comboNumber: combo.number || '' });
          }
        } else {
          renderTargets.push({ color, comboName: '', comboNumber: '' });
        }
      }

      for (let i = 0; i < renderTargets.length; i++) {
        const { color, comboName, comboNumber } = renderTargets[i];
        const url = color[selectedPiece];
        const label = [color.name || 'Default', comboName, comboNumber].filter(Boolean).join(' · ');
        setUploadStatus(`Rendering ${label} (${i + 1}/${renderTargets.length})…`);

        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = url;
        await new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve;
          setTimeout(resolve, 5000);
        });
        const naturalW = img.naturalWidth || 1200;
        const naturalH = img.naturalHeight || 1200;
        const maxDim = 1200;
        const sz = Math.min(1, maxDim / Math.max(naturalW, naturalH));
        const renderW = Math.round(naturalW * sz);
        const renderH = Math.round(naturalH * sz);

        const renderName = comboName || PREVIEW_NAME;
        const renderNumber = comboNumber || PREVIEW_NUMBER;
        setCurrentRender({ url, renderW, renderH, aspectRatio: naturalW / naturalH, customName: renderName, customNumber: renderNumber });
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        await new Promise((resolve) => setTimeout(resolve, 300));

        let renderedUrl = '';
        if (renderRef.current) {
          try {
            const canvas = await html2canvas(renderRef.current, {
              useCORS: true,
              backgroundColor: null,
              scale: 2,
            });
            const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
            if (blob) {
              const file = new File([blob], `artwork-${pieceKey}-${color.name || 'default'}-${comboName || 'base'}-${comboNumber || ''}.png`, { type: 'image/png' });
              const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });
              renderedUrl = file_url;
            }
          } catch (err) {
            console.error('Render capture failed:', err);
          }
        }

        if (renderedUrl) {
          setUploadStatus(`Uploading ${label} to Merchize…`);
          const res = await base44.functions.invoke('upload-merchize-artwork', {
            jerseyId,
            color_name: color.name || 'Default',
            combo_name: comboName,
            combo_number: comboNumber,
            artwork: { [pieceKey]: renderedUrl },
          });
          if (res.data?.error) {
            setUploadError(`${label}: ${res.data.error}`);
          }
        }
      }

      setCurrentRender(null);
      setUploadStatus('Upload complete!');
    } catch (err) {
      setUploadError(err?.message || 'Upload failed');
    } finally {
      setUploading(false);
      setCurrentRender(null);
    }
  };

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
              customName={PREVIEW_NAME}
              customNumber={PREVIEW_NUMBER}
              nameStyle={nameStyle}
              numberStyle={numberStyle}
              customFontUrl={customFontUrl}
              customFontName={customFontName}
              aspectRatio={aspectRatio}
              enableName={enableName}
              enableNumber={enableNumber}
              horizOffset={horizOffset}
              vertOffset={vertOffset}
              staticDisplay={staticDisplay}
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
          <input type="range" min={-50} max={100} step={0.1} value={horizOffset}
            onChange={(e) => onChange({ ...artworkPosition, horiz_offset: Number(e.target.value) })}
            className="flex-1 min-w-0" />
          <input type="number" min={-50} max={100} step={0.1} value={horizOffset}
            onChange={(e) => onChange({ ...artworkPosition, horiz_offset: Number(e.target.value) })}
            className="w-12 bg-white text-black border border-steel rounded-[4px] px-1.5 py-1 text-xs text-center no-spinner focus:border-kinetic outline-none" />
        </div>
        <div className="flex items-center gap-2">
          <span className="mono-label text-fog/50 w-20 shrink-0 text-[0.65rem]">VERT POS</span>
          <input type="range" min={-100} max={100} step={0.1} value={vertOffset}
            onChange={(e) => onChange({ ...artworkPosition, vert_offset: Number(e.target.value) })}
            className="flex-1 min-w-0" />
          <input type="number" min={-100} max={100} step={0.1} value={vertOffset}
            onChange={(e) => onChange({ ...artworkPosition, vert_offset: Number(e.target.value) })}
            className="w-12 bg-white text-black border border-steel rounded-[4px] px-1.5 py-1 text-xs text-center no-spinner focus:border-kinetic outline-none" />
        </div>

        <button type="button" onClick={uploadToMerchize} disabled={uploading || !jerseyId}
          className="inline-flex items-center gap-1.5 bg-kinetic px-4 py-2 font-heading uppercase text-void text-xs hover:bg-fog transition-colors rounded-[4px] disabled:opacity-60">
          {uploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
          {uploading ? 'Uploading…' : 'Upload to Merchize'}
        </button>
        {uploadStatus && <p className="mono-label text-fog/50 text-[0.65rem]">{uploadStatus}</p>}
        {uploadError && <p className="mono-label text-kinetic text-[0.65rem]">{uploadError}</p>}
        {!jerseyId && <p className="mono-label text-fog/30 text-[0.65rem]">Save the jersey first to enable upload.</p>}
      </div>

      {currentRender && (
        <div ref={renderRef} style={{
          position: 'fixed',
          left: '-9999px',
          top: 0,
          width: `${currentRender.renderW}px`,
          height: `${currentRender.renderH}px`,
          pointerEvents: 'none',
        }}>
          <ArtworkNameOverlay
            artworkUrl={currentRender.url}
            customName={enableName ? (currentRender.customName || PREVIEW_NAME) : ''}
            customNumber={enableNumber ? (currentRender.customNumber || PREVIEW_NUMBER) : ''}
            nameStyle={nameStyle}
            numberStyle={numberStyle}
            customFontUrl={customFontUrl}
            customFontName={customFontName}
            aspectRatio={currentRender.aspectRatio}
            enableName={enableName}
            enableNumber={enableNumber}
            horizOffset={horizOffset}
            vertOffset={vertOffset}
            staticDisplay={staticDisplay}
          />
        </div>
      )}
    </div>
  );
}