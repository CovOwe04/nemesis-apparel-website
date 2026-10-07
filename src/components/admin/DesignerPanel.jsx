import TextWarpPreview from '@/components/admin/TextWarpPreview';
import FontUploader from '@/components/admin/FontUploader';
import ColorArtworkDesigner from '@/components/admin/ColorArtworkDesigner';
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

function ColorSwatch({ label, color, onChange }) {
  return (
    <div className="flex items-center gap-1.5">
      <input type="color" value={color} onChange={(e) => onChange(e.target.value)}
        className="w-7 h-7 bg-white border border-steel rounded-[2px] cursor-pointer" />
      <span className="mono-label text-fog/50 text-[0.5rem]">{label}</span>
    </div>
  );
}

export default function DesignerPanel({
  form, setForm, setField, setStyle, currentStyle, designerTab, setDesignerTab, staticDisplay, jerseyId,
}) {
  const previewImageUrl = form.colors.find((c) => c.images?.length > 0)?.images?.[0]?.url;

  const updateColor = (index, updates) => {
    setForm((f) => ({
      ...f,
      colors: f.colors.map((c, i) => (i === index ? { ...c, ...updates } : c)),
    }));
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
            {/* Font selector — applies to the current tab (name or number) only */}
            <FontUploader
              fontUrl={currentStyle.custom_font_url || ''}
              fontName={currentStyle.custom_font_name || ''}
              onChange={({ url, name }) => { setStyle('custom_font_url', url); setStyle('custom_font_name', name); }}
            />
            <div>
              <span className="mono-label text-fog/50 text-[0.65rem] block mb-1.5">DEFAULT FONT</span>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto scrollbar-hide">
                  {FONTS.map((f) => (
                  <button key={f.id} type="button" onClick={() => {
                    setStyle('font_id', f.id);
                    setStyle('custom_font_url', '');
                    setStyle('custom_font_name', '');
                  }}
                    className={`px-2.5 py-1 border rounded-[4px] text-[0.65rem] transition-colors ${(currentStyle.font_id || form.font_id) === f.id ? 'border-kinetic bg-kinetic/10 text-fog' : 'border-steel text-fog/60 hover:text-fog'}`}
                    style={{ fontFamily: f.family }}>
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Warp sliders (horizontal) */}
            {form.enable_name || form.enable_number ? (
              <div className="border border-steel rounded-[4px] p-3 space-y-3">
                <div className="mono-label text-kinetic text-[0.6rem]">PROPERTIES</div>
                <HorizontalSlider label="SIZE" value={currentStyle.font_size} min={10} max={100} onChange={(v) => setStyle('font_size', v)} />
                <HorizontalSlider label="VERT POS" value={currentStyle.vert_pos ?? (designerTab === 'name' ? 40 : 50)} min={0} max={100} onChange={(v) => setStyle('vert_pos', v)} />
                <HorizontalSlider label="ARCH" value={currentStyle.arch} min={-50} max={50} onChange={(v) => setStyle('arch', v)} />
                <HorizontalSlider label="RISE" value={currentStyle.rise} min={-45} max={45} onChange={(v) => setStyle('rise', v)} />
                <HorizontalSlider label="FLAG" value={currentStyle.flag} min={-50} max={50} onChange={(v) => setStyle('flag', v)} />
                <div className="flex items-center gap-3 pt-1">
                  <ColorSwatch label="FILL" color={currentStyle.color || '#F5F5F7'} onChange={(v) => setStyle('color', v)} />
                  <ColorSwatch label="STROKE" color={currentStyle.outline_color || '#0A0A0A'} onChange={(v) => setStyle('outline_color', v)} />
                  <label className="flex items-center gap-1.5 ml-auto cursor-pointer">
                    <input type="checkbox" checked={currentStyle.outline ?? true} onChange={(e) => setStyle('outline', e.target.checked)} className="accent-kinetic w-3.5 h-3.5" />
                    <span className="mono-label text-fog/50 text-[0.5rem]">OUTLINE</span>
                  </label>
                </div>
                <HorizontalSlider label="THICKNESS" value={currentStyle.outline_thickness ?? 1.4} min={0} max={5} step={0.1} onChange={(v) => setStyle('outline_thickness', v)} />
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