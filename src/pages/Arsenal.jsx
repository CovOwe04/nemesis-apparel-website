import { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import JerseyCard from '@/components/JerseyCard';
import { Search } from 'lucide-react';

export default function Arsenal() {
  const [jerseys, setJerseys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [accessCode, setAccessCode] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [currency, setCurrency] = useState(
    () => (typeof window !== 'undefined' && localStorage.getItem('nemesis-currency')) || 'USD'
  );

  useEffect(() => {
    localStorage.setItem('nemesis-currency', currency);
  }, [currency]);

  useEffect(() => {
    base44.entities.Jersey.list('-created_date', 100)
      .then((data) => setJerseys(data || []))
      .catch(() => setJerseys([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const now = new Date();
    return jerseys.filter((j) => {
      // Category filter
      if (category !== 'All' && (j.category || 'Jersey') !== category) return false;
      // Privacy: hide private jerseys unless access code matches
      if (j.is_private && j.private_access_code !== accessCode) return false;
      // Scheduling: hide if not yet available or expired
      if (j.available_from && new Date(j.available_from) > now) return false;
      if (j.available_until && new Date(j.available_until) < now) return false;
      // Search query
      if (q && !(j.name || '').toLowerCase().includes(q) && !(j.team || '').toLowerCase().includes(q)) return false;
      return true;
    });
  }, [jerseys, query, category, accessCode]);

  return (
    <div className="bg-void min-h-screen">
      {/* Header band */}
      <div className="border-b border-steel">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 py-12 sm:py-16">
          <div className="mono-label text-kinetic mb-3">THE ARSENAL</div>
          <h1 className="font-heading text-4xl sm:text-6xl uppercase leading-[0.9] text-fog">
            Browse Community Jerseys
          </h1>
          <p className="mt-4 text-fog/60 max-w-xl">
            From fan favourites to custom club kits — order your jersey today
          </p>
        </div>
      </div>

      {/* Search bar */}
        

      {/* Grid */}
      <div className="mx-auto max-w-7xl px-5 sm:px-8 pb-10">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 py-4 flex items-center gap-3">
          <div className="flex-1 flex items-center gap-3 bg-white border border-steel rounded-[6px] px-4 py-3">
            <Search size={18} className="text-black/50 shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search jerseys by name or team"
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

        {/* Category filter + club access code */}
        <div className="mx-auto max-w-7xl px-5 sm:px-8 pb-4 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 flex-wrap">
            {['All', 'Jersey', 'Long Sleeve', 'Hoodie', 'Bag', 'Hat'].map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`mono-label px-3 py-2 border rounded-[6px] transition-colors ${category === c ? 'bg-kinetic text-void border-kinetic' : 'border-steel text-fog/50 hover:text-fog'}`}
              >
                {c.toUpperCase()}
              </button>
            ))}
          </div>
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
        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="aspect-[3/4] bg-steel animate-pulse rounded-[12px]" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center">
            <p className="mono-label text-fog/50">NO JERSEYS MATCH YOUR SEARCH.</p>
          </div>
        ) : (
          <>
            <div className="mono-label text-fog/40 mb-6">
              {filtered.length} {filtered.length === 1 ? 'JERSEY' : 'JERSEYS'} AVAILABLE
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