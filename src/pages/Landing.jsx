import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import JerseyCard from '@/components/JerseyCard';
import InfoStrip from '@/components/InfoStrip';
import WeGetItDone from '@/components/WeGetItDone';
import WhyChooseUs from '@/components/WhyChooseUs';

const HERO_URL =
  'https://media.base44.com/images/public/6a95dbf0d98672e2f49452f4/a001f6046_240901_ROUNDNET-WORLDS-24_Corentin-Bureau_yellowballcult_581.jpg';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

export default function Landing() {
  const [featured, setFeatured] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.Jersey.list('-created_date', 50)
      .then((all) => {
        const f = (all || []).filter((j) => j.featured);
        setFeatured(f.length ? f.slice(0, 3) : (all || []).slice(0, 3));
      })
      .catch(() => setFeatured([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="bg-void">
      {/* HERO */}
      <section className="relative h-[92vh] min-h-[600px] overflow-hidden">
        <img
          src={HERO_URL}
          alt="Athlete celebrating mid-rally"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ objectPosition: '50% 0%', transform: 'scale(1.4)', transformOrigin: 'left top' }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(to bottom, rgba(120,120,120,0.28) 0%, rgba(120,120,120,0.14) 40%, rgba(120,120,120,0.5) 100%)',
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(to right, rgba(130,130,130,0.4) 0%, rgba(130,130,130,0.2) 45%, rgba(130,130,130,0.06) 100%)',
          }}
        />

        <div className="relative z-10 mx-auto flex h-full max-w-7xl flex-col justify-center px-5 sm:px-8">
          <motion.div
            initial="hidden"
            animate="show"
            variants={fadeUp}
            className="max-w-3xl"
          >
            <div className="mono-label text-kinetic mb-5 flex items-center gap-3">
              <span className="h-px w-10 bg-kinetic" /> JERSEYS DON'T HAVE TO BE A HEADACHE
            </div>
            <h1 className="font-heading text-5xl sm:text-7xl lg:text-8xl uppercase leading-[0.9] text-fog tracking-tight">
              For players
              <br />
              <span className="text-kinetic">beginner</span> to pro
            </h1>
            <p className="mt-6 max-w-xl text-fog/70 text-lg leading-relaxed">
              Nemesis Apparel builds jerseys for the modern competitor —
              breathable, intimidating, and built to move. Browse the arsenal, then
              stamp your identity on the back in the Lab.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Link
                to="/arsenal"
                className="group inline-flex items-center gap-3 bg-kinetic px-7 py-4 font-heading uppercase text-void hover:bg-fog transition-colors"
              >
                Enter the Arsenal
                <ArrowRight
                  size={18}
                  className="transition-transform group-hover:translate-x-1"
                />
              </Link>
            </div>
          </motion.div>
        </div>

        {/* velocity line bottom */}
        <div className="absolute bottom-0 left-0 right-0 velocity-line h-px opacity-80" />
      </section>

      {/* INFO STRIP */}
      <InfoStrip />

      {/* WE GET IT DONE */}
      <WeGetItDone />

      <section className="bg-kinetic py-8"/>

      {/* FEATURED ARSENAL */}
      <section className=" bg-void">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 py-12">
          <div className="flex items-end justify-between gap-6 mb-10">
            <div>
              <div className="mono-label text-kinetic mb-3">
                <span className="h-px w-10 bg-kinetic" /> ARSENAL
              </div>
              <h2 className="font-heading text-3xl sm:text-5xl uppercase leading-[0.95] text-fog">
                Featured jerseys
              </h2>
            </div>
            <Link
              to="/arsenal"
              className="mono-label hidden sm:inline-flex items-center gap-2 text-fog hover:text-kinetic transition-colors"
            >
              View all <ArrowRight size={14} />
            </Link>
          </div>

          {loading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="aspect-[3/4] bg-steel animate-pulse" />
              ))}
            </div>
          ) : featured.length === 0 ? (
            <p className="text-fog/50 mono-label">NO JERSEYS LOADED YET.</p>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((j) => (
                <JerseyCard key={j.id} jersey={j} />
              ))}
            </div>
          )}

          <Link
            to="/arsenal"
            className="mt-8 sm:hidden mono-label inline-flex items-center gap-2 text-kinetic"
          >
            View all <ArrowRight size={14} />
          </Link>
        </div>
      </section>

      <section className="bg-kinetic py-8 mt-5"/>

      {/* WHY CHOOSE US */}
      <WhyChooseUs />

      {/* CTA BAND */}
      <section className="border-t border-steel bg-kinetic">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 py-16 flex flex-col sm:flex-row items-center justify-between gap-6">
          <h2 className="font-heading text-2xl sm:text-4xl uppercase text-void leading-tight">
            Look like a threat. <br className="sm:hidden" />Play like one.
          </h2>
          <Link
            to="/design-lab"
            className="inline-flex items-center gap-3 bg-void px-7 py-4 font-heading uppercase text-fog hover:bg-steel transition-colors"
          >
            Build your jersey <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-steel bg-void">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 py-12">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <svg width="22" height="22" viewBox="0 0 28 28">
                <path d="M14 1 L27 14 L14 27 L1 14 Z" fill="#FF1F3D" />
                <path d="M14 8 L20 14 L14 20 L8 14 Z" fill="#0A0A0A" />
              </svg>
              <span className="font-heading text-fog">NEMESIS APPAREL</span>
            </div>
            <p className="mono-label text-fog/40">
              © {new Date().getFullYear()} NEMESIS APPAREL — JERSEYS DON'T HAVE TO BE A HEADACHE
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}