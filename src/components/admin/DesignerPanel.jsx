import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, Upload } from 'lucide-react';
import TextWarpPreview from '@/components/admin/TextWarpPreview';
import FontUploader from '@/components/admin/FontUploader';
import ColorArtworkDesigner from '@/components/admin/ColorArtworkDesigner';
import { renderOverlayToBlob } from '@/components/admin/canvasOverlayRenderer';
import { resolveNameStyle, resolveNumberStyle, LOCKED_HORIZ_OFFSET } from '@/lib/jerseyStyle';
import { FONTS } from '@/lib/fonts';

function HorizontalSlider({ label, value, min, max, step = 0.1, onChange }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="mono-label text-fog/50 text-[0.55rem]">{label}</span>
        <input type="number" min={min} max={max} step={step} value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-16 bg-white text-black border border-steel rounded-[4px] px-1.5 py-0.5 text-xs text-center focus:border-kinetic outline-none" />
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full" />
    </div>
  );
}

export default function DesignerPanel({
  form, setField, setStyle, currentStyle, designerTab, setDesignerTab, staticDisplay, jerseyId,
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [uploadError, setUploadError] = useState('');

  const previewImageUrl = form.colors.find((c) => c.images?.length > 0)?.images?.[0]?.url;

  const updateColor = (index, updates) => {
    setField('colors', form.colors.map((c, i) => (i === index ? { ...c, ...updates } : c)));
  };

  const uploadToMerchize = async () => {
    if (!jerseyId) { setUploadError('Save the jersey first.'); return; }
    setUploading(true);
    setUploadError('');
    setUploadStatus('');
    try {
      const colorsWithArtwork = form.colors.filter((c) => c.artwork_front);
      const validCombos = (form.name_number_combos || []).filter((c) => c.name || c.number);
      const renderTargets = [];
      for (const color of colorsWithArtwork) {
        if (validCombos.length > 0) {
          for (const combo of validCombos) {
            renderTargets.push({ color, comboName: combo.name || '', comboNumber: combo.number || '' });
          }
        } else {
          renderTargets.push({ color, comboName: '', comboNumber: '' });
        }
      }

      const fontFam = form.custom_font_name
        ? `'${form.custom_font_name}', 'Archivo Black', sans-serif`
        : (FONTS.find((f) => f.id === form.font_id) || FONTS[0]).family;
      const vertOffset = form.artwork_position?.vert_offset ?? -5;

      for (let i = 0; i < renderTargets.length; i++) {
        const { color, comboName, comboNumber } = renderTargets[i];
        const url = color.artwork_front;
        const label = [color.name || 'Default', comboName, comboNumber].filter(Boolean).join(' · ');
        setUploadStatus(`Rendering ${label} (${i + 1}/${renderTargets.length})…`);

        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = url;
        await new Promise((resolve) => { img.onload = resolve; img.onerror = resolve; setTimeout(resolve, 5000); });
        const naturalW = img.naturalWidth || 1200;
        const naturalH = img.naturalHeight || 1200;
        const maxDim = 1200;
        const sz = Math.min(1, maxDim / Math.max(naturalW, naturalH));
        const renderW = Math.round(naturalW * sz);
        const renderH = Math.round(naturalH * sz);

        const nameStyle = resolveNameStyle(form, color);
        const numberStyle = resolveNumberStyle(form, color);
        const renderName = comboName || 'YOUR NAME';
        const renderNumber = comboNumber || '00';

        let renderedUrl = '';
        try {
          const blob = await renderOverlayToBlob({
            imageUrl: url, imageFit: 'contain',
            customName: renderName, customNumber: renderNumber,
            nameStyle, numberStyle, fontFam,
            customFontUrl: form.custom_font_url, customFontName: form.custom_font_name,
            enableName: form.enable_name, enableNumber: form.enable_number,
            staticDisplay, isArtwork: true,
            artworkPosition: { horiz_offset: LOCKED_HORIZ_OFFSET, vert_offset: vertOffset },
            aspectRatio: naturalW / naturalH, renderW, renderH,
          });
          if (blob) {
            const file = new File([blob], `artwork-front-${color.name || 'default'}-${comboName || 'base'}-${comboNumber || ''}.png`, { type: 'image/png' });
            const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });
            renderedUrl = file_url;
          }
        } catch (err) { console.error('Render failed:', err); }

        if (renderedUrl) {
          setUploadStatus(`Uploading ${label} to Merchize…`);
          const passcode = sessionStorage.getItem('nemesis-admin-passcode') || '';
          const res = await base44.functions.invoke('upload-merchize-artwork', {
            jerseyId, color_name: color.name || 'Default',
            combo_name: comboName, combo_number: comboNumber,
            artwork: { front: renderedUrl }, passcode,
          });
          if (res.data?.error) setUploadError(`${label}: ${res.data.error}`);
        }
      }
      setUploadStatus('Upload complete!');
    } catch (err) {
      setUploadError(err?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="border border-steel rounded-[6px] overflow-hidden">
      <div className="mono-label text-kinetic px-5 py-3 border-b border-steel">DESIGNER</div>

      {/* Tabs */}
      <div className="px-4 pt-4 flex gap-2 flex-wrap">
        {form.enable_name && (
          <button type="button" onClick={() => setDesignerTab('name')}
            className={`mono-label px-3 py-1.5 border rounded-[4px] text-[0.65rem] transition-colors ${designerTab === 'name' ? 'bg-kinetic text-void border-kinetic' : 'border-steel text-fog/60 hover:text-fog'}`}>
            NAME
          </button>
        )}
        {form.enable_number && (
          <button type="button" onClick={() => setDesignerTab('number')}
            className={`mono-label px-3 py-1.5 border rounded-[4px] text-[0.65rem] transition-colors ${designerTab === 'number' ? 'bg-kinetic text-void border-kinetic' : 'border-steel text-fog/60 hover:text-fog'}`}>
            NUMBER
          </button>
        )}
        <button type="button" onClick={() => setDesignerTab('artwork')}
          className={`mono-label px-3 py-1.5 border rounded-[4px] text-[0.65rem] transition-colors ${designerTab === 'artwork' ? 'bg-kinetic text-void border-kinetic' : 'border-steel text-fog/60 hover:text-fog'}`}>
          ARTWORK
        </button>
      </div>

      {designerTab === 'artwork' ? (
        <div className="p-4 space-y-4">
          {/* Per-color artwork sections */}
          {form.colors.length === 0 ? (
            <p className="mono-label text-fog/30 py-4 text-center">Add colors first to edit artwork.</p>
          ) : (
            form.colors.map((color, ci) => (
              <ColorArtworkDesigner key={ci} color={color} colorIndex={ci} form={form} updateColor={updateColor} setField={setField} combos={form.name_number_combos} staticDisplay={staticDisplay} />
            ))
          )}

          {/* Upload to Merchize */}
          <div className="pt-2 border-t border-steel">
            <button type="button" onClick={uploadToMerchize} disabled={uploading || !jerseyId}
              className="inline-flex items-center gap-1.5 bg-kinetic px-4 py-2 font-heading uppercase text-void text-xs hover:bg-fog transition-colors rounded-[4px] disabled:opacity-60">
              {uploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
              {uploading ? 'Uploading…' : 'Upload All to Merchize'}
            </button>
            {uploadStatus && <p className="mono-label text-fog/50 text-[0.65rem] mt-2">{uploadStatus}</p>}
            {uploadError && <p className="mono-label text-kinetic text-[0.65rem] mt-2">{uploadError}</p>}
            {!jerseyId && <p className="mono-label text-fog/30 text-[0.65rem] mt-2">Save the jersey first to enable upload.</p>}
          </div>
        </div>
      ) : (
        <div className="grid lg:grid-cols-2">
          {/* Preview */}
          <div className="bg-void p-4 border-b lg:border-b-0 lg:border-r border-steel">
            <TextWarpPreview
              imageUrl={previewImageUrl}
              nameStyle={form.name_style}
              numberStyle={form.number_style}
              customFontUrl={form.custom_font_url}
              customFontName={form.custom_font_name}
              fontId={form.font_id}
              enableName={form.enable_name}
              enableNumber={form.enable_number}
              staticDisplay={staticDisplay}
            />
          </div>

          {/* Controls */}
          <div className="p-4 space-y-4">
            {/* Font selector */}
            <FontUploader
              fontUrl={form.custom_font_url}
              fontName={form.custom_font_name}
              onChange={({ url, name }) => { setField('custom_font_url', url); setField('custom_font_name', name); }}
            />
            {!form.custom_font_url && (
              <div>
                <span className="mono-label text-fog/50 text-[0.65rem] block mb-1.5">DEFAULT FONT</span>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto scrollbar-hide">
                  {FONTS.map((f) => (
                    <button key={f.id} type="button" onClick={() => setField('font_id', f.id)}
                      className={`px-2.5 py-1 border rounded-[4px] text-[0.65rem] transition-colors ${form.font_id === f.id ? 'border-kinetic bg-kinetic/10 text-fog' : 'border-steel text-fog/60 hover:text-fog'}`}
                      style={{ fontFamily: f.family }}>
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Warp sliders (horizontal) */}
            {form.enable_name || form.enable_number ? (
              <div className="border border-steel rounded-[4px] p-3 space-y-3">
                <div className="mono-label text-kinetic text-[0.6rem]">WARP</div>
                <HorizontalSlider label="SIZE" value={currentStyle.font_size} min={10} max={100} onChange={(v) => setStyle('font_size', v)} />
                <HorizontalSlider label="VERT POS" value={currentStyle.vert_pos ?? (designerTab === 'name' ? 40 : 50)} min={0} max={100} onChange={(v) => setStyle('vert_pos', v)} />
                <HorizontalSlider label="ARCH" value={currentStyle.arch} min={-50} max={50} onChange={(v) => setStyle('arch', v)} />
                <HorizontalSlider label="RISE" value={currentStyle.rise} min={-45} max={45} onChange={(v) => setStyle('rise', v)} />
                <HorizontalSlider label="FLAG" value={currentStyle.flag} min={-50} max={50} onChange={(v) => setStyle('flag', v)} />
              </div>
            ) : (
              <p className="mono-label text-fog/30 py-4">Enable Name or Number to access designer controls.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}