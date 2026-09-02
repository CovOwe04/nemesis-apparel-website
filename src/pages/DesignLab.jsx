import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '@/lib/CartContext';
import JerseyTemplate, { PATTERNS } from '@/components/designlab/JerseyTemplate';
import AssetUploader from '@/components/designlab/AssetUploader';
import PlacementLayer from '@/components/designlab/PlacementLayer';
import { ArrowLeft, Copy, Check, Trash2 } from 'lucide-react';

const MATERIALS = ['Polyester', 'Performance Mesh', 'Cotton', 'Silk', 'Tri-Blend'];
const SWATCHES = ['#FFFFFF', '#0A0A0A', '#FF1F3D', '#1E3A8A', '#15803D', '#F59E0B', '#6D28D9', '#DC2626'];
const CUSTOM_PRICE = 89;

let pid = 0;
const makeId = () => `pl-${Date.now()}-${pid++}`;

function ColorField({ label, value, onChange }) {
  return (
    <div>
      <div className="mono-label text-fog/50 mb-2">{label}</div>
      <div className="flex items-center gap-3 flex-wrap">
        <label className="relative w-10 h-10 border border-steel cursor-pointer overflow-hidden">
          <span className="absolute inset-0" style={{ backgroundColor: value }} />
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 opacity-0 cursor-pointer"
          />
        </label>
        <div className="flex flex-wrap gap-1.5">
          {SWATCHES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onChange(c)}
              className={`w-6 h-6 border ${value.toUpperCase() === c.toUpperCase() ? 'border-kinetic' : 'border-steel'}`}
              style={{ backgroundColor: c }}
              aria-label={c}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function DesignLab() {
  const { addItem } = useCart();
  const [primary, setPrimary] = useState('#FFFFFF');
  const [secondary, setSecondary] = useState('#FF1F3D');
  const [tertiary, setTertiary] = useState('#0A0A0A');
  const [pattern, setPattern] = useState('accent-sleeves');
  const [material, setMaterial] = useState('Polyester');
  const [logos, setLogos] = useState([]);
  const [icons, setIcons] = useState([]);
  const [placements, setPlacements] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [shirtSize, setShirtSize] = useState('M');
  const [copied, setCopied] = useState(false);
  const [added, setAdded] = useState(false);

  const addPlacement = (url, type) => {
    const id = makeId();
    setPlacements((p) => [...p, { id, url, type, x: 50, y: 45, scale: 1 }]);
    setSelectedId(id);
  };
  const updatePlacement = (id, patch) =>
    setPlacements((p) => p.map((pl) => (pl.id === id ? { ...pl, ...patch } : pl)));
  const deletePlacement = (id) => {
    setPlacements((p) => p.filter((pl) => pl.id !== id));
    setSelectedId((s) => (s === id ? null : s));
  };

  const patternLabel = (PATTERNS.find((p) => p.id === pattern) || {}).label || pattern;

  const buildBrief = () => {
    const lines = [
      'NEMESIS APPAREL — CUSTOM JERSEY DESIGN BRIEF',
      '-------------------------------------------',
      `Base (Primary):      ${primary}`,
      `Accent (Secondary):  ${secondary}`,
      `Accent 2 (Tertiary): ${tertiary}`,
      `Pattern: ${patternLabel}`,
      `Material: ${material}`,
      `Shirt Size: ${shirtSize}`,
      '',
      `Graphics on jersey (${placements.length}):`,
      ...placements.map(
        (pl, i) =>
          `  ${i + 1}. [${pl.type.toUpperCase()}] @ ${pl.x.toFixed(0)}%, ${pl.y.toFixed(0)}% (scale ${pl.scale.toFixed(2)}) — ${pl.url}`
      ),
      '',
      'Logos uploaded:',
      ...(logos.length ? logos.map((u) => `  - ${u}`) : ['  (none)']),
      'Icons uploaded:',
      ...(icons.length ? icons.map((u) => `  - ${u}`) : ['  (none)']),
    ];
    return lines.join('\n');
  };

  const copyBrief = async () => {
    try {
      await navigator.clipboard.writeText(buildBrief());
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  const handleAdd = () => {
    const designKey = [
      primary, secondary, tertiary, pattern, material, shirtSize,
      ...placements.map((p) => `${p.type}:${p.url}:${p.x},${p.y},${p.scale}`),
    ].join('|');
    addItem({
      jerseyId: 'custom-design',
      name: 'Custom Design',
      team: 'Custom Build',
      price: CUSTOM_PRICE,
      front_image: '',
      back_image: '',
      customName: 'CUSTOM DESIGN',
      font: '',
      size: 0,
      curve: 0,
      shirtSize,
      isCustomDesign: true,
      designKey,
      designSpec: {
        pattern: patternLabel,
        material,
        primary,
        secondary,
        tertiary,
        placements: placements.length,
      },
      quantity: 1,
    });
    setAdded(true);
    setTimeout(() => {
      window.location.href = '/cart';
    }, 700);
  };

  return (
    <div className="bg-void min-h-screen">
      <div className="border-b border-steel">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 py-5 flex items-center justify-between">
          <Link
            to="/arsenal"
            className="mono-label text-fog/60 hover:text-kinetic inline-flex items-center gap-2 transition-colors"
          >
            <ArrowLeft size={14} /> ARSENAL
          </Link>
          <div className="mono-label text-kinetic">DESIGN LAB</div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-5 sm:px-8 py-8 grid gap-10 lg:grid-cols-2 lg:gap-14">
        {/* CANVAS */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <div
            className="relative mx-auto max-w-md aspect-[3/4] border border-steel bg-steel overflow-hidden"
            onClick={() => setSelectedId(null)}
          >
            <JerseyTemplate
              primary={primary}
              secondary={secondary}
              tertiary={tertiary}
              pattern={pattern}
            />
            <PlacementLayer
              placements={placements}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onUpdate={updatePlacement}
              onDelete={deletePlacement}
            />
          </div>
          <div className="mt-4 text-center mono-label text-fog/40">
            DRAG GRAPHICS TO POSITION · CORNER HANDLE TO RESIZE
          </div>
        </div>

        {/* CONTROLS */}
        <div className="flex flex-col gap-7">
          <div>
            <div className="mono-label text-fog/40 mb-1">CUSTOM BUILD — {material.toUpperCase()}</div>
            <h1 className="font-heading text-3xl sm:text-4xl uppercase text-fog leading-tight">
              Design your own jersey
            </h1>
            <p className="mt-3 text-fog/60 leading-relaxed">
              Start from a white template, dial your colors and pattern, drop in logos and icons,
              then hand the brief to our design team for a production-ready finish.
            </p>
          </div>

          <div className="h-px velocity-line opacity-60" />

          {/* COLORS */}
          <div className="flex flex-col gap-5">
            <ColorField label="PRIMARY (BASE)" value={primary} onChange={setPrimary} />
            <ColorField label="SECONDARY (ACCENT)" value={secondary} onChange={setSecondary} />
            <ColorField label="TERTIARY (ACCENT 2)" value={tertiary} onChange={setTertiary} />
          </div>

          {/* PATTERN */}
          <div>
            <div className="mono-label text-fog/50 mb-2">PATTERN</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {PATTERNS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPattern(p.id)}
                  className={`py-3 text-center mono-label border transition-colors ${
                    pattern === p.id
                      ? 'border-kinetic text-kinetic bg-kinetic/5'
                      : 'border-steel text-fog/70 hover:border-fog/40'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* MATERIAL */}
          <div>
            <div className="mono-label text-fog/50 mb-2">MATERIAL</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {MATERIALS.map((m) => (
                <button
                  key={m}
                  onClick={() => setMaterial(m)}
                  className={`py-3 text-center mono-label border transition-colors ${
                    material === m
                      ? 'border-kinetic text-kinetic bg-kinetic/5'
                      : 'border-steel text-fog/70 hover:border-fog/40'
                  }`}
                >
                  {m.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* SHIRT SIZE */}
          <div>
            <div className="mono-label text-fog/50 mb-2">SHIRT SIZE</div>
            <div className="grid grid-cols-5 gap-2">
              {['XS', 'S', 'M', 'L', 'XL'].map((s) => (
                <button
                  key={s}
                  onClick={() => setShirtSize(s)}
                  className={`py-3 text-center font-heading text-sm border transition-colors ${
                    shirtSize === s
                      ? 'border-kinetic text-kinetic bg-kinetic/5'
                      : 'border-steel text-fog/70 hover:border-fog/40'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="h-px velocity-line opacity-60" />

          {/* ASSETS */}
          <AssetUploader
            label="TEAM LOGOS"
            hint="CLICK TO PLACE"
            assets={logos}
            onUpload={(u) => setLogos((a) => [...a, u])}
            onSelect={(u) => addPlacement(u, 'logo')}
          />
          <AssetUploader
            label="ICONS"
            hint="CLICK TO PLACE"
            assets={icons}
            onUpload={(u) => setIcons((a) => [...a, u])}
            onSelect={(u) => addPlacement(u, 'icon')}
          />

          {/* PLACEMENTS LIST */}
          {placements.length > 0 && (
            <div>
              <div className="mono-label text-fog/50 mb-2">
                GRAPHICS ON JERSEY ({placements.length})
              </div>
              <div className="flex flex-col gap-2">
                {placements.map((pl, i) => (
                  <div key={pl.id} className="flex items-center gap-3 border border-steel p-2">
                    <div className="w-10 h-10 bg-steel overflow-hidden shrink-0">
                      <img src={pl.url} alt="" className="w-full h-full object-contain" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="mono-label text-fog/70">{pl.type.toUpperCase()} #{i + 1}</div>
                      <div className="mono-label text-fog/40">
                        {pl.x.toFixed(0)}%, {pl.y.toFixed(0)}% · {pl.scale.toFixed(2)}x
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedId(pl.id)}
                      className="mono-label text-fog/50 hover:text-kinetic px-2"
                    >
                      EDIT
                    </button>
                    <button
                      onClick={() => deletePlacement(pl.id)}
                      className="text-fog/40 hover:text-kinetic p-1"
                      aria-label="Remove graphic"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="border border-steel p-4 bg-steel/20">
            <p className="mono-label text-kinetic mb-2">DESIGN LAB ADVISORY</p>
            <p className="text-fog/60 text-sm leading-relaxed">
              Uploaded graphics are a guide for our design team. Final artwork may be reworked —
              repositioned, resized, or re-traced — to ensure clean, fast printing and
              production-ready output.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch gap-3">
            <button
              onClick={copyBrief}
              className="inline-flex items-center justify-center gap-2 border border-steel px-6 py-4 font-heading uppercase text-fog hover:border-kinetic hover:text-kinetic transition-colors"
            >
              {copied ? (
                <>
                  <Check size={18} /> Copied
                </>
              ) : (
                <>
                  <Copy size={18} /> Copy brief
                </>
              )}
            </button>
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
                <>Add to cart — ${CUSTOM_PRICE}</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}