import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { Trash2, Plus, Save, X, Tag } from 'lucide-react';

const EMPTY_PROMO = {
  code: '', description: '', discount_type: 'percentage', discount_value: 10,
  jersey_id: '', active: true, start_date: '', end_date: '',
  min_order_value: 0, max_redemptions: 0, max_discount_value: 0,
};

/** @typedef {{
 * code: string;
 * description: string;
 * discount_type: string;
 * discount_value: number | string;
 * jersey_id: string;
 * active: boolean;
 * start_date: string;
 * end_date: string;
 * min_order_value: number | string;
 * max_redemptions: number | string;
 * max_discount_value: number | string;
 * }} PromoForm */

export default function PromoCodeManager() {
  const { toast } = useToast();
  const [promos, setPromos] = useState([]);
  const [jerseys, setJerseys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(/** @type {PromoForm} */ (EMPTY_PROMO));
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const passcode = sessionStorage.getItem('nemesis-admin-passcode') || '';
      const [promoRes, jerseyList] = await Promise.all([
        base44.functions.invoke('save-promo-code', { action: 'list', passcode }),
        base44.entities.Jersey.list('-created_date', 100),
      ]);
      setPromos(promoRes.data?.promos || []);
      setJerseys(jerseyList || []);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const startNew = () => { setForm(EMPTY_PROMO); setEditing('new'); };
  const startEdit = (promo) => { setForm({ ...EMPTY_PROMO, ...promo }); setEditing(promo.id); };
  const cancel = () => { setEditing(null); setForm(EMPTY_PROMO); };

  const save = async () => {
    if (!form.code || !form.discount_value || !form.jersey_id) {
      toast({
        title: 'Missing fields',
        description: 'Code, discount value, and jersey are required.',
        variant: 'destructive',
      });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        code: form.code.toUpperCase().trim(),
        discount_value: Number(form.discount_value),
        min_order_value: Number(form.min_order_value) || 0,
        max_redemptions: Number(form.max_redemptions) || 0,
        max_discount_value: Number(form.max_discount_value) || 0,
        start_date: form.start_date ? new Date(form.start_date).toISOString() : '',
        end_date: form.end_date ? new Date(form.end_date).toISOString() : '',
      };
      const passcode = sessionStorage.getItem('nemesis-admin-passcode') || '';
      const promoId = editing === 'new' ? undefined : editing;
      const res = await base44.functions.invoke('save-promo-code', {
        promoId, promo: payload, passcode,
      });
      if (res.data?.error) throw new Error(res.data.error);
      toast({
        title: 'Promo code saved',
        description: `${payload.code} has been ${editing === 'new' ? 'created' : 'updated'}.`,
      });
      cancel();
      fetchData();
    } catch (err) {
      toast({
        title: 'Save failed',
        description: err?.message || 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    if (!confirm('Delete this promo code?')) return;
    try {
      const passcode = sessionStorage.getItem('nemesis-admin-passcode') || '';
      const res = await base44.functions.invoke('save-promo-code', {
        promoId: id, action: 'delete', passcode,
      });
      if (res.data?.error) throw new Error(res.data.error);
      toast({ title: 'Promo code deleted' });
      fetchData();
    } catch (err) {
      toast({
        title: 'Delete failed',
        description: err?.message || 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const inputCls = "w-full bg-white text-black border border-steel rounded-[6px] px-3 py-2 text-sm placeholder:text-black/40 focus:border-kinetic outline-none transition-colors";
  const labelCls = "mono-label text-fog/50 block mb-1.5";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-steel border-t-kinetic rounded-full animate-spin" />
      </div>
    );
  }

  if (editing) {
    return (
      <div className="border border-steel rounded-[6px] p-5 max-w-2xl">
        <div className="flex items-center justify-between mb-4">
          <div className="mono-label text-kinetic">{editing === 'new' ? 'NEW PROMO CODE' : 'EDIT PROMO CODE'}</div>
          <button onClick={cancel} className="text-fog/50 hover:text-kinetic transition-colors"><X size={18} /></button>
        </div>
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>CODE</label>
              <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="SUMMER10" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>JERSEY (PER-ITEM)</label>
              <select value={form.jersey_id} onChange={(e) => setForm({ ...form, jersey_id: e.target.value })} className={inputCls}>
                <option value="">Select jersey…</option>
                {jerseys.map((j) => <option key={j.id} value={j.id}>{j.name} — {j.team}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className={labelCls}>DESCRIPTION</label>
            <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Summer club discount" className={inputCls} />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>DISCOUNT TYPE</label>
              <select value={form.discount_type} onChange={(e) => setForm({ ...form, discount_type: e.target.value })} className={inputCls}>
                <option value="percentage">Percentage (%)</option>
                <option value="flat">Flat Rate (USD)</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>DISCOUNT VALUE</label>
              <input type="number" min="0" value={form.discount_value} onChange={(e) => setForm({ ...form, discount_value: e.target.value })} className={inputCls} />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>START DATE</label>
              <input type="datetime-local" value={form.start_date ? form.start_date.slice(0, 16) : ''} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>END DATE</label>
              <input type="datetime-local" value={form.end_date ? form.end_date.slice(0, 16) : ''} onChange={(e) => setForm({ ...form, end_date: e.target.value })} className={inputCls} />
            </div>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>MIN ORDER VALUE</label>
              <input type="number" min="0" value={form.min_order_value} onChange={(e) => setForm({ ...form, min_order_value: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>MAX REDEMPTIONS (0=∞)</label>
              <input type="number" min="0" value={form.max_redemptions} onChange={(e) => setForm({ ...form, max_redemptions: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>MAX DISCOUNT (0=∞)</label>
              <input type="number" min="0" value={form.max_discount_value} onChange={(e) => setForm({ ...form, max_discount_value: e.target.value })} className={inputCls} />
            </div>
          </div>
          <div className="flex items-center gap-3 pt-2">
            <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 bg-kinetic px-5 py-2.5 font-heading uppercase text-void hover:bg-fog transition-colors rounded-[6px] disabled:opacity-60">
              <Save size={16} /> {saving ? 'Saving…' : 'Save'}
            </button>
            <button onClick={cancel} className="mono-label text-fog/50 hover:text-kinetic transition-colors px-4 py-2.5">CANCEL</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="mono-label text-fog/50">{promos.length} PROMO CODES</div>
        <button onClick={startNew} className="inline-flex items-center gap-2 bg-kinetic px-4 py-2 font-heading uppercase text-void hover:bg-fog transition-colors rounded-[6px]">
          <Plus size={16} /> New Code
        </button>
      </div>
      {promos.length === 0 ? (
        <div className="py-20 text-center">
          <Tag size={32} className="text-steel mx-auto mb-3" />
          <p className="mono-label text-fog/50">NO PROMO CODES YET.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {promos.map((promo) => {
            const jersey = jerseys.find((j) => j.id === promo.jersey_id);
            return (
              <div key={promo.id} className="border border-steel rounded-[6px] p-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <span className="font-heading text-lg uppercase text-fog">{promo.code}</span>
                    <span className={`mono-label px-2 py-0.5 rounded-[3px] ${promo.active ? 'bg-kinetic/20 text-kinetic' : 'bg-steel/40 text-fog/40'}`}>
                      {promo.active ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </div>
                  <div className="mono-label text-fog/50 mt-1">
                    {promo.discount_type === 'percentage' ? `${promo.discount_value}% off` : `$${promo.discount_value} off`} · {jersey?.name || 'Unknown jersey'} · Used {promo.times_used || 0}x
                  </div>
                  {promo.description && <p className="text-fog/40 text-xs mt-1">{promo.description}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => startEdit(promo)} className="mono-label text-fog/50 hover:text-kinetic transition-colors px-3 py-2 border border-steel rounded-[6px]">EDIT</button>
                  <button onClick={() => remove(promo.id)} className="text-fog/40 hover:text-kinetic transition-colors p-2"><Trash2 size={16} /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}