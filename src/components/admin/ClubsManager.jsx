import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Image } from '@/components/ui/image';
import { Trash2, Plus, Save, X, Check, Link as LinkIcon, Users } from 'lucide-react';

const inputCls = "w-full bg-white text-black border border-steel rounded-[6px] px-4 py-3 placeholder:text-black/40 focus:border-kinetic outline-none transition-colors";
const labelCls = "mono-label text-fog/50 block mb-2";

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

const EMPTY_CLUB = {
  name: '', code: '', description: '', net_terms: '',
  jersey_ids: [],
};

export default function ClubsManager() {
  const [clubs, setClubs] = useState([]);
  const [jerseys, setJerseys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_CLUB);
  const [saving, setSaving] = useState(false);
  const [copiedCode, setCopiedCode] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [c, j] = await Promise.all([
        base44.entities.Club.list('-created_date', 100),
        base44.entities.Jersey.list('-created_date', 100),
      ]);
      setClubs(c || []);
      setJerseys((j || []).sort((a, b) => (a.sort_order ?? 9999) - (b.sort_order ?? 9999)));
    } catch {
      setClubs([]); setJerseys([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const startNew = () => {
    setForm({ ...EMPTY_CLUB, code: generateCode() });
    setEditing('new');
  };

  const startEdit = (club) => {
    setForm({ ...EMPTY_CLUB, ...club });
    setEditing(club.id);
  };

  const cancel = () => { setEditing(null); setForm(EMPTY_CLUB); };

  const copyLink = (code) => {
    const link = `${window.location.origin}/arsenal?club=${code}`;
    navigator.clipboard?.writeText(link);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const toggleListing = (jid) => {
    setForm((f) => {
      const ids = new Set(f.jersey_ids);
      if (ids.has(jid)) ids.delete(jid);
      else ids.add(jid);
      return { ...f, jersey_ids: [...ids] };
    });
  };

  const save = async (e) => {
    e.preventDefault();
    if (!form.name || !form.code) { alert('Name and code are required.'); return; }
    setSaving(true);
    try {
      const code = form.code.trim().toUpperCase();
      const previousClub = editing === 'new' ? null : clubs.find((club) => club.id === editing);
      const selectedDays = Number(form.net_terms.replace('net_', ''));
      const storedDurationDays = previousClub?.available_from && previousClub?.available_until
        ? (new Date(previousClub.available_until).getTime() - new Date(previousClub.available_from).getTime()) / (24 * 60 * 60 * 1000)
        : null;
      const storedPeriodMatches = !form.net_terms || !selectedDays ||
        (storedDurationDays !== null && Math.abs(storedDurationDays - selectedDays) < 0.01);
      const availabilityChanged = editing === 'new' ||
        previousClub?.net_terms !== form.net_terms ||
        (Boolean(form.net_terms) && (!previousClub?.available_from || !previousClub?.available_until || !storedPeriodMatches));
      let availableFrom = previousClub?.available_from || '';
      let availableUntil = previousClub?.available_until || '';
      if (!form.net_terms) {
        availableFrom = '';
        availableUntil = '';
      } else if (availabilityChanged) {
        const start = Date.now();
        const days = selectedDays;
        availableFrom = new Date(start).toISOString();
        availableUntil = Number.isFinite(days) && days > 0
          ? new Date(start + days * 24 * 60 * 60 * 1000).toISOString()
          : '';
      }

      const payload = {
        name: form.name,
        code,
        description: form.description || '',
        net_terms: form.net_terms || '',
        available_from: availableFrom,
        available_until: availableUntil,
        jersey_ids: form.jersey_ids || [],
      };

      const result = await base44.functions.invoke('save-club', {
        clubId: editing === 'new' ? undefined : editing,
        club: payload,
        passcode: sessionStorage.getItem('nemesis-admin-passcode') || '',
      });
      if (result.data?.error) throw new Error(result.data.error);
      if (!result.data?.id) throw new Error('Club was saved but no club ID was returned.');

      await load();
      cancel();
    } catch (err) {
      alert('Save failed: ' + (err?.message || 'unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const deleteClub = async (id, name) => {
    if (!confirm(`Delete club "${name}"? Its listings will remain but lose their club association.`)) return;
    try {
      const result = await base44.functions.invoke('delete-club', {
        clubId: id,
        passcode: sessionStorage.getItem('nemesis-admin-passcode') || '',
      });
      if (result.data?.error) throw new Error(result.data.error);
      await load();
    } catch (err) {
      alert('Delete failed: ' + (err?.message || 'unknown error'));
    }
  };

  if (editing) {
    const selectedIds = new Set(form.jersey_ids || []);
    return (
      <div className="max-w-3xl">
        <div className="flex items-center justify-between mb-6">
          <div className="mono-label text-kinetic">{editing === 'new' ? 'NEW CLUB' : 'EDIT CLUB'}</div>
          <button onClick={cancel} className="text-fog/50 hover:text-kinetic transition-colors"><X size={20} /></button>
        </div>
        <form onSubmit={save} className="space-y-5">
          <div className="border border-steel rounded-[6px] p-5 space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>CLUB NAME</label>
                <input value={form.name} onChange={(e) => setField('name', e.target.value)} placeholder="e.g. Nemesis Elite" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>CLUB CODE</label>
                <div className="flex gap-2">
                  <input value={form.code} onChange={(e) => setField('code', e.target.value.toUpperCase())} placeholder="ABCD1234" className={inputCls} />
                  <button type="button" onClick={() => setField('code', generateCode())}
                    className="shrink-0 mono-label bg-steel px-3 rounded-[6px] text-fog hover:text-kinetic transition-colors">
                    GEN
                  </button>
                </div>
              </div>
            </div>
            <div>
              <label className={labelCls}>DESCRIPTION</label>
              <textarea value={form.description} onChange={(e) => setField('description', e.target.value)} rows={2} placeholder="Short description shown on the club page…" className={`${inputCls} resize-none`} />
            </div>
            <div>
              <label className={labelCls}>AVAILABLE FOR</label>
              <select value={form.net_terms || ''} onChange={(e) => setField('net_terms', e.target.value)} className={inputCls}>
                <option value="">No expiry</option>
                <option value="net_15">15 days</option>
                <option value="net_30">30 days</option>
                <option value="net_60">60 days</option>
                <option value="net_90">90 days</option>
              </select>
            </div>
          </div>

          <div className="border border-steel rounded-[6px] p-5">
            <div className="mono-label text-kinetic mb-4 flex items-center gap-2"><Users size={14} /> ASSOCIATED LISTINGS</div>
            {jerseys.length === 0 ? (
              <p className="mono-label text-fog/30">No listings available. Create listings first.</p>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {jerseys.map((j) => (
                  <button type="button" key={j.id} onClick={() => toggleListing(j.id)}
                    className={`w-full flex items-center gap-3 border rounded-[6px] p-2.5 transition-colors text-left ${selectedIds.has(j.id) ? 'border-kinetic bg-kinetic/10' : 'border-steel hover:border-fog/30'}`}>
                    <div className="w-10 h-12 bg-steel shrink-0 overflow-hidden rounded-[3px]">
                      <Image src={j.front_image} alt={j.name} fittingType="fill" className="w-full h-full" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-heading text-fog text-xs uppercase truncate">{j.name}</div>
                      <div className="mono-label text-fog/40 text-[0.6rem]">{j.team} · {j.category || 'Jersey'}</div>
                    </div>
                    {selectedIds.has(j.id) && <Check size={16} className="text-kinetic shrink-0" />}
                  </button>
                ))}
              </div>
            )}
            <p className="mono-label text-fog/40 mt-3 text-[0.6rem]">{selectedIds.size} listing{selectedIds.size !== 1 ? 's' : ''} selected</p>
          </div>

          <div className="flex items-center gap-3">
            <button type="submit" disabled={saving}
              className="inline-flex items-center gap-2 bg-kinetic px-6 py-3 font-heading uppercase text-void hover:bg-fog transition-colors rounded-[6px] disabled:opacity-60">
              {saving ? 'Saving…' : <><Save size={18} /> {editing === 'new' ? 'Create club' : 'Update club'}</>}
            </button>
            <button type="button" onClick={cancel} className="mono-label text-fog/50 hover:text-kinetic transition-colors px-4 py-3">CANCEL</button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="mono-label text-kinetic">CLUBS — MANAGE & SHARE</div>
        <button onClick={startNew} className="btn-solid inline-flex items-center gap-2 px-5 py-2.5 mono-label">
          <Plus size={16} /> NEW CLUB
        </button>
      </div>
      {loading ? (
        <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="h-24 bg-steel animate-pulse rounded-[6px]" />)}</div>
      ) : clubs.length === 0 ? (
        <p className="mono-label text-fog/40">NO CLUBS YET. CREATE ONE TO START GROUPING LISTINGS.</p>
      ) : (
        <div className="space-y-3">
          {clubs.map((club) => {
            const count = (club.jersey_ids || []).length;
            return (
              <div key={club.id} className="border border-steel rounded-[6px] p-4 bg-void">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-heading text-fog text-sm uppercase">{club.name}</span>
                      <span className="mono-label text-[0.6rem] px-2 py-0.5 bg-steel/40 border border-steel rounded-[3px] text-fog/60">{club.code}</span>
                      {club.net_terms && <span className="mono-label text-kinetic text-[0.6rem]">{club.net_terms.replace('_', ' ').toUpperCase()}</span>}
                    </div>
                    {club.description && <p className="text-fog/40 text-xs mt-1 line-clamp-1">{club.description}</p>}
                    <div className="mono-label text-fog/40 mt-1.5 text-[0.6rem] flex items-center gap-2">
                      <Users size={11} /> {count} LISTING{count !== 1 ? 'S' : ''}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <button onClick={() => copyLink(club.code)}
                      className="btn-solid px-3 py-1.5 mono-label text-xs inline-flex items-center gap-1.5">
                      {copiedCode === club.code ? <Check size={12} /> : <LinkIcon size={12} />} {copiedCode === club.code ? 'COPIED' : 'LINK'}
                    </button>
                    <button onClick={() => startEdit(club)} className="mono-label text-fog/60 hover:text-kinetic text-xs border border-steel px-3 py-1.5 rounded-[6px] transition-colors">EDIT</button>
                    <button onClick={() => deleteClub(club.id, club.name)} className="p-1.5 text-fog/40 hover:text-kinetic transition-colors flex justify-center" aria-label={`Delete ${club.name}`}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
