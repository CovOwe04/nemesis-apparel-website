import { useRef, useCallback } from 'react';
import TextWarpPreview from '@/components/admin/TextWarpPreview';
import FontUploader from '@/components/admin/FontUploader';
import ArtworkPositionDesigner from '@/components/admin/ArtworkPositionDesigner';
import { FONTS } from '@/lib/fonts';

// Vertical range slider — min at bottom, max at top.
function VerticalSlider({ label, value, min, max, step = 0.1, onChange }) {
  return (
    <div className="flex flex-col items-center gap-1.5 shrink-0">
      <div className="h-24 flex items-center justify-center">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="vertical-slider"
          style={{ writingMode: 'vertical-lr', direction: 'rtl', width: '6px', height: '96px' }}
        />
      </div>
      <span className="mono-label text-fog/50 text-[0.55rem] text-center leading-tight">{label}</span>
    </div>
  );
}

// 2D draggable pad for horizontal + vertical position.
function PositionPad({ horizPos, vertPos, onChange }) {
  const padRef = useRef(null);
  const draggingRef = useRef(false);

  const updateFromEvent = useCallback((clientX, clientY) => {
    const rect = padRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));
    onChange({ horiz_pos: Math.round(x * 10) / 10, vert_pos: Math.round(y * 10) / 10 });
  }, [onChange]);

  const onPointerDown = (e) => {
    draggingRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    updateFromEvent(e.clientX, e.clientY);
  };
  const onPointerMove = (e) => {
    if (draggingRef.current) updateFromEvent(e.clientX, e.clientY);
  };
  const onPointerUp = (e) => {
    draggingRef.current = false;
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  return (
    <div className="space-y-1.5">
      <div
        ref={padRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className="relative w-full aspect-square bg-void border border-steel rounded-[4px] cursor-crosshair touch-none overflow-hidden"
      >
        {/* Grid lines */}
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-steel/40" />
        <div className="absolute top-1/2 left-0 right-0 h-px bg-steel/40" />
        {/* Position dot */}
        <div
          className="absolute w-3 h-3 bg-kinetic rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none shadow-[0_0_0_2px_hsl(var(--void))]"
          style={{ left: `${horizPos}%`, top: `${vertPos}%` }}
        />
      </div>
      <div className="flex justify-between mono-label text-fog/40 text-[0.55rem]">
        <span>H {horizPos.toFixed(0)}</span>
        <span>V {vertPos.toFixed(0)}</span>
      </div>
    </div>
  );
}

function ColorSwatch({ label, color, onChange }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <input
        type="color"
        value={color}
        onChange={(e) => onChange(e.target.value)}
        className="w-9 h-9 bg-white border border-steel rounded-[4px] cursor-pointer"
      />
      <span className="mono-label text-fog/50 text-[0.55rem]">{label}</span>
    </div>
  );
}

function Toggle({ checked, onChange, label }) {
  return (
    <button type="button" onClick={() => onChange(!checked)}
      className={`btn-solid flex items-center justify-between w-full px-3 py-2 ${checked ? '' : 'btn-dark-hover'}`}>
      <span className="mono-label text-[0.6rem]">{label}</span>
      <span className={`relative w-9 h-5 transition-colors rounded-[4px] ${checked ? 'bg-kinetic' : 'bg-steel'}`}>
        <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-void rounded-[3px] transition-transform ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
      </span>
    </button>
  );
}

export default function DesignerPanel({
  form,
  setField,
  setStyle,
  currentStyle,
  designerTab,
  setDesignerTab,
  staticDisplay,
  jerseyId,
}) {
  const previewImageUrl = form.colors.find((c) => c.images?.length > 0)?.images?.[0]?.url;

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
        <div className="p-4">
          <ArtworkPositionDesigner
            colors={form.colors}
            combos={form.name_number_combos}
            nameStyle={form.name_style}
            numberStyle={form.number_style}
            customFontUrl={form.custom_font_url}
            customFontName={form.custom_font_name}
            fontId={form.font_id}
            enableName={form.enable_name}
            enableNumber={form.enable_number}
            artworkPosition={form.artwork_position}
            onChange={(pos) => setField('artwork_position', pos)}
            jerseyId={jerseyId}
            staticDisplay={staticDisplay}
          />
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

            {form.enable_name || form.enable_number ? (
              <>
                {/* Color designer */}
                <div className="border border-steel rounded-[4px] p-3 space-y-3">
                  <div className="mono-label text-kinetic text-[0.6rem]">COLOR</div>
                  <div className="flex items-start gap-4">
                    <ColorSwatch label="FILL" color={currentStyle.color} onChange={(v) => setStyle('color', v)} />
                    <ColorSwatch label="OUTLINE" color={currentStyle.outline_color} onChange={(v) => setStyle('outline_color', v)} />
                    <div className="flex-1 space-y-2">
                      <Toggle checked={currentStyle.outline} onChange={(v) => setStyle('outline', v)} label="OUTLINE" />
                      <div className="flex items-center gap-2">
                        <span className="mono-label text-fog/50 text-[0.55rem] w-16">THICKNESS</span>
                        <input type="number" min={0} max={5} step={0.1} value={currentStyle.outline_thickness}
                          onChange={(e) => setStyle('outline_thickness', Number(e.target.value))}
                          className="w-14 bg-white text-black border border-steel rounded-[4px] px-2 py-1 text-xs text-center no-spinner focus:border-kinetic outline-none" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Warp sliders (vertical) */}
                <div className="border border-steel rounded-[4px] p-3">
                  <div className="mono-label text-kinetic text-[0.6rem] mb-3">WARP</div>
                  <div className="flex items-end justify-around gap-2">
                    <VerticalSlider label="SIZE" value={currentStyle.font_size} min={10} max={100} onChange={(v) => setStyle('font_size', v)} />
                    <VerticalSlider label="ARCH" value={currentStyle.arch} min={-50} max={50} onChange={(v) => setStyle('arch', v)} />
                    <VerticalSlider label="RISE" value={currentStyle.rise} min={-45} max={45} onChange={(v) => setStyle('rise', v)} />
                    <VerticalSlider label="FLAG" value={currentStyle.flag} min={-50} max={50} onChange={(v) => setStyle('flag', v)} />
                  </div>
                </div>

                {/* 2D position pad */}
                <div className="border border-steel rounded-[4px] p-3">
                  <div className="mono-label text-kinetic text-[0.6rem] mb-3">POSITION</div>
                  <div className="max-w-[140px]">
                    <PositionPad
                      horizPos={currentStyle.horiz_pos}
                      vertPos={currentStyle.vert_pos}
                      onChange={({ horiz_pos, vert_pos }) => { setStyle('horiz_pos', horiz_pos); setStyle('vert_pos', vert_pos); }}
                    />
                  </div>
                </div>
              </>
            ) : (
              <p className="mono-label text-fog/30 py-4">Enable Name or Number to access designer controls.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}