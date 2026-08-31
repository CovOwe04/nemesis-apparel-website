import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Image } from '@/components/ui/image';
import { useCart } from '@/lib/CartContext';
import { ArrowLeft, Plus, Minus, Check } from 'lucide-react';

const FONTS = [
  { id: 'block', label: 'BLOCK', family: "'Archivo Black', sans-serif" },
  { id: 'condensed', label: 'CONDENSED', family: "'Anton', sans-serif" },
  { id: 'athletic', label: 'ATHLETIC', family: "'Oswald', sans-serif" },
];

export default function IdentityLab() {
  const { jerseyId } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();

  const [jersey, setJersey] = useState(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [fontId, setFontId] = useState('block');
  const [size, setSize] = useState(50);
  const [curve, setCurve] = useState(0);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    base44.entities.Jersey.get(jerseyId)
      .then((j) => {
        setJersey(j);
        if (j && !j.enable_customization) {
          // keep defaults but lock controls
        }
      })
      .catch(() => setJersey(null))
      .finally(() => setLoading(false));
  }, [jerseyId]);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center bg-void">
        <div className="w-8 h-8 border-2 border-steel border-t-kinetic rounded-full animate-spin" />
      </div>
    );
  }
  if (!jersey) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 bg-void px-5 text-center">
        <p className="font-heading text-2xl uppercase text-fog">Jersey not found</p>
        <Link to="/arsenal" className="mono-label text-kinetic">← BACK TO ARSENAL</Link>
      </div>
    );
  }

  const font = FONTS.find((f) => f.id === fontId) || FONTS[0];
  const canCustomize = !!jersey.enable_customization;
  const fontSize = 20 + (size / 100) * 46; // 20px → 66px
  const curveAmount = (curve / 100) * 70; // 0 → 70
  const rotation = (curve - 50) / 50 * 3; // -3° → 3°
  const pathD = `M 40 ${92 + curveAmount / 2} Q 150 ${92 - curveAmount} 260 ${92 + curveAmount / 2}`;
  const displayName = (canCustomize ? name : '').toUpperCase() || (canCustomize ? 'YOUR NAME' : '');

  const handleAdd = () => {
    addItem({
      jerseyId: jersey.id,
      name: jersey.name,
      team: jersey.team,
      price: jersey.price,
      front_image: jersey.front_image,
      back_image: jersey.back_image,
      customName: canCustomize ? name.toUpperCase() : '',
      font: canCustomize ? fontId : '',
      size: canCustomize ? size : 0,
      curve: canCustomize ? curve : 0,
      quantity: qty,
    });
    setAdded(true);
    setTimeout(() => navigate('/cart'), 700);
  };

  return (
    <div className="bg-void min-h-screen">
      {/* Top bar */}
      <div className="border-b border-steel">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 py-5 flex items-center justify-between">
          <Link to="/arsenal" className="mono-label text-fog/60 hover:text-kinetic inline-flex items-center gap-2 transition-colors">
            <ArrowLeft size={14} /> ARSENAL
          </Link>
          <div className="mono-label text-kinetic">// IDENTITY LAB</div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-5 sm:px-8 py-8 grid gap-10 lg:grid-cols-2 lg:gap-14">
        {/* CANVAS */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <div
            className="relative mx-auto max-w-md"
            style={{ transform: `rotate(${rotation}deg)`, transition: 'transform 0.25s ease-out' }}
          >
            <div className="relative aspect-[3/4] overflow-hidden bg-steel">
              <Image
                src={jersey.back_image}
                alt={`${jersey.name} back — customizer canvas`}
                fittingType="fill"
                className="w-full h-full"
              />
              {canCustomize && (
                <svg
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  viewBox="0 0 300 400"
                  preserveAspectRatio="xMidYMid meet"
                >
                  <defs>
                    <path id="name-arc" d={pathD} fill="none" />
                  </defs>
                  <text
                    fontFamily={font.family}
                    fontSize={fontSize}
                    fill="#F5F5F7"
                    stroke="#0A0A0A"
                    strokeWidth="1.4"
                    paintOrder="stroke fill"
                    letterSpacing="1.5"
                    style={{ textTransform: 'uppercase' }}
                  >
                    <textPath href="#name-arc" startOffset="50%" textAnchor="middle">
                      {displayName}
                    </textPath>
                  </text>
                </svg>
              )}
            </div>
          </div>
          <div className="mt-4 text-center mono-label text-fog/40">
            {canCustomize ? 'LIVE PREVIEW — UPPER BACK' : 'CUSTOMIZATION DISABLED FOR THIS KIT'}
          </div>
        </div>

        {/* CONTROLS */}
        <div className="flex flex-col gap-7">
          <div>
            <div className="mono-label text-fog/40 mb-1">{jersey.team} — {jersey.fitting} FIT</div>
            <h1 className="font-heading text-3xl sm:text-4xl uppercase text-fog leading-tight">
              {jersey.name}
            </h1>
            {jersey.description && (
              <p className="mt-3 text-fog/60 leading-relaxed">{jersey.description}</p>
            )}
          </div>

          <div className="h-px velocity-line opacity-60" />

          {!canCustomize ? (
            <div className="border border-steel p-5">
              <p className="mono-label text-kinetic mb-2">// LAB LOCKED</p>
              <p className="text-fog/60 text-sm">
                This kit ships as-is without name customization. Add it to your cart plain,
                or pick a Lab-enabled kit from the arsenal.
              </p>
            </div>
          ) : (
            <>
              {/* NAME */}
              <div>
                <label htmlFor="name-input" className="mono-label text-fog/50 block mb-2">
                  NAME
                </label>
                <input
                  id="name-input"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value.slice(0, 12))}
                  placeholder="ENTER NAME"
                  className="w-full bg-transparent border border-steel px-4 py-3 font-display text-lg uppercase tracking-wider text-fog placeholder:text-fog/30 focus:border-kinetic outline-none transition-colors"
                />
                <div className="mono-label text-fog/30 mt-1 text-right">
                  {name.length}/12
                </div>
              </div>

              {/* FONT */}
              <div>
                <div className="mono-label text-fog/50 mb-2">FONT</div>
                <div className="grid grid-cols-3 gap-2">
                  {FONTS.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setFontId(f.id)}
                      style={{ fontFamily: f.family }}
                      className={`py-4 text-center uppercase tracking-wide border transition-colors ${
                        fontId === f.id
                          ? 'border-kinetic text-kinetic bg-kinetic/5'
                          : 'border-steel text-fog/70 hover:border-fog/40'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* SIZE */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="mono-label text-fog/50">SIZE</span>
                  <span className="mono-label text-kinetic">{size}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={size}
                  onChange={(e) => setSize(Number(e.target.value))}
                  className="w-full"
                  aria-label="Name size"
                />
              </div>

              {/* CURVE */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="mono-label text-fog/50">ARCH CURVE</span>
                  <span className="mono-label text-kinetic">{curve}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={curve}
                  onChange={(e) => setCurve(Number(e.target.value))}
                  className="w-full"
                  aria-label="Name arch curvature"
                />
              </div>
            </>
          )}

          <div className="h-px velocity-line opacity-60" />

          {/* QTY + ADD */}
          <div className="flex items-center gap-4">
            <div className="flex items-center border border-steel">
              <button
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="p-3 text-fog hover:text-kinetic transition-colors"
                aria-label="Decrease quantity"
              >
                <Minus size={16} />
              </button>
              <span className="w-10 text-center font-heading text-fog">{qty}</span>
              <button
                onClick={() => setQty((q) => q + 1)}
                className="p-3 text-fog hover:text-kinetic transition-colors"
                aria-label="Increase quantity"
              >
                <Plus size={16} />
              </button>
            </div>
            <button
              onClick={handleAdd}
              disabled={added}
              className="flex-1 inline-flex items-center justify-center gap-2 bg-kinetic px-6 py-4 font-heading uppercase text-void hover:bg-fog transition-colors disabled:opacity-70"
            >
              {added ? (
                <>
                  <Check size={18} /> Added — heading to cart
                </>
              ) : (
                <>Add to cart — ${jersey.price}</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}