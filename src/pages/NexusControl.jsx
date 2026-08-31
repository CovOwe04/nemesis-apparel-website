import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Image } from '@/components/ui/image';
import { Upload, Trash2, Plus, Lock, ShieldCheck } from 'lucide-react';

const PASSCODE = 'nemesis2026';
const AUTH_KEY = 'nemesis-admin-auth';

const EMPTY_FORM = {
  name: '',
  team: '',
  fitting: 'Regular',
  price: '',
  description: '',
  front_image: '',
  back_image: '',
  enable_customization: true,
  featured: false,
};

function Toggle({ checked, onChange, label }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center justify-between w-full border border-steel px-4 py-3 hover:border-fog/40 transition-colors"
    >
      <span className="mono-label text-fog/70">{label}</span>
      <span
        className={`relative w-11 h-6 transition-colors ${checked ? 'bg-kinetic' : 'bg-steel'}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-void transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
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
    } catch {
      alert('Upload failed. Try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <div className="mono-label text-fog/50 mb-2">{label}</div>
      <label className="relative block aspect-[3/4] w-full max-w-[180px] border border-steel cursor-pointer overflow-hidden bg-steel hover:border-kinetic transition-colors">
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

export default function NexusControl() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem(AUTH_KEY) === '1');
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState(false);

  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [jerseys, setJerseys] = useState([]);
  const [loadingList, setLoadingList] = useState(true);

  const loadJerseys = () => {
    setLoadingList(true);
    base44.entities.Jersey.list('-created_date', 100)
      .then((d) => setJerseys(d || []))
      .catch(() => setJerseys([]))
      .finally(() => setLoadingList(false));
  };

  useEffect(() => {
    if (authed) loadJerseys();
  }, [authed]);

  const submitPasscode = (e) => {
    e.preventDefault();
    if (passcode === PASSCODE) {
      sessionStorage.setItem(AUTH_KEY, '1');
      setAuthed(true);
      setError(false);
    } else {
      setError(true);
    }
  };

  const logout = () => {
    sessionStorage.removeItem(AUTH_KEY);
    setAuthed(false);
    setPasscode('');
  };

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const createJersey = async (e) => {
    e.preventDefault();
    if (!form.name || !form.team || !form.price || !form.front_image || !form.back_image) {
      alert('Name, team, price, and both images are required.');
      return;
    }
    setSaving(true);
    try {
      await base44.entities.Jersey.create({
        ...form,
        price: Number(form.price),
      });
      setForm(EMPTY_FORM);
      loadJerseys();
    } catch (err) {
      alert('Create failed: ' + (err?.message || 'unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const deleteJersey = async (id, name) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await base44.entities.Jersey.delete(id);
      loadJerseys();
    } catch (err) {
      alert('Delete failed: ' + (err?.message || 'unknown error'));
    }
  };

  if (!authed) {
    return (
      <div className="bg-void min-h-[80vh] flex items-center justify-center px-5">
        <form
          onSubmit={submitPasscode}
          className="w-full max-w-sm border border-steel p-8"
        >
          <div className="flex items-center gap-2 mb-6">
            <Lock size={20} className="text-kinetic" />
            <span className="mono-label text-kinetic">// NEXUS CONTROL</span>
          </div>
          <h1 className="font-heading text-2xl uppercase text-fog mb-1">Admin access</h1>
          <p className="text-fog/50 text-sm mb-6">Restricted. Enter passcode to manage inventory.</p>
          <input
            type="password"
            value={passcode}
            onChange={(e) => {
              setPasscode(e.target.value);
              setError(false);
            }}
            placeholder="PASSCODE"
            autoFocus
            className="w-full bg-transparent border border-steel px-4 py-3 font-display tracking-wider text-fog placeholder:text-fog/30 focus:border-kinetic outline-none transition-colors"
          />
          {error && <p className="mt-2 mono-label text-kinetic">ACCESS DENIED</p>}
          <button
            type="submit"
            className="mt-5 w-full bg-kinetic px-6 py-3 font-heading uppercase text-void hover:bg-fog transition-colors"
          >
            Unlock
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="bg-void min-h-screen">
      <div className="border-b border-steel">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 py-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck size={20} className="text-kinetic" />
            <h1 className="font-heading text-xl uppercase text-fog">Nexus Control</h1>
          </div>
          <button onClick={logout} className="mono-label text-fog/50 hover:text-kinetic transition-colors">
            LOCK
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-5 sm:px-8 py-8 grid gap-10 lg:grid-cols-12">
        {/* Create form */}
        <div className="lg:col-span-7">
          <div className="mono-label text-kinetic mb-3">// ADD NEW KIT</div>
          <form onSubmit={createJersey} className="space-y-5">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="mono-label text-fog/50 block mb-2">JERSEY NAME</label>
                <input
                  value={form.name}
                  onChange={(e) => setField('name', e.target.value)}
                  placeholder="e.g. Nemesis Blackout"
                  className="w-full bg-transparent border border-steel px-4 py-3 text-fog placeholder:text-fog/30 focus:border-kinetic outline-none transition-colors"
                />
              </div>
              <div>
                <label className="mono-label text-fog/50 block mb-2">TEAM</label>
                <input
                  value={form.team}
                  onChange={(e) => setField('team', e.target.value)}
                  placeholder="e.g. Nemesis"
                  className="w-full bg-transparent border border-steel px-4 py-3 text-fog placeholder:text-fog/30 focus:border-kinetic outline-none transition-colors"
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="mono-label text-fog/50 block mb-2">FITTING</label>
                <select
                  value={form.fitting}
                  onChange={(e) => setField('fitting', e.target.value)}
                  className="w-full bg-void border border-steel px-4 py-3 text-fog focus:border-kinetic outline-none transition-colors"
                >
                  <option value="Slim">Slim</option>
                  <option value="Regular">Regular</option>
                  <option value="Loose">Loose</option>
                </select>
              </div>
              <div>
                <label className="mono-label text-fog/50 block mb-2">PRICE (USD)</label>
                <input
                  type="number"
                  min="0"
                  value={form.price}
                  onChange={(e) => setField('price', e.target.value)}
                  placeholder="64"
                  className="w-full bg-transparent border border-steel px-4 py-3 text-fog placeholder:text-fog/30 focus:border-kinetic outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="mono-label text-fog/50 block mb-2">DESCRIPTION</label>
              <textarea
                value={form.description}
                onChange={(e) => setField('description', e.target.value)}
                rows={2}
                placeholder="Short kit description…"
                className="w-full bg-transparent border border-steel px-4 py-3 text-fog placeholder:text-fog/30 focus:border-kinetic outline-none transition-colors resize-none"
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <ImageUpload label="FRONT IMAGE" value={form.front_image} onChange={(v) => setField('front_image', v)} />
              <ImageUpload label="BACK IMAGE (BLANK)" value={form.back_image} onChange={(v) => setField('back_image', v)} />
            </div>

            <Toggle checked={form.enable_customization} onChange={(v) => setField('enable_customization', v)} label="ENABLE IDENTITY LAB" />
            <Toggle checked={form.featured} onChange={(v) => setField('featured', v)} label="FEATURE ON LANDING" />

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 bg-kinetic px-6 py-3 font-heading uppercase text-void hover:bg-fog transition-colors disabled:opacity-60"
            >
              <Plus size={18} /> {saving ? 'Saving…' : 'Add to arsenal'}
            </button>
          </form>
        </div>

        {/* Inventory list */}
        <div className="lg:col-span-5">
          <div className="mono-label text-kinetic mb-3">// INVENTORY ({jerseys.length})</div>
          {loadingList ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-20 bg-steel animate-pulse" />
              ))}
            </div>
          ) : jerseys.length === 0 ? (
            <p className="mono-label text-fog/40">NO KITS IN INVENTORY.</p>
          ) : (
            <div className="space-y-3">
              {jerseys.map((j) => (
                <div key={j.id} className="flex items-center gap-3 border border-steel p-3">
                  <div className="w-12 h-16 bg-steel shrink-0 overflow-hidden">
                    <Image src={j.front_image} alt={j.name} fittingType="fill" className="w-full h-full" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-heading text-fog text-sm truncate">{j.name}</div>
                    <div className="mono-label text-fog/40 mt-0.5">
                      {j.team} · {j.fitting} · ${j.price}
                    </div>
                    <div className="flex gap-2 mt-1">
                      {j.enable_customization && (
                        <span className="mono-label text-kinetic">LAB</span>
                      )}
                      {j.featured && <span className="mono-label text-fog/50">FEATURED</span>}
                    </div>
                  </div>
                  <button
                    onClick={() => deleteJersey(j.id, j.name)}
                    className="p-2 text-fog/40 hover:text-kinetic transition-colors"
                    aria-label={`Delete ${j.name}`}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}