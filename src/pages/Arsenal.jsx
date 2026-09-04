import { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import JerseyCard from '@/components/JerseyCard';
import { Search } from 'lucide-react';

export default function Arsenal() {
  const [jerseys, setJerseys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    base44.entities.Jersey.list('-created_date', 100)
      .then((data) => setJerseys(data || []))
      .catch(() => setJerseys([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return jerseys;
    return jerseys.filter(
      (j) =>
        (j.name || '').toLowerCase().includes(q) ||
        (j.team || '').toLowerCase().includes(q)
    );
  }, [jerseys, query]);

  return (
    <div className="bg-void min-h-screen">
      {/* Header band */}
      <div className="border-b border-steel">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 py-12 sm:py-16">
          <div className="mono-label text-kinetic mb-3">THE ARSENAL</div>
          <h1 className="font-heading text-4xl sm:text-6xl uppercase leading-[0.9] text-fog">
            Browse every jersey.
          </h1>
          <p className="mt-4 text-fog/60 max-w-xl">
            Search for your jersey. Hover any card to preview the back. Hit the Lab to
            stamp your name on it.
          </p>
        </div>
      </div>

      {/* Search bar */}
      <div className="sticky top-16 z-40 bg-void/95 backdrop-blur-sm border-b border-steel">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 py-4">
          <div className="flex items-center gap-3 bg-white border border-steel rounded-[6px] px-4 py-3">
            <Search size={18} className="text-black/50 shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search jerseys by name or team"
              className="flex-1 bg-transparent text-black placeholder:text-black/40 font-display uppercase tracking-wider text-sm outline-none"
            />
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="mx-auto max-w-7xl px-5 sm:px-8 py-10">
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
                <JerseyCard key={j.id} jersey={j} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}