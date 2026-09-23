import { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import JerseyCard from '@/components/JerseyCard';
import { Search } from 'lucide-react';

export default function Arsenal() {
  const [jerseys, setJerseys] = useState([]);
  const [club, setClub] = useState(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [currency, setCurrency] = useState(
    () => (typeof window !== 'undefined' && localStorage.getItem('nemesis-currency')) || 'USD'
  );

  const clubCode = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return new URLSearchParams(window.location.search).get('club') || '';
  }, []);

  useEffect(() => {
    localStorage.setItem('nemesis-currency', currency);
  }, [currency]);

  useEffect(() => {
    setLoading(true);
    base44.functions.invoke('get-arsenal-jerseys', { accessCode, clubCode })
      .then((res) => {
        setJerseys(res.data?.jerseys || []);
        setClub(res.data?.club || null);
      })
      .catch(() => { setJerseys([]); setClub(null); })
      .finally(() => setLoading(false));
  }, [accessCode, clubCode]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return jerseys.filter((j) => {
      if (q && !(j.name || '').toLowerCase().includes(q) && !(j.team || '').toLowerCase().includes(q)) return false;
      return true;
    });
  }, [jerseys, query]);

  return (
    <div className="bg-void min-h-screen">
      {/* Header band */}
      <div className="border-b border-steel">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 py-12 sm:py-16">
          <div className="mono-label text-kinetic mb-3">{club ? `${club.name.toUpperCase()}` : 'THE ARSENAL'}</div>
          <h1 className="font-heading text-4xl sm:text-6xl uppercase leading-[0.9] text-fog">
            {club ? club.name : 'Browse Community Listings'}
          </h1>
          <p className="mt-4 text-fog/60 max-w-xl">
            {club?.description || 'From fan favourites to custom club kits — order your jersey today'}
          </p>
        </div>
      </div>

      {/* Grid */}
      <div className="mx-auto max-w-7xl px-5 sm:px-8 pb-10">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 py-4 flex items-center gap-3">
          <div className="flex-1 flex items-center gap-3 bg-white border border-steel rounded-[6px] px-4 py-3">
            <Search size={18} className="text-black/50 shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search listings by name or team"
              className="flex-1 bg-transparent text-black placeholder:text-black/40 font-display uppercase tracking-wider text-sm outline-none"
            />
          </div>
          <div className="flex items-center gap-1 bg-steel/40 border border-steel rounded-[6px] p-1">
            <button
              onClick={() => setCurrency('USD')}
              className={`mono-label px-3 py-2 rounded-[6px] transition-colors ${currency === 'USD' ? 'bg-white text-black' : 'text-fog/60 hover:text-fog'}`}
            >
              USD
            </button>
            <button
              onClick={() => setCurrency('CAD')}
              className={`mono-label px-3 py-2 rounded-[6px] transition-colors ${currency === 'CAD' ? 'bg-white text-black' : 'text-fog/60 hover:text-fog'}`}
            >
              CAD
            </button>
          </div>
        </div>

        {/* Club access code (only when not viewing a club link) */}
        {!clubCode && (
          <div className="mx-auto max-w-7xl px-5 sm:px-8 pb-4 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 ml-auto">
              <input
                type="text"
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') setAccessCode(codeInput.trim()); }}
                placeholder="CLUB ACCESS CODE"
                className="bg-white text-black border border-steel rounded-[6px] px-3 py-2 mono-label placeholder:text-black/40 focus:border-kinetic outline-none w-44"
              />
              <button
                onClick={() => setAccessCode(codeInput.trim())}
                className="mono-label border border-steel px-3 py-2 rounded-[6px] text-fog/60 hover:text-kinetic hover:border-kinetic transition-colors"
              >
                UNLOCK
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="aspect-[3/4] bg-steel animate-pulse rounded-[12px]" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center">
            <p className="mono-label text-fog/50">NO LISTINGS MATCH YOUR SEARCH.</p>
          </div>
        ) : (
          <>
            <div className="mono-label text-fog/40 mb-6">
              {filtered.length} {filtered.length === 1 ? 'LISTING' : 'LISTINGS'} AVAILABLE
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((j) => (
                <JerseyCard key={j.id} jersey={j} currency={currency} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
