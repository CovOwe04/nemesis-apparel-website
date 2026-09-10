import { useState } from 'react';
import { Lock, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const AUTH_KEY = 'nemesis-admin-auth';

export function useAdminAuth() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem(AUTH_KEY) === '1');
  const login = async (code) => {
    try {
      const res = await base44.functions.invoke('verify-admin-passcode', { passcode: code });
      if (res.data?.valid) {
        sessionStorage.setItem(AUTH_KEY, '1');
        setAuthed(true);
        return true;
      }
    } catch {
      // ignore
    }
    return false;
  };
  const logout = () => {
    sessionStorage.removeItem(AUTH_KEY);
    setAuthed(false);
  };
  return { authed, login, logout };
}

export default function AdminLogin({ onLogin }) {
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const ok = await onLogin(passcode);
    if (!ok) setError(true);
    setLoading(false);
  };

  return (
    <div className="bg-void min-h-[80vh] flex items-center justify-center px-5">
      <form onSubmit={submit} className="w-full max-w-sm border border-steel p-8 rounded-[6px]">
        <div className="flex items-center gap-2 mb-6">
          <Lock size={20} className="text-kinetic" />
          <span className="mono-label text-kinetic">NEXUS CONTROL</span>
        </div>
        <h1 className="font-heading text-2xl uppercase text-fog mb-1">Admin access</h1>
        <p className="text-fog/50 text-sm mb-6">Restricted. Enter passcode to manage inventory and orders.</p>
        <input
          type="password"
          value={passcode}
          onChange={(e) => { setPasscode(e.target.value); setError(false); }}
          placeholder="PASSCODE"
          autoFocus
          disabled={loading}
          className="w-full bg-white text-black border border-steel rounded-[6px] px-4 py-3 font-display tracking-wider placeholder:text-black/40 focus:border-kinetic outline-none transition-colors disabled:opacity-60"
        />
        {error && <p className="mt-2 mono-label text-kinetic">ACCESS DENIED</p>}
        <button
          type="submit"
          disabled={loading}
          className="mt-5 w-full bg-kinetic px-6 py-3 font-heading uppercase text-void hover:bg-fog transition-colors rounded-[6px] disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : 'Unlock'}
        </button>
      </form>
    </div>
  );
}