import { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Upload, Loader2, X, ChevronDown, ChevronRight } from 'lucide-react';
import ArtworkNameOverlay from '@/components/admin/ArtworkNameOverlay';
import { resolveArtworkNameStyle, resolveArtworkNumberStyle } from '@/lib/jerseyStyle';

function HorizontalSlider({ label, value, min, max, step = 0.1, onChange }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="mono-label text-fog/50 text-[0.55rem]">{label}</span>
        <input type="number" min={min} max={max} step={step} value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-14 bg-white text-black border border-steel rounded-[4px] px-1.5 py-0.5 text-xs text-center focus:border-kinetic outline-none" />
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full" />
    </div>
  );
}

function ColorSwatch({ label, color, onChange }) {
  return (
    <div className="flex items-center gap-1.5">
      <input type="color" value={color} onChange={(e) => onChange(e.target.value)}
        className="w-7 h-7 bg-white border border-steel rounded-[2px] cursor-pointer" />
      <span className="mono-label text-fog/50 text-[0.5rem]">{label}</span>
    </div>
  );
}

export default function ColorArtworkDesigner({ color, colorIndex, form, updateColor, setField, combos, staticDisplay }) {
  const [expanded, setExpanded] = useState(true);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const artworkUrl = color.artwork_front || '';
  const nameStyle = resolveArtworkNameStyle(form, color);
  const numberStyle = resolveArtworkNumberStyle(form, color);

  const handleUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      updateColor(colorIndex, { artwork_front: file_url });
    } catch (err) {
      alert('Upload failed: ' + (err?.message || 'unknown error'));
    } finally {
      setUploading(false);
    }
  };

  const setColorStyle = (styleType, field, value) => {
    const current = color[styleType] || {};
    updateColor(colorIndex, { [styleType]: { ...current, [field]: value } });
  };
  const setArtworkVertPos = (key, value) => updateColor(colorIndex, { [key]: value });

  const validCombos = (combos || []).filter((c) => c.name || c.number);
  const previewName = validCombos[0]?.name || 'YOUR NAME';
  const previewNumber = validCombos[0]?.number || '00';

  return (
    <div className="border border-steel rounded-[4px]">
      <button type="button" onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-2.5 text-left">
        <span className="flex items-center gap-2">
          {expanded ? <ChevronDown size={12} className="text-fog/50" /> : <ChevronRight size={12} className="text-fog/50" />}
          <span className="w-3 h-3 rounded-full border border-steel" style={{ backgroundColor: color.hex || '#000' }} />
          <span className="mono-label text-fog/60 text-[0.65rem]">{(color.name || 'DEFAULT').toUpperCase()} ARTWORK</span>
        </span>
      </button>
      {expanded && (
        <div className="px-3 pb-3 space-y-3 border-t border-steel pt-3">
          {/* Front artwork upload (drag & drop) or preview */}
          {artworkUrl ? (
            <div className="relative group">
              <div className="h-52 bg-void border border-steel rounded-[4px] overflow-hidden">
                <ArtworkNameOverlay
                  artworkUrl={artworkUrl}
                  customName={form.enable_name ? previewName : ''}
                  customNumber={form.enable_number ? previewNumber : ''}
                  nameStyle={nameStyle}
                  numberStyle={numberStyle}
                  customFontUrl={form.custom_font_url || ''}
                  customFontName={form.custom_font_name || ''}
                  fontId={form.font_id || 'block'}
                  aspectRatio={1}
                  enableName={form.enable_name}
                  enableNumber={form.enable_number}
                  staticDisplay={staticDisplay}
                />
              </div>
              <button type="button" onClick={() => updateColor(colorIndex, { artwork_front: '' })}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-kinetic text-void rounded-full flex items-center justify-center hover:bg-fog transition-colors">
                <X size={12} />
              </button>
            </div>
          ) : (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => { e.preventDefault(); setDragging(false); handleUpload(e.dataTransfer.files?.[0]); }}
              onClick={() => fileRef.current?.click()}
              className={`h-52 border border-dashed rounded-[4px] flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors ${dragging ? 'border-kinetic text-kinetic bg-kinetic/5' : 'border-steel text-fog/30 hover:border-kinetic hover:text-fog/60'}`}>
              {uploading ? <Loader2 size={24} className="animate-spin" /> : <Upload size={24} />}
              <span className="mono-label text-[0.55rem]">{uploading ? 'UPLOADING…' : 'DROP FRONT ARTWORK OR CLICK'}</span>
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/svg+xml" className="hidden"
                onChange={(e) => { handleUpload(e.target.files?.[0]); e.target.value = ''; }} />
            </div>
          )}

          {/* Combined controls: Name, Number */}
          <div className="space-y-3 border border-steel rounded-[4px] p-2.5">
            {/* Name controls */}
            {form.enable_name && (
              <div className="space-y-2 border-b border-steel pb-2.5">
                <div className="mono-label text-kinetic text-[0.55rem]">NAME</div>
                <HorizontalSlider label="VERT POS" value={nameStyle.vert_pos} min={0} max={100} onChange={(v) => setArtworkVertPos('artwork_name_vert_pos', v)} />
                <div className="flex items-center gap-3">
                  <ColorSwatch label="FILL" color={nameStyle.color} onChange={(v) => setColorStyle('name_style', 'color', v)} />
                  <ColorSwatch label="STROKE" color={nameStyle.outline_color} onChange={(v) => setColorStyle('name_style', 'outline_color', v)} />
                </div>
                <HorizontalSlider label="THICKNESS" value={nameStyle.outline_thickness} min={0} max={5} step={0.1} onChange={(v) => setColorStyle('name_style', 'outline_thickness', v)} />
              </div>
            )}

            {/* Number controls */}
            {form.enable_number && (
              <div className="space-y-2">
                <div className="mono-label text-kinetic text-[0.55rem]">NUMBER</div>
                <HorizontalSlider label="VERT POS" value={numberStyle.vert_pos} min={0} max={100} onChange={(v) => setArtworkVertPos('artwork_number_vert_pos', v)} />
                <div className="flex items-center gap-3">
                  <ColorSwatch label="FILL" color={numberStyle.color} onChange={(v) => setColorStyle('number_style', 'color', v)} />
                  <ColorSwatch label="STROKE" color={numberStyle.outline_color} onChange={(v) => setColorStyle('number_style', 'outline_color', v)} />
                </div>
                <HorizontalSlider label="THICKNESS" value={numberStyle.outline_thickness} min={0} max={5} step={0.1} onChange={(v) => setColorStyle('number_style', 'outline_thickness', v)} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
