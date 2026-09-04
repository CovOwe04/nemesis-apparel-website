import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Image } from '@/components/ui/image';
import { Trash2, Plus, Save, X, GripVertical } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import TextWarpPreview from '@/components/admin/TextWarpPreview';
import FontUploader from '@/components/admin/FontUploader';
import ImagesEditor from '@/components/admin/ImagesEditor';

const DEFAULT_NAME_STYLE = {
  color: '#F5F5F7', outline: true, outline_color: '#0A0A0A', outline_thickness: 1.4,
  arch: 0, rise: 0, flag: 0, horiz_pos: 50, vert_pos: 50, font_size: 42,
};
const DEFAULT_NUMBER_STYLE = {
  ...DEFAULT_NAME_STYLE, font_size: 76,
};

const EMPTY_FORM = {
  name: '', team: '', category: 'Jersey', fitting: 'Regular', price: '',
  description: '', images: [],
  enable_customization: false,
  name_style: { ...DEFAULT_NAME_STYLE },
  number_style: { ...DEFAULT_NUMBER_STYLE },
  custom_font_url: '', custom_font_name: '',
  is_private: false, private_access_code: '',
  available_from: '', available_until: '',
};

function Toggle({ checked, onChange, label, disabled = false }) {
  return (
    <button type="button" onClick={() => !disabled && onChange(!checked)} disabled={disabled}
      className={`btn-solid flex items-center justify-between w-full px-4 py-3 ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}>
      <span className="mono-label text-void">{label}</span>
      <span className={`relative w-11 h-6 transition-colors rounded-[6px] ${checked ? 'bg-kinetic' : 'bg-steel'}`}>
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-void rounded-[4px] transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
      </span>
    </button>
  );
}

function Section({ title, children }) {
  return (
    <div className="border border-steel rounded-[6px] p-5">
      <div className="mono-label text-kinetic mb-4">{title}</div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function PropRow({ label, value, min, max, step = 1, onChange }) {
  return (
    <div className="flex items-center gap-2">
      <span className="mono-label text-fog/50 w-20 shrink-0 text-[0.65rem]">{label}</span>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 min-w-0" />
      <input type="number" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-12 bg-white text-black border border-steel rounded-[4px] px-1.5 py-1 text-xs text-center no-spinner focus:border-kinetic outline-none" />
    </div>
  );
}

const inputCls = "w-full bg-white text-black border border-steel rounded-[6px] px-4 py-3 placeholder:text-black/40 focus:border-kinetic outline-none transition-colors";
const labelCls = "mono-label text-fog/50 block mb-2";

export default function ProductManager({ onSaved }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [jerseys, setJerseys] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [designerTab, setDesignerTab] = useState('name');

  const styleKey = designerTab === 'name' ? 'name_style' : 'number_style';
  const currentStyle = form[styleKey] || {};
  const setStyle = (field, value) => setField(styleKey, { ...currentStyle, [field]: value });

  const loadJerseys = () => {
    setLoadingList(true);
    base44.entities.Jersey.list('-created_date', 100)
      .then((d) => {
        const sorted = (d || []).sort((a, b) => (a.sort_order ?? 9999) - (b.sort_order ?? 9999));
        setJerseys(sorted);
      })
      .catch(() => setJerseys([]))
      .finally(() => setLoadingList(false));
  };

  useEffect(() => { loadJerseys(); }, []);

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const startEdit = (j) => {
    setEditingId(j.id);
    const images = j.images && j.images.length > 0
      ? j.images
      : [{ url: j.front_image, name: '', number: '' }, ...(j.back_image && j.back_image !== j.front_image ? [{ url: j.back_image, name: '', number: '' }] : [])];
    setForm({
      ...EMPTY_FORM,
      ...j,
      images,
      name_style: { ...DEFAULT_NAME_STYLE, ...(j.name_style || {}) },
      number_style: { ...DEFAULT_NUMBER_STYLE, ...(j.number_style || {}) },
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => { setEditingId(null); setForm(EMPTY_FORM); };

  const onDragEnd = async (result) => {
    if (!result.destination) return;
    const reordered = Array.from(jerseys);
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);
    const updates = reordered.map((j, i) => ({ id: j.id, sort_order: i }));
    setJerseys(reordered);
    try {
      await base44.entities.Jersey.bulkUpdate(updates);
    } catch {
      loadJerseys();
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.team || !form.price || form.images.length === 0) {
      alert('Name, team, price, and at least 1 image are required.');
      return;
    }
    setSaving(true);
    try {
      const images = form.images.map((img) => ({
        url: img.url,
        name: img.name?.trim() || '',
        number: img.number?.trim() || '',
      }));
      const front_image = images[0].url;
      const back_image = images[1]?.url || images[0].url;
      const payload = { ...form, images, front_image, back_image, price: Number(form.price) };
      if (editingId) {
        await base44.entities.Jersey.update(editingId, payload);
      } else {
        await base44.entities.Jersey.create(payload);
      }
      setForm(EMPTY_FORM);
      setEditingId(null);
      loadJerseys();
      onSaved?.();
    } catch (err) {
      alert('Save failed: ' + (err?.message || 'unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const deleteJersey = async (id, name) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try { await base44.entities.Jersey.delete(id); loadJerseys(); }
    catch { alert('Delete failed.'); }
  };

  return (
    <div className="grid gap-10 lg:grid-cols-12">
      {/* Form */}
      <div className="lg:col-span-7">
        <div className="flex items-center justify-between mb-4">
          <div className="mono-label text-kinetic">{editingId ? 'EDIT JERSEY' : 'ADD NEW JERSEY'}</div>
          {editingId && (
            <button onClick={cancelEdit} className="mono-label text-fog/50 hover:text-kinetic inline-flex items-center gap-1">
              <X size={14} /> CANCEL
            </button>
          )}
        </div>

        <form onSubmit={submit} className="space-y-5">
          <Section title="BASIC INFORMATION">
            <div className="grid sm:grid-cols-2 gap-4">
              <div><label className={labelCls}>JERSEY NAME</label>
                <input value={form.name} onChange={(e) => setField('name', e.target.value)} placeholder="e.g. Nemesis Blackout" className={inputCls} />
              </div>
              <div><label className={labelCls}>TEAM</label>
                <input value={form.team} onChange={(e) => setField('team', e.target.value)} placeholder="e.g. Nemesis" className={inputCls} />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div><label className={labelCls}>CATEGORY</label>
                <select value={form.category} onChange={(e) => setField('category', e.target.value)} className={inputCls}>
                  {['Jersey', 'Long Sleeve', 'Hoodie', 'Bag', 'Hat'].map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div><label className={labelCls}>PRICE (USD)</label>
                <input type="number" min="0" value={form.price} onChange={(e) => setField('price', e.target.value)} placeholder="64" className={inputCls} />
              </div>
            </div>
            <div><label className={labelCls}>DESCRIPTION</label>
              <textarea value={form.description} onChange={(e) => setField('description', e.target.value)} rows={2} placeholder="Short description…" className={`${inputCls} resize-none`} />
            </div>
          </Section>

          <Section title="IMAGES">
            <ImagesEditor images={form.images} onChange={(imgs) => setField('images', imgs)} />
          </Section>

          <Section title="IDENTITY LAB">
            <Toggle
              checked={form.enable_customization}
              onChange={(v) => {
                if (v && form.images.length === 0) return;
                setField('enable_customization', v);
              }}
              disabled={form.images.length === 0}
              label="ENABLE IDENTITY LAB"
            />
            {form.images.length === 0 && (
              <p className="mono-label text-fog/30">Upload at least 1 image to enable Identity Lab.</p>
            )}
          </Section>

          {/* Designer — combined live preview + per-part text properties */}
          {form.enable_customization && (
            <div className="border border-steel rounded-[6px] overflow-hidden">
              <div className="mono-label text-kinetic px-5 py-3 border-b border-steel">DESIGNER</div>
              <div className="grid lg:grid-cols-2">
                {/* Preview canvas */}
                <div className="bg-void p-4 border-b lg:border-b-0 lg:border-r border-steel">
                  <TextWarpPreview
                    imageUrl={form.images[0]?.url}
                    nameStyle={form.name_style}
                    numberStyle={form.number_style}
                    customFontUrl={form.custom_font_url}
                    customFontName={form.custom_font_name}
                  />
                </div>
                {/* Text properties controls */}
                <div className="p-4 space-y-2">
                  <FontUploader fontUrl={form.custom_font_url} fontName={form.custom_font_name}
                    onChange={({ url, name }) => { setField('custom_font_url', url); setField('custom_font_name', name); }} />

                  {/* Name / Number tabs */}
                  <div className="flex gap-2 pt-1">
                    <button type="button" onClick={() => setDesignerTab('name')}
                      className={`mono-label px-3 py-1.5 border rounded-[4px] text-[0.65rem] transition-colors ${designerTab === 'name' ? 'bg-kinetic text-void border-kinetic' : 'border-steel text-fog/60 hover:text-fog'}`}>
                      NAME
                    </button>
                    <button type="button" onClick={() => setDesignerTab('number')}
                      className={`mono-label px-3 py-1.5 border rounded-[4px] text-[0.65rem] transition-colors ${designerTab === 'number' ? 'bg-kinetic text-void border-kinetic' : 'border-steel text-fog/60 hover:text-fog'}`}>
                      NUMBER
                    </button>
                  </div>

                  {/* Tab-specific controls */}
                  <div className="flex items-center gap-3">
                    <span className="mono-label text-fog/50 w-20 shrink-0 text-[0.65rem]">TEXT COLOR</span>
                    <input type="color" value={currentStyle.color} onChange={(e) => setStyle('color', e.target.value)} className="w-8 h-8 bg-white border border-steel rounded-[4px] cursor-pointer" />
                    <span className="mono-label text-fog/50 w-20 shrink-0 text-[0.65rem]">OUTLINE COLOR</span>
                    <input type="color" value={currentStyle.outline_color} onChange={(e) => setStyle('outline_color', e.target.value)} className="w-8 h-8 bg-white border border-steel rounded-[4px] cursor-pointer" />
                  </div>
                  <Toggle checked={currentStyle.outline} onChange={(v) => setStyle('outline', v)} label="ENABLE TEXT OUTLINE" />
                  <div className="flex items-center gap-2">
                    <span className="mono-label text-fog/50 w-20 shrink-0 text-[0.65rem]">OUTLINE THICKNESS</span>
                    <input type="number" min={0} max={5} step={0.1} value={currentStyle.outline_thickness}
                      onChange={(e) => setStyle('outline_thickness', Number(e.target.value))}
                      className="w-16 bg-white text-black border border-steel rounded-[4px] px-2 py-1 text-xs text-center no-spinner focus:border-kinetic outline-none" />
                  </div>
                  <PropRow label="FONT SIZE" value={currentStyle.font_size} min={10} max={100} onChange={(v) => setStyle('font_size', v)} />
                  <PropRow label="ARCH" value={currentStyle.arch} min={0} max={100} onChange={(v) => setStyle('arch', v)} />
                  <PropRow label="RISE" value={currentStyle.rise} min={-45} max={45} onChange={(v) => setStyle('rise', v)} />
                  <PropRow label="FLAG" value={currentStyle.flag} min={0} max={100} onChange={(v) => setStyle('flag', v)} />
                  <PropRow label="HORIZ POS" value={currentStyle.horiz_pos} min={0} max={100} onChange={(v) => setStyle('horiz_pos', v)} />
                  <PropRow label="VERT POS" value={currentStyle.vert_pos} min={0} max={100} onChange={(v) => setStyle('vert_pos', v)} />
                  <button type="button" onClick={() => {
                    const text = `${designerTab.toUpperCase()} — H:${currentStyle.horiz_pos} V:${currentStyle.vert_pos}`;
                    navigator.clipboard.writeText(text);
                  }} className="btn-solid px-3 py-1.5 mono-label text-xs w-full">
                    COPY GEOM
                  </button>
                </div>
              </div>
            </div>
          )}

          <Section title="ACCESS & PUBLISHING">
            <Toggle checked={form.is_private} onChange={(v) => setField('is_private', v)} label="PRIVATE (CLUB EXCLUSIVE)" />
            <div>
              <label className={labelCls}>PRIVATE ACCESS CODE</label>
              <input value={form.private_access_code} onChange={(e) => setField('private_access_code', e.target.value)}
                placeholder="e.g. CLUB2026" disabled={!form.is_private}
                className={`${inputCls} disabled:opacity-40 disabled:cursor-not-allowed`} />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div><label className={labelCls}>AVAILABLE FROM</label>
                <input type="datetime-local" value={form.available_from ? form.available_from.slice(0, 16) : ''} onChange={(e) => setField('available_from', e.target.value ? new Date(e.target.value).toISOString() : '')} className={inputCls} />
              </div>
              <div><label className={labelCls}>AVAILABLE UNTIL</label>
                <input type="datetime-local" value={form.available_until ? form.available_until.slice(0, 16) : ''} onChange={(e) => setField('available_until', e.target.value ? new Date(e.target.value).toISOString() : '')} className={inputCls} />
              </div>
            </div>
          </Section>

          <button type="submit" disabled={saving}
            className="inline-flex items-center gap-2 bg-kinetic px-6 py-3 font-heading uppercase text-void hover:bg-fog transition-colors rounded-[6px] disabled:opacity-60">
            {editingId ? <><Save size={18} /> {saving ? 'Saving…' : 'Update jersey'}</> : <><Plus size={18} /> {saving ? 'Saving…' : 'Add to arsenal'}</>}
          </button>
        </form>
      </div>

      {/* Inventory list with drag-and-drop */}
      <div className="lg:col-span-5">
        <div className="mono-label text-kinetic mb-3">INVENTORY — DRAG TO REORDER</div>
        {loadingList ? (
          <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="h-20 bg-steel animate-pulse rounded-[6px]" />)}</div>
        ) : jerseys.length === 0 ? (
          <p className="mono-label text-fog/40">NO JERSEYS IN INVENTORY.</p>
        ) : (
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="jersey-list">
              {(provided) => (
                <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-3">
                  {jerseys.map((j, index) => (
                    <Draggable key={j.id} draggableId={j.id} index={index}>
                      {(p) => (
                        <div ref={p.innerRef} {...p.draggableProps} {...p.dragHandleProps}
                          className="flex items-center gap-3 border border-steel rounded-[6px] p-3 bg-void">
                          <GripVertical size={16} className="text-fog/30 shrink-0" />
                          <span className="mono-label text-fog/30 w-5 text-center shrink-0">{index + 1}</span>
                          <div className="w-12 h-16 bg-steel shrink-0 overflow-hidden rounded-[4px]">
                            <Image src={j.front_image} alt={j.name} fittingType="fill" className="w-full h-full" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-heading text-fog text-sm truncate">{j.name}</div>
                            <div className="mono-label text-fog/40 mt-0.5">{j.team} · {j.category || 'Jersey'} · ${j.price}</div>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {j.enable_customization && <span className="mono-label text-kinetic">LAB</span>}
                              {j.is_private && <span className="mono-label text-kinetic">PRIVATE</span>}
                            </div>
                          </div>
                          <div className="flex flex-col gap-1 shrink-0">
                            <button onClick={() => startEdit(j)} className="btn-solid px-3 py-1.5 mono-label text-xs">
                              Edit
                            </button>
                            <button onClick={() => deleteJersey(j.id, j.name)} className="p-1.5 text-fog/40 hover:text-kinetic transition-colors" aria-label={`Delete ${j.name}`}>
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        )}
      </div>
    </div>
  );
}