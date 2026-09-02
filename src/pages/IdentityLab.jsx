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
  { id: 'tech', label: 'TECH', family: "'Space Grotesk', sans-serif" },
  { id: 'clean', label: 'CLEAN', family: "'Inter', sans-serif" },
];

export default function IdentityLab() {
  const { jerseyId } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();

  const [jersey, setJersey] = useState(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [fontId, setFontId] = useState('block');
  const [size, setSize] = useState(100);
  const [curve, setCurve] = useState(0);
  const [height, setHeight] = useState(42);
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
  // Size slider 0..100 → maps to 4px..44px (100% = the size that fits within the seams by the armpits)
  const baseSize = 4 + (size / 100) * 40; // 0% → 4px, 100% → 44px
  const curveAmount = (curve / 100) * 45; // 0 → 45
  const baselineY = 100 + (height / 100) * 50; // vertical position on the back (50px span)
  const ARC_WIDTH = 150; // 50% of canvas width — text stays within the seams
  const displayName = (canCustomize ? name : '').toUpperCase() || (canCustomize ? 'YOUR NAME' : '');
  // Word-wrap so the name stays inside the jersey seams at the chosen size.
  // Shrink only if a single word is too wide to fit; otherwise wrap onto more lines.
  const charFactor = 0.7;
  const words = displayName.split(' ').filter(Boolean);
  const longestWord = Math.max(...words.map((w) => w.length), 1);
  const fitForLongest = ARC_WIDTH / (longestWord * charFactor);
  const fontSize = Math.min(baseSize, fitForLongest);
  const lineHeight = fontSize * 1.15;
  const lines = [];
  let cur = '';
  for (const w of words) {
    const trial = cur ? `${cur} ${w}` : w;
    if (trial.length * fontSize * charFactor <= ARC_WIDTH) {
      cur = trial;
    } else {
      if (cur) lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  const numLines = Math.max(lines.length, 1);
  const startBase = baselineY - ((numLines - 1) / 2) * lineHeight;
  const linePath = (i) => {
    const y = startBase + i * lineHeight;
    return `M 75 ${y + curveAmount / 2} Q 150 ${y - curveAmount} 225 ${y + curveAmount / 2}`;
  };

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
          <div className="relative mx-auto max-w-md">
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
                    {lines.map((line, i) => (
                      <path key={i} id={`name-arc-${i}`} d={linePath(i)} fill="none" />
                    ))}
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
                    {lines.map((line, i) => (
                      <textPath key={i} href={`#name-arc-${i}`} startOffset="50%" textAnchor="middle">
                        {line}
                      </textPath>
                    ))}
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
                  onChange={(e) => setName(e.target.value.slice(0, 25))}
                  placeholder="ENTER NAME"
                  className="w-full bg-transparent border border-steel px-4 py-3 font-display text-lg uppercase tracking-wider text-fog placeholder:text-fog/30 focus:border-kinetic outline-none transition-colors"
                />
                <div className="mono-label text-fog/30 mt-1 text-right">
                  {name.length}/25
                </div>
              </div>

              {/* FONT */}
              <div>
                <div className="mono-label text-fog/50 mb-2">FONT</div>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
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
                <div className="mono-label text-fog/50 mb-2">SIZE</div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'SMALL', value: 30 },
                    { label: 'MEDIUM', value: 65 },
                    { label: 'LARGE', value: 100 },
                  ].map((opt) => (
                    <button
                      key={opt.label}
                      onClick={() => setSize(opt.value)}
                      className={`py-3 text-center mono-label border transition-colors ${
                        size === opt.value
                          ? 'border-kinetic text-kinetic bg-kinetic/5'
                          : 'border-steel text-fog/70 hover:border-fog/40'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* ARCH CURVE */}
              <div>
                <div className="mono-label text-fog/50 mb-2">ARCH CURVE</div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'STRAIGHT', value: 0 },
                    { label: 'MILD', value: 50 },
                    { label: 'STRONG', value: 100 },
                  ].map((opt) => (
                    <button
                      key={opt.label}
                      onClick={() => setCurve(opt.value)}
                      className={`py-3 text-center mono-label border transition-colors ${
                        curve === opt.value
                          ? 'border-kinetic text-kinetic bg-kinetic/5'
                          : 'border-steel text-fog/70 hover:border-fog/40'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* VERTICAL POSITION */}
              <div>
                <div className="mono-label text-fog/50 mb-2">VERTICAL POSITION</div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'HIGH', value: 0 },
                    { label: 'NORMAL', value: 50 },
                    { label: 'LOW', value: 100 },
                  ].map((opt) => (
                    <button
                      key={opt.label}
                      onClick={() => setHeight(opt.value)}
                      className={`py-3 text-center mono-label border transition-colors ${
                        height === opt.value
                          ? 'border-kinetic text-kinetic bg-kinetic/5'
                          : 'border-steel text-fog/70 hover:border-fog/40'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
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