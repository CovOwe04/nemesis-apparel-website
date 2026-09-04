import { useState } from 'react';
import { Lock } from 'lucide-react';

const PASSCODE = 'nemesis2026';
const AUTH_KEY = 'nemesis-admin-auth';

export function useAdminAuth() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem(AUTH_KEY) === '1');
  const login = (code) => {
    if (code === PASSCODE) {
      sessionStorage.setItem(AUTH_KEY, '1');
      setAuthed(true);
      return true;
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

  const submit = (e) => {
    e.preventDefault();
    if (!onLogin(passcode)) {
      setError(true);
    }
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
          className="w-full bg-white text-black border border-steel rounded-[6px] px-4 py-3 font-display tracking-wider placeholder:text-black/40 focus:border-kinetic outline-none transition-colors"
        />
        {error && <p className="mt-2 mono-label text-kinetic">ACCESS DENIED</p>}
        <button
          type="submit"
          className="mt-5 w-full bg-kinetic px-6 py-3 font-heading uppercase text-void hover:bg-fog transition-colors rounded-[6px]"
        >
          Unlock
        </button>
      </form>
    </div>
  );
}