import { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import JerseyCard from '@/components/JerseyCard';
import { SlidersHorizontal } from 'lucide-react';

const FITTINGS = ['Slim', 'Regular', 'Loose'];

function Pill({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`mono-label px-4 py-2 border transition-colors ${
        active
          ? 'bg-kinetic border-kinetic text-void'
          : 'border-steel text-fog/70 hover:border-fog/40 hover:text-fog'
      }`}
    >
      {children}
    </button>
  );
}

export default function Arsenal() {
  const [jerseys, setJerseys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [teamFilter, setTeamFilter] = useState('All');
  const [fittingFilter, setFittingFilter] = useState('All');

  useEffect(() => {
    base44.entities.Jersey.list('-created_date', 100)
      .then((data) => setJerseys(data || []))
      .catch(() => setJerseys([]))
      .finally(() => setLoading(false));
  }, []);

  const teams = useMemo(() => {
    const set = new Set((jerseys || []).map((j) => j.team).filter(Boolean));
    return ['All', ...Array.from(set)];
  }, [jerseys]);

  const filtered = useMemo(() => {
    return jerseys.filter((j) => {
      if (teamFilter !== 'All' && j.team !== teamFilter) return false;
      if (fittingFilter !== 'All' && j.fitting !== fittingFilter) return false;
      return true;
    });
  }, [jerseys, teamFilter, fittingFilter]);

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
            Filter by team and fit. Hover any card to preview the back. Hit the Lab to
            stamp your name on it.
          </p>
        </div>
      </div>

      {/* Sticky filter bar */}
      <div className="sticky top-16 z-40 bg-void/95 backdrop-blur-sm border-b border-steel">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 py-4">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <SlidersHorizontal size={16} className="text-kinetic shrink-0" />
              <span className="mono-label text-fog/50">TEAM</span>
              <div className="flex flex-wrap gap-2">
                {teams.map((t) => (
                  <Pill key={t} active={teamFilter === t} onClick={() => setTeamFilter(t)}>
                    {t}
                  </Pill>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <SlidersHorizontal size={16} className="text-kinetic shrink-0 invisible" />
              <span className="mono-label text-fog/50">FIT</span>
              <div className="flex flex-wrap gap-2">
                {['All', ...FITTINGS].map((f) => (
                  <Pill key={f} active={fittingFilter === f} onClick={() => setFittingFilter(f)}>
                    {f}
                  </Pill>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="mx-auto max-w-7xl px-5 sm:px-8 py-10">
        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="aspect-[3/4] bg-steel animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center">
            <p className="mono-label text-fog/50">NO JERSEYS MATCH YOUR FILTERS.</p>
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