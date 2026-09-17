import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Plus, Save, ArrowLeft } from 'lucide-react';
import AdminLogin, { useAdminAuth } from '@/components/admin/AdminLogin';
import TextWarpPreview from '@/components/admin/TextWarpPreview';
import FontUploader from '@/components/admin/FontUploader';
import ColorsEditor from '@/components/admin/ColorsEditor';
import NameNumberCombosEditor from '@/components/admin/NameNumberCombosEditor';
import MerchizeCatalogPicker from '@/components/admin/MerchizeCatalogPicker';
import VariantMerchizeIdsEditor from '@/components/admin/VariantMerchizeIdsEditor';
import ArtworkPositionDesigner from '@/components/admin/ArtworkPositionDesigner';
import { FONTS } from '@/lib/fonts';

const DEFAULT_NAME_STYLE = {
  color: '#F5F5F7', outline: true, outline_color: '#0A0A0A', outline_thickness: 1.4,
  arch: 0, rise: 0, flag: 0, horiz_pos: 30, vert_pos: 40, font_size: 8
};
const DEFAULT_NUMBER_STYLE = {
  color: '#F5F5F7', outline: true, outline_color: '#0A0A0A', outline_thickness: 1.4,
  arch: 0, rise: 0, flag: 0, horiz_pos: 30, vert_pos: 50, font_size: 35
};

const EMPTY_FORM = {
  name: '', team: '', category: 'Jersey', fitting: 'Regular', net_terms: '', price: '',
  description: '', colors: [], name_number_combos: [],
  enable_customization: false,
  enable_name: true,
  enable_number: true,
  name_style: { ...DEFAULT_NAME_STYLE },
  number_style: { ...DEFAULT_NUMBER_STYLE },
  custom_font_url: '', custom_font_name: '', font_id: 'block',
  static_display: false,
  is_private: false, private_access_code: '',
  available_from: '', available_until: '',
  merchize_product_id: '', merchize_product_title: '', merchize_variants: {}, variant_merchize_ids: [],
  artwork_front: '', artwork_back: '', artwork_sleeve: '', artwork_hood: '',
  artwork_position: {}
};

function Toggle({ checked, onChange, label, disabled = false }) {
  return (
    <button type="button" onClick={() => !disabled && onChange(!checked)} disabled={disabled}
    className={`btn-solid flex items-center justify-between w-full px-4 py-3 ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}>
      <span className="mono-label text-void">{label}</span>
      <span className={`relative w-11 h-6 transition-colors rounded-[6px] ${checked ? 'bg-kinetic' : 'bg-steel'}`}>
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-void rounded-[4px] transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
      </span>
    </button>);

}

function Section({ title, children }) {
  return (
    <div className="border border-steel rounded-[6px] p-5">
      <div className="mono-label text-kinetic mb-4">{title}</div>
      <div className="space-y-4">{children}</div>
    </div>);

}

function PropRow({ label, value, min, max, step = 0.1, onChange }) {
  return (
    <div className="flex items-center gap-2">
      <span className="mono-label text-fog/50 w-20 shrink-0 text-[0.65rem]">{label}</span>
      <input type="range" min={min} max={max} step={step} value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="flex-1 min-w-0" />
      <input type="number" min={min} max={max} step={step} value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-12 bg-white text-black border border-steel rounded-[4px] px-1.5 py-1 text-xs text-center no-spinner focus:border-kinetic outline-none" />
    </div>);

}

const inputCls = "w-full bg-white text-black border border-steel rounded-[6px] px-4 py-3 placeholder:text-black/40 focus:border-kinetic outline-none transition-colors";
const labelCls = "mono-label text-fog/50 block mb-2";

export default function JerseyEditor() {
  const { authed, login } = useAdminAuth();
  const { jerseyId } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!!jerseyId);
  const [designerTab, setDesignerTab] = useState('name');
  const [showMerchizePicker, setShowMerchizePicker] = useState(false);
  const [pendingGenerateId, setPendingGenerateId] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState('');

  useEffect(() => {
    if (!jerseyId) return;
    base44.entities.Jersey.get(jerseyId).then((j) => {
      // Migrate old images to colors if colors is empty
      let colors = j.colors || [];
      let combos = j.name_number_combos || [];
      if (colors.length === 0) {
        if (j.images && j.images.length > 0) {
          colors = [{ name: 'Default', hex: '#000000', images: j.images.map((img) => ({ url: img.url })) }];
          combos = j.images
            .filter((img) => img.name || img.number)
            .map((img) => ({ name: img.name || '', number: img.number || '' }));
        } else if (j.front_image) {
          const imgs = [{ url: j.front_image }];
          if (j.back_image && j.back_image !== j.front_image) imgs.push({ url: j.back_image });
          colors = [{ name: 'Default', hex: '#000000', images: imgs }];
        }
      }
      setForm({
        ...EMPTY_FORM,
        ...j,
        colors,
        name_number_combos: combos,
        name_style: { ...DEFAULT_NAME_STYLE, ...(j.name_style || {}) },
        number_style: { ...DEFAULT_NUMBER_STYLE, ...(j.number_style || {}) }
      });
      setLoading(false);
    }).catch(() => {
      setLoading(false);
      alert('Jersey not found.');
      navigate('/nexus-control');
    });
  }, [jerseyId]);

  const styleKey = designerTab === 'name' ? 'name_style' : 'number_style';
  const currentStyle = form[styleKey] || {};
  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setStyle = (field, value) => setField(styleKey, { ...currentStyle, [field]: value });

  useEffect(() => {
    if (designerTab === 'name' && !form.enable_name && form.enable_number) setDesignerTab('number');else
    if (designerTab === 'number' && !form.enable_number && form.enable_name) setDesignerTab('name');
  }, [form.enable_name, form.enable_number, designerTab]);

  const hasImages = form.colors.some((c) => c.images && c.images.length > 0);
  const staticDisplay = (form.colors.find((c) => c.images?.length > 0)?.images?.length || 0) <= 1;

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.team || !form.price || !hasImages) {
      alert('Name, team, price, and at least 1 color with images are required.');
      return;
    }
    setSaving(true);
    try {
      const firstColorImages = form.colors.find((c) => c.images && c.images.length > 0)?.images || [];
      const front_image = firstColorImages[0]?.url || '';
      const back_image = firstColorImages[1]?.url || firstColorImages[0]?.url || '';
      const images = firstColorImages.map((img) => ({ url: img.url, name: '', number: '' }));
      const firstColorWithImages = form.colors.find((c) => c.images?.length > 0);
      const payload = { ...form, front_image, back_image, images, price: Number(form.price), static_display: (firstColorWithImages?.images?.length || 0) <= 1 };
      let savedId;
      if (jerseyId) {
        await base44.entities.Jersey.update(jerseyId, payload);
        savedId = jerseyId;
      } else {
        const created = await base44.entities.Jersey.create(payload);
        savedId = created.id;
      }
      setPendingGenerateId(savedId);
    } catch (err) {
      alert('Save failed: ' + (err?.message || 'unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const runGenerate = async () => {
    setGenerating(true);
    setGenError('');
    try {
      const colors = form.colors.length > 0 ? form.colors : [{ name: 'Default' }];
      const combos = form.name_number_combos || [];
      const variants = [];
      if (combos.length > 0) {
        for (const color of colors) {
          for (const combo of combos) {
            variants.push({ color_name: color.name || 'Default', combo_name: combo.name || '', combo_number: combo.number || '' });
          }
        }
      } else {
        for (const color of colors) {
          variants.push({ color_name: color.name || 'Default', combo_name: '', combo_number: '' });
        }
      }
      if (variants.length > 0) {
        const passcode = sessionStorage.getItem('nemesis-admin-passcode') || '';
        const res = await base44.functions.invoke('create-merchize-products', {
          jerseyId: pendingGenerateId,
          variants,
          passcode,
          merchize_product_id: form.merchize_product_id,
          merchize_variants: form.merchize_variants,
        });
        if (res.data?.error) { setGenError(res.data.error); return; }
        const results = res.data?.results || [];
        const variantIds = results.filter((r) => r.success).map((r) => ({
          color_name: r.color_name, combo_name: r.combo_name, combo_number: r.combo_number,
          merchize_product_id: r.merchize_product_id, manually_set: false,
          variant_ids: r.variant_ids || {}, skus: r.skus || {},
        }));
        if (variantIds.length > 0) {
          await base44.entities.Jersey.update(pendingGenerateId, { variant_merchize_ids: variantIds });
        }
      }
      navigate('/nexus-control');
    } catch (err) {
      setGenError(err?.message || 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  if (!authed) return <AdminLogin onLogin={login} />;
  if (loading) return (
    <div className="bg-void min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-steel border-t-kinetic rounded-full animate-spin" />
    </div>);


  return (
    <div className="bg-void min-h-screen">
      {/* Top bar */}
      <div className="border-b border-steel">
        <div className="mx-auto max-w-4xl px-5 sm:px-8 py-6 flex items-center gap-3">
          <Link to="/nexus-control" className="text-fog/50 hover:text-kinetic transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="font-heading text-xl uppercase text-fog">
            {jerseyId ? 'Edit Jersey' : 'Add New Jersey'}
          </h1>
        </div>
      </div>

      {/* Form */}
      <div className="mx-auto max-w-4xl px-5 sm:px-8 py-8">
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

          <Section title="COLORS & IMAGES">
            <ColorsEditor colors={form.colors} onChange={(c) => setField('colors', c)} jerseyId={jerseyId} />
          </Section>

          <Section title="NAME & NUMBER PRESETS">
            
            <NameNumberCombosEditor combos={form.name_number_combos} onChange={(c) => setField('name_number_combos', c)} />
          </Section>

          <Section title="IDENTITY LAB">
            <Toggle
              checked={form.enable_customization}
              onChange={(v) => {
                if (v && !hasImages) return;
                setField('enable_customization', v);
              }}
              disabled={!hasImages}
              label="ENABLE IDENTITY LAB" />
            
            {!hasImages &&
            <p className="mono-label text-fog/30">Add at least 1 color with images to enable Identity Lab.</p>
            }
            {form.enable_customization &&
            <>
                <Toggle
                checked={form.enable_name}
                onChange={(v) => setField('enable_name', v)}
                label="ENABLE NAME CUSTOMIZATION" />
              
                <Toggle
                checked={form.enable_number}
                onChange={(v) => setField('enable_number', v)}
                label="ENABLE NUMBER CUSTOMIZATION" />
              </>
            }
          </Section>

          {form.enable_customization &&
          <div className="border border-steel rounded-[6px] overflow-hidden">
              <div className="mono-label text-kinetic px-5 py-3 border-b border-steel">DESIGNER</div>
              <div className="px-4 pt-4 flex gap-2 flex-wrap">
                {form.enable_name &&
                  <button type="button" onClick={() => setDesignerTab('name')}
                    className={`mono-label px-3 py-1.5 border rounded-[4px] text-[0.65rem] transition-colors ${designerTab === 'name' ? 'bg-kinetic text-void border-kinetic' : 'border-steel text-fog/60 hover:text-fog'}`}>
                    NAME
                  </button>
                }
                {form.enable_number &&
                  <button type="button" onClick={() => setDesignerTab('number')}
                    className={`mono-label px-3 py-1.5 border rounded-[4px] text-[0.65rem] transition-colors ${designerTab === 'number' ? 'bg-kinetic text-void border-kinetic' : 'border-steel text-fog/60 hover:text-fog'}`}>
                    NUMBER
                  </button>
                }
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
                <div className="bg-void p-4 border-b lg:border-b-0 lg:border-r border-steel">
                  <TextWarpPreview
                  imageUrl={form.colors.find((c) => c.images?.length > 0)?.images?.[0]?.url}
                  nameStyle={form.name_style}
                  numberStyle={form.number_style}
                  customFontUrl={form.custom_font_url}
                  customFontName={form.custom_font_name}
                  fontId={form.font_id}
                  enableName={form.enable_name}
                  enableNumber={form.enable_number}
                  staticDisplay={staticDisplay} />
                
                </div>
                <div className="p-4 space-y-2">
                  <FontUploader fontUrl={form.custom_font_url} fontName={form.custom_font_name}
                onChange={({ url, name }) => {setField('custom_font_url', url);setField('custom_font_name', name);}} />
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

                  {form.enable_name || form.enable_number ?
                <>
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
                      <PropRow label="ARCH" value={currentStyle.arch} min={-50} max={50} onChange={(v) => setStyle('arch', v)} />
                      <PropRow label="RISE" value={currentStyle.rise} min={-45} max={45} onChange={(v) => setStyle('rise', v)} />
                      <PropRow label="FLAG" value={currentStyle.flag} min={-50} max={50} onChange={(v) => setStyle('flag', v)} />
                      <PropRow label="HORIZ POS" value={currentStyle.horiz_pos} min={0} max={100} onChange={(v) => setStyle('horiz_pos', v)} />
                      <PropRow label="VERT POS" value={currentStyle.vert_pos} min={0} max={100} onChange={(v) => setStyle('vert_pos', v)} />
                    </> :

                <p className="mono-label text-fog/30 py-4">Enable Name or Number to access designer controls.</p>
                }
                </div>
              </div>
              )}
            </div>
          }

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

          <Section title="MERCHIZE FULFILLMENT">
            <div>
              <label className={labelCls}>CATALOG PRODUCT ID</label>
              <div className="flex gap-2">
                <input value={form.merchize_product_title || ''} onChange={(e) => setField('merchize_product_title', e.target.value)}
                placeholder="Use Browse to select a product" className={inputCls} />
                <button type="button" onClick={() => setShowMerchizePicker(true)}
                className="shrink-0 inline-flex items-center gap-1.5 bg-kinetic px-4 py-3 font-heading uppercase text-void text-sm hover:bg-fog transition-colors rounded-[6px] whitespace-nowrap">
                  Browse
                </button>
              </div>
            </div>
            <div>
              <label className={labelCls}>VARIANT SKUS (BY SIZE)</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL'].map((size) => (
                  <div key={size}>
                    <span className="mono-label text-fog/40 text-[0.6rem] block mb-1">{size}</span>
                    <input value={form.merchize_variants?.[size] || ''}
                      onChange={(e) => setField('merchize_variants', { ...(form.merchize_variants || {}), [size]: e.target.value })}
                      placeholder="SKU" className="w-full bg-white text-black border border-steel rounded-[4px] px-2 py-2 text-xs focus:border-kinetic outline-none" />
                  </div>
                ))}
              </div>
            </div>
            <VariantMerchizeIdsEditor
              colors={form.colors}
              combos={form.name_number_combos}
              variantMerchizeIds={form.variant_merchize_ids}
              onChange={(ids) => setField('variant_merchize_ids', ids)}
              jerseyId={jerseyId}
              merchizeProductId={form.merchize_product_id}
              merchizeVariants={form.merchize_variants}
              colorArtwork={form.colors.reduce((acc, c) => {
                acc[c.name || 'Default'] = {
                  front: c.artwork_front || '',
                  back: c.artwork_back || '',
                  sleeve: c.artwork_sleeve || '',
                  hood: c.artwork_hood || '',
                };
                return acc;
              }, {})}
              nameStyle={form.name_style}
              numberStyle={form.number_style}
              customFontUrl={form.custom_font_url}
              customFontName={form.custom_font_name}
              fontId={form.font_id}
              enableName={form.enable_name}
              enableNumber={form.enable_number}
              artworkPosition={form.artwork_position}
              onPrimaryGenerated={({ merchize_product_id, merchize_product_title, merchize_variants }) => {
                setField('merchize_product_id', merchize_product_id);
                setField('merchize_product_title', merchize_product_title || '');
                setField('merchize_variants', merchize_variants);
              }}
            />
          </Section>

          {showMerchizePicker && (
            <MerchizeCatalogPicker
              onSelect={({ merchize_product_id, merchize_variants, productTitle }) => {
                setField('merchize_product_id', merchize_product_id);
                setField('merchize_product_title', productTitle || '');
                setField('merchize_variants', merchize_variants);
              }}
              onClose={() => setShowMerchizePicker(false)}
            />
          )}

          <div className="flex items-center gap-3">
            <button type="submit" disabled={saving}
            className="inline-flex items-center gap-2 bg-kinetic px-6 py-3 font-heading uppercase text-void hover:bg-fog transition-colors rounded-[6px] disabled:opacity-60">
              {jerseyId ? <><Save size={18} /> {saving ? 'Saving…' : 'Update jersey'}</> : <><Plus size={18} /> {saving ? 'Saving…' : 'Add to arsenal'}</>}
            </button>
            <Link to="/nexus-control" className="mono-label text-fog/50 hover:text-kinetic transition-colors px-4 py-3">
              CANCEL
            </Link>
          </div>
        </form>
      </div>

      {pendingGenerateId && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-steel rounded-[6px] p-6 max-w-sm space-y-4">
            <div className="font-heading text-fog text-sm uppercase">Generate products in Merchize?</div>
            <p className="mono-label text-fog/50 text-[0.65rem] leading-relaxed normal-case tracking-normal">
              Create Merchize products for this listing's variants now, or skip and generate later from the editor.
            </p>
            {genError && <p className="mono-label text-kinetic text-[0.65rem]">{genError}</p>}
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={runGenerate} disabled={generating}
                className="inline-flex items-center gap-1.5 bg-kinetic px-4 py-2 font-heading uppercase text-void text-xs hover:bg-fog transition-colors rounded-[4px] disabled:opacity-60">
                {generating ? 'Generating…' : 'Generate'}
              </button>
              <button type="button" onClick={() => navigate('/nexus-control')}
                className="mono-label text-fog/50 hover:text-fog transition-colors px-4 py-2 border border-steel rounded-[4px] text-xs">
                Skip
              </button>
            </div>
          </div>
        </div>
      )}
    </div>);

}