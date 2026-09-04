import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Image } from '@/components/ui/image';
import { Trash2, Plus, Save, X, GripVertical } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import TextWarpPreview from '@/components/admin/TextWarpPreview';
import FontUploader from '@/components/admin/FontUploader';
import ImagesEditor from '@/components/admin/ImagesEditor';

const EMPTY_FORM = {
  name: '', team: '', category: 'Jersey', fitting: 'Regular', price: '',
  description: '', images: [],
  enable_customization: true,
  text_color: '#F5F5F7', text_outline: true, text_outline_color: '#0A0A0A',
  arch_amount: 0, rise_angle: 0, flag_amount: 0,
  name_vertical_pos: 25, number_vertical_pos: 50,
  custom_font_url: '', custom_font_name: '',
  is_private: false, private_access_code: '',
  available_from: '', available_until: '',
};

function Toggle({ checked, onChange, label }) {
  return (
    <button type="button" onClick={() => onChange(!checked)}
      className="flex items-center justify-between w-full border border-steel rounded-[6px] px-4 py-3 hover:border-fog/40 transition-colors">
      <span className="mono-label text-fog/70">{label}</span>
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

function Slider({ label, value, min, max, step = 1, onChange }) {
  return (
    <div>
      <div className="mono-label text-fog/50 mb-2">{label}</div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full" />
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
      : [{ url: j.front_image, name: 'Base' }, ...(j.back_image && j.back_image !== j.front_image ? [{ url: j.back_image, name: '' }] : [])];
    setForm({ ...EMPTY_FORM, ...j, images });
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
    for (let i = 1; i < form.images.length; i++) {
      if (!form.images[i].name.trim()) {
        alert(`Image ${i + 1} requires a name.`);
        return;
      }
    }
    setSaving(true);
    try {
      const images = form.images.map((img, i) => ({
        ...img,
        name: i === 0 ? (img.name.trim() || 'Base') : img.name.trim(),
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
            <Toggle checked={form.enable_customization} onChange={(v) => setField('enable_customization', v)} label="ENABLE IDENTITY LAB" />
          </Section>

          {form.enable_customization && (
            <>
              {/* Live preview right above Text Properties */}
              <div className="border border-steel rounded-[6px] overflow-hidden">
                <div className="mono-label text-fog/50 px-4 py-2 border-b border-steel">LIVE TEXT PREVIEW</div>
                <div className="bg-void p-4">
                  <TextWarpPreview
                    text={form.name || 'NEMESIS'}
                    archAmount={form.arch_amount}
                    riseAngle={form.rise_angle}
                    flagAmount={form.flag_amount}
                    color={form.text_color}
                    outline={form.text_outline}
                    outlineColor={form.text_outline_color}
                    nameY={form.name_vertical_pos}
                    numberY={form.number_vertical_pos}
                    customFontUrl={form.custom_font_url}
                    customFontName={form.custom_font_name}
                  />
                </div>
              </div>

              <Section title="TEXT PROPERTIES">
                <FontUploader fontUrl={form.custom_font_url} fontName={form.custom_font_name}
                  onChange={({ url, name }) => { setField('custom_font_url', url); setField('custom_font_name', name); }} />
                <div className="grid sm:grid-cols-2 gap-4">
                  <div><label className={labelCls}>TEXT COLOR</label>
                    <input type="color" value={form.text_color} onChange={(e) => setField('text_color', e.target.value)} className="w-full h-12 bg-white border border-steel rounded-[6px] cursor-pointer" />
                  </div>
                  <div><label className={labelCls}>OUTLINE COLOR</label>
                    <input type="color" value={form.text_outline_color} onChange={(e) => setField('text_outline_color', e.target.value)} className="w-full h-12 bg-white border border-steel rounded-[6px] cursor-pointer" />
                  </div>
                </div>
                <Toggle checked={form.text_outline} onChange={(v) => setField('text_outline', v)} label="ENABLE TEXT OUTLINE" />
                <Slider label="ARCH" value={form.arch_amount} min={0} max={100} onChange={(v) => setField('arch_amount', v)} />
                <Slider label="RISE" value={form.rise_angle} min={-45} max={45} onChange={(v) => setField('rise_angle', v)} />
                <Slider label="FLAG" value={form.flag_amount} min={0} max={100} onChange={(v) => setField('flag_amount', v)} />
                <Slider label="NAME VERTICAL POSITION" value={form.name_vertical_pos} min={0} max={100} onChange={(v) => setField('name_vertical_pos', v)} />
                <Slider label="NUMBER VERTICAL POSITION" value={form.number_vertical_pos} min={0} max={100} onChange={(v) => setField('number_vertical_pos', v)} />
              </Section>
            </>
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
                            <button onClick={() => startEdit(j)} className="mono-label text-fog/60 hover:text-kinetic px-2 py-1 border border-steel rounded-[4px] hover:border-kinetic transition-colors">
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