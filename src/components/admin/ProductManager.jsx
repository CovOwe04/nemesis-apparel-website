import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Image } from '@/components/ui/image';
import { Upload, Trash2, Plus, Save, X, Type } from 'lucide-react';
import TextWarpPreview from '@/components/admin/TextWarpPreview';
import FontUploader from '@/components/admin/FontUploader';

const EMPTY_FORM = {
  name: '', team: '', category: 'Jersey', fitting: 'Regular', price: '',
  description: '', front_image: '', back_image: '',
  enable_customization: true, static_display: false, featured: false,
  display_height: 0,
  preset_names: [],
  show_number: false, default_number: '',
  text_warp: 'none', text_color: '#F5F5F7', text_outline: true, text_outline_color: '#0A0A0A',
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

function ImageUpload({ label, value, onChange }) {
  const [uploading, setUploading] = useState(false);
  const handle = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      onChange(file_url);
    } catch { alert('Upload failed.'); }
    finally { setUploading(false); }
  };
  return (
    <div>
      <div className="mono-label text-fog/50 mb-2">{label}</div>
      <label className="relative block aspect-[3/4] w-full max-w-[180px] border border-steel rounded-[6px] cursor-pointer overflow-hidden bg-steel hover:border-kinetic transition-colors">
        {value ? (
          <Image src={value} alt={label} fittingType="fill" className="w-full h-full" />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-fog/40">
            <Upload size={22} className="mb-2" />
            <span className="mono-label">{uploading ? 'UPLOADING…' : 'UPLOAD'}</span>
          </div>
        )}
        <input type="file" accept="image/*" onChange={handle} className="absolute inset-0 opacity-0 cursor-pointer" />
      </label>
    </div>
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

const inputCls = "w-full bg-white text-black border border-steel rounded-[6px] px-4 py-3 text-fog placeholder:text-black/40 focus:border-kinetic outline-none transition-colors";
const labelCls = "mono-label text-fog/50 block mb-2";

export default function ProductManager({ onSaved }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [jerseys, setJerseys] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [presetInput, setPresetInput] = useState('');

  const loadJerseys = () => {
    setLoadingList(true);
    base44.entities.Jersey.list('-created_date', 100)
      .then((d) => setJerseys(d || []))
      .catch(() => setJerseys([]))
      .finally(() => setLoadingList(false));
  };

  useEffect(() => { loadJerseys(); }, []);

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const startEdit = (j) => {
    setEditingId(j.id);
    setForm({
      ...EMPTY_FORM,
      ...j,
      preset_names: j.preset_names || [],
      available_from: j.available_from || '',
      available_until: j.available_until || '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => { setEditingId(null); setForm(EMPTY_FORM); };

  const addPreset = () => {
    const v = presetInput.trim().toUpperCase();
    if (!v || form.preset_names.includes(v)) return;
    setField('preset_names', [...form.preset_names, v]);
    setPresetInput('');
  };

  const removePreset = (n) => setField('preset_names', form.preset_names.filter((x) => x !== n));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.team || !form.price || !form.front_image || !form.back_image) {
      alert('Name, team, price, and both images are required.');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, price: Number(form.price) };
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
    catch (err) { alert('Delete failed.'); }
  };

  return (
    <div className="grid gap-10 lg:grid-cols-12">
      {/* Form + Preview */}
      <div className="lg:col-span-7">
        <div className="flex items-center justify-between mb-4">
          <div className="mono-label text-kinetic">{editingId ? 'EDIT KIT' : 'ADD NEW KIT'}</div>
          {editingId && (
            <button onClick={cancelEdit} className="mono-label text-fog/50 hover:text-kinetic inline-flex items-center gap-1">
              <X size={14} /> CANCEL EDIT
            </button>
          )}
        </div>

        {/* Live Text Warp Preview */}
        <div className="border border-steel rounded-[6px] mb-6 overflow-hidden">
          <div className="mono-label text-fog/50 px-4 py-2 border-b border-steel">LIVE TEXT PREVIEW</div>
          <div className="bg-void p-4">
            <TextWarpPreview
              text={form.name || 'NEMESIS'}
              number={form.default_number || '00'}
              warp={form.text_warp}
              color={form.text_color}
              outline={form.text_outline}
              outlineColor={form.text_outline_color}
              nameY={form.name_vertical_pos}
              numberY={form.number_vertical_pos}
              showNumber={form.show_number}
              customFontUrl={form.custom_font_url}
              customFontName={form.custom_font_name}
            />
          </div>
        </div>

        <form onSubmit={submit} className="space-y-5">
          <Section title="BASIC INFO">
            <div className="grid sm:grid-cols-2 gap-4">
              <div><label className={labelCls}>JERSEY NAME</label>
                <input value={form.name} onChange={(e) => setField('name', e.target.value)} placeholder="e.g. Nemesis Blackout" className={inputCls} />
              </div>
              <div><label className={labelCls}>TEAM</label>
                <input value={form.team} onChange={(e) => setField('team', e.target.value)} placeholder="e.g. Nemesis" className={inputCls} />
              </div>
            </div>
            <div className="grid sm:grid-cols-3 gap-4">
              <div><label className={labelCls}>CATEGORY</label>
                <select value={form.category} onChange={(e) => setField('category', e.target.value)} className={inputCls}>
                  {['Jersey', 'Long Sleeve', 'Hoodie', 'Bag', 'Hat'].map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div><label className={labelCls}>FITTING</label>
                <select value={form.fitting} onChange={(e) => setField('fitting', e.target.value)} className={inputCls}>
                  {['Slim', 'Regular', 'Loose'].map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div><label className={labelCls}>PRICE (USD)</label>
                <input type="number" min="0" value={form.price} onChange={(e) => setField('price', e.target.value)} placeholder="64" className={inputCls} />
              </div>
            </div>
            <div><label className={labelCls}>DESCRIPTION</label>
              <textarea value={form.description} onChange={(e) => setField('description', e.target.value)} rows={2} placeholder="Short kit description…" className={`${inputCls} resize-none`} />
            </div>
          </Section>

          <Section title="IMAGES">
            <div className="grid sm:grid-cols-2 gap-4">
              <ImageUpload label="FRONT IMAGE" value={form.front_image} onChange={(v) => setField('front_image', v)} />
              <ImageUpload label="BACK IMAGE (BLANK)" value={form.back_image} onChange={(v) => setField('back_image', v)} />
            </div>
          </Section>

          <Section title="DISPLAY & PLACEMENT">
            <Toggle checked={form.static_display} onChange={(v) => setField('static_display', v)} label="STATIC DISPLAY (NO FLIP)" />
            <Toggle checked={form.featured} onChange={(v) => setField('featured', v)} label="FEATURE ON LANDING" />
            <div><label className={labelCls}>DISPLAY PLACEMENT HEIGHT (ARSenal) — 0 = default</label>
              <input type="number" value={form.display_height} onChange={(e) => setField('display_height', Number(e.target.value))} className={inputCls} />
            </div>
          </Section>

          <Section title="IDENTITY LAB">
            <Toggle checked={form.enable_customization} onChange={(v) => setField('enable_customization', v)} label="ENABLE IDENTITY LAB" />
            <Toggle checked={form.show_number} onChange={(v) => setField('show_number', v)} label="SHOW PLAYER NUMBER" />
            <div><label className={labelCls}>DEFAULT PLAYER NUMBER</label>
              <input value={form.default_number} onChange={(e) => setField('default_number', e.target.value.toUpperCase().slice(0, 3))} placeholder="e.g. 23" className={inputCls} />
            </div>
            {/* Preset names */}
            <div>
              <label className={labelCls}>CONFIGURABLE PRESET NAMES</label>
              <div className="flex gap-2 mb-2">
                <input value={presetInput} onChange={(e) => setPresetInput(e.target.value.toUpperCase().slice(0, 20))}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addPreset(); } }}
                  placeholder="ADD A PRESET NAME" className={inputCls} />
                <button type="button" onClick={addPreset} className="btn-solid px-4 rounded-[6px]"><Plus size={16} /></button>
              </div>
              {form.preset_names.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {form.preset_names.map((n) => (
                    <span key={n} className="inline-flex items-center gap-1 bg-steel/40 border border-steel rounded-[6px] px-3 py-1.5 mono-label text-fog">
                      {n}
                      <button type="button" onClick={() => removePreset(n)} className="text-fog/40 hover:text-kinetic"><X size={12} /></button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </Section>

          <Section title="TEXT & GRAPHIC ADJUSTMENTS">
            <div><label className={labelCls}>TEXT WARP STYLE</label>
              <div className="grid grid-cols-4 gap-2">
                {['none', 'arch', 'rise', 'flag'].map((w) => (
                  <button key={w} type="button" onClick={() => setField('text_warp', w)}
                    className={`btn-solid py-3 mono-label ${form.text_warp === w ? 'bg-kinetic text-white' : ''}`}>
                    {w.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div><label className={labelCls}>TEXT COLOR</label>
                <input type="color" value={form.text_color} onChange={(e) => setField('text_color', e.target.value)} className="w-full h-12 bg-white border border-steel rounded-[6px] cursor-pointer" />
              </div>
              <div><label className={labelCls}>OUTLINE COLOR</label>
                <input type="color" value={form.text_outline_color} onChange={(e) => setField('text_outline_color', e.target.value)} className="w-full h-12 bg-white border border-steel rounded-[6px] cursor-pointer" />
              </div>
            </div>
            <Toggle checked={form.text_outline} onChange={(v) => setField('text_outline', v)} label="ENABLE TEXT OUTLINE" />
            <div className="grid sm:grid-cols-2 gap-4">
              <div><label className={labelCls}>NAME VERTICAL POSITION (0–100)</label>
                <input type="number" min="0" max="100" value={form.name_vertical_pos} onChange={(e) => setField('name_vertical_pos', Number(e.target.value))} className={inputCls} />
              </div>
              <div><label className={labelCls}>NUMBER VERTICAL POSITION (0–100)</label>
                <input type="number" min="0" max="100" value={form.number_vertical_pos} onChange={(e) => setField('number_vertical_pos', Number(e.target.value))} className={inputCls} />
              </div>
            </div>
            <FontUploader fontUrl={form.custom_font_url} fontName={form.custom_font_name}
              onChange={({ url, name }) => { setField('custom_font_url', url); setField('custom_font_name', name); }} />
          </Section>

          <Section title="ACCESS & PUBLISHING">
            <Toggle checked={form.is_private} onChange={(v) => setField('is_private', v)} label="PRIVATE (CLUB EXCLUSIVE)" />
            <div><label className={labelCls}>PRIVATE ACCESS CODE</label>
              <input value={form.private_access_code} onChange={(e) => setField('private_access_code', e.target.value)} placeholder="e.g. CLUB2026" className={inputCls} />
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
            {editingId ? <><Save size={18} /> {saving ? 'Saving…' : 'Update kit'}</> : <><Plus size={18} /> {saving ? 'Saving…' : 'Add to arsenal'}</>}
          </button>
        </form>
      </div>

      {/* Inventory list */}
      <div className="lg:col-span-5">
        <div className="mono-label text-kinetic mb-3">INVENTORY ({jerseys.length})</div>
        {loadingList ? (
          <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="h-20 bg-steel animate-pulse rounded-[6px]" />)}</div>
        ) : jerseys.length === 0 ? (
          <p className="mono-label text-fog/40">NO KITS IN INVENTORY.</p>
        ) : (
          <div className="space-y-3">
            {jerseys.map((j) => (
              <div key={j.id} className="flex items-center gap-3 border border-steel rounded-[6px] p-3">
                <div className="w-12 h-16 bg-steel shrink-0 overflow-hidden rounded-[4px]">
                  <Image src={j.front_image} alt={j.name} fittingType="fill" className="w-full h-full" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-heading text-fog text-sm truncate">{j.name}</div>
                  <div className="mono-label text-fog/40 mt-0.5">{j.team} · {j.category || 'Jersey'} · ${j.price}</div>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {j.enable_customization && <span className="mono-label text-kinetic">LAB</span>}
                    {j.featured && <span className="mono-label text-fog/50">FEATURED</span>}
                    {j.is_private && <span className="mono-label text-kinetic">PRIVATE</span>}
                    {j.text_warp && j.text_warp !== 'none' && <span className="mono-label text-fog/50">{j.text_warp.toUpperCase()}</span>}
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <button onClick={() => startEdit(j)} className="p-2 text-fog/40 hover:text-kinetic transition-colors" aria-label={`Edit ${j.name}`}>
                    <Type size={16} />
                  </button>
                  <button onClick={() => deleteJersey(j.id, j.name)} className="p-2 text-fog/40 hover:text-kinetic transition-colors" aria-label={`Delete ${j.name}`}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}