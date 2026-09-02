import { useState } from 'react';
import { Link } from 'react-router-dom';
import JerseyTemplate, { PATTERNS } from '@/components/designlab/JerseyTemplate';
import AssetUploader from '@/components/designlab/AssetUploader';
import CanvasStage from '@/components/designlab/CanvasStage';
import { REGIONS_BY_PATTERN, DEFAULT_GEOMETRY } from '@/components/designlab/geometry';
import { ArrowLeft, Copy, Check, Trash2 } from 'lucide-react';

const MATERIALS = ['Polyester', 'Performance Mesh', 'Cotton', 'Silk', 'Tri-Blend'];
const SWATCHES = ['#FFFFFF', '#0A0A0A', '#FF1F3D', '#1E3A8A', '#15803D', '#F59E0B', '#6D28D9', '#DC2626'];
const PRESETS = [
  { name: 'BLACKOUT', primary: '#0A0A0A', secondary: '#FFFFFF', tertiary: '#FF1F3D', pattern: 'accent-sleeves', material: 'Polyester' },
  { name: 'BLOOD SPORT', primary: '#0A0A0A', secondary: '#FF1F3D', tertiary: '#FFFFFF', pattern: 'tri-tone', material: 'Performance Mesh' },
  { name: 'ICE', primary: '#FFFFFF', secondary: '#1E3A8A', tertiary: '#94A3B8', pattern: 'shoulder-stripe', material: 'Polyester' },
  { name: 'VOLTAGE', primary: '#FFFFFF', secondary: '#F59E0B', tertiary: '#0A0A0A', pattern: 'chest-band', material: 'Tri-Blend' },
  { name: 'STEALTH', primary: '#3F3F46', secondary: '#0A0A0A', tertiary: '#FF1F3D', pattern: 'side-panels', material: 'Cotton' },
  { name: 'COURT KING', primary: '#1E3A8A', secondary: '#FFFFFF', tertiary: '#F59E0B', pattern: 'tri-tone', material: 'Silk' },
];

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
  const [submitted, setSubmitted] = useState(false);
  const [geometry, setGeometry] = useState(DEFAULT_GEOMETRY);
  const [editMode, setEditMode] = useState(false);

  const applyPreset = (p) => {
    setPrimary(p.primary);
    setSecondary(p.secondary);
    setTertiary(p.tertiary);
    setPattern(p.pattern);
    setMaterial(p.material);
  };

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

  const editableRegions = REGIONS_BY_PATTERN[pattern] || [];
  const updateGeometry = (rid, region) => setGeometry((g) => ({ ...g, [rid]: region }));
  const resetFit = () =>
    setGeometry((g) => ({
      ...g,
      ...Object.fromEntries(editableRegions.map((rid) => [rid, DEFAULT_GEOMETRY[rid]])),
    }));

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

  const handleSubmit = () => {
    setSubmitted(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (submitted) {
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
        <div className="mx-auto max-w-3xl px-5 sm:px-8 py-12 flex flex-col items-center text-center">
          <div className="w-14 h-14 border-2 border-kinetic flex items-center justify-center mb-6">
            <Check size={28} className="text-kinetic" />
          </div>
          <h1 className="font-heading text-3xl sm:text-4xl uppercase text-fog">Design submitted</h1>
          <p className="mt-3 text-fog/60 max-w-md">
            Your custom jersey design has been sent to the Nemesis design team. A rep will review
            your brief and follow up to finalize production.
          </p>
          <div className="mt-8 relative w-56 aspect-[3/4] border border-steel bg-steel overflow-hidden">
            <JerseyTemplate
              primary={primary}
              secondary={secondary}
              tertiary={tertiary}
              pattern={pattern}
              geometry={geometry}
            />
          </div>
          <div className="mt-8 border border-steel p-4 bg-steel/20 max-w-md text-left w-full">
            <p className="mono-label text-kinetic mb-2">KEEP YOUR BRIEF</p>
            <p className="text-fog/60 text-sm leading-relaxed">
              Copy your design brief and save the details for your own records — our team may
              reference it during production.
            </p>
            <button
              onClick={copyBrief}
              className="mt-4 inline-flex items-center gap-2 bg-kinetic px-5 py-3 font-heading uppercase text-void hover:bg-fog transition-colors"
            >
              {copied ? (
                <>
                  <Check size={16} /> Copied
                </>
              ) : (
                <>
                  <Copy size={16} /> Copy brief
                </>
              )}
            </button>
          </div>
          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => setSubmitted(false)}
              className="mono-label border border-steel px-6 py-3 text-fog hover:border-kinetic hover:text-kinetic transition-colors"
            >
              EDIT DESIGN
            </button>
            <Link
              to="/arsenal"
              className="inline-flex items-center gap-2 bg-kinetic px-6 py-3 font-heading uppercase text-void hover:bg-fog transition-colors"
            >
              Back to arsenal
            </Link>
          </div>
        </div>
      </div>
    );
  }

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
          <CanvasStage
            primary={primary}
            secondary={secondary}
            tertiary={tertiary}
            pattern={pattern}
            placements={placements}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onUpdate={updatePlacement}
            onDelete={deletePlacement}
            onBackgroundClick={() => setSelectedId(null)}
            geometry={geometry}
            editMode={editMode}
            editableRegions={editableRegions}
            onGeometryChange={updateGeometry}
          />
          <div className="mt-4 text-center mono-label text-fog/40">
            {editMode
              ? 'DRAG BLUE CORNERS TO MOVE · BLUE DOTS TO CURVE EDGES · RESET TO RESTORE'
              : 'DRAG GRAPHICS TO POSITION · CORNER HANDLE TO RESIZE · SCROLL OR BUTTONS TO ZOOM · DRAG CANVAS TO PAN'}
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

          <div>
            <div className="mono-label text-fog/50 mb-2">PRESETS</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => applyPreset(p)}
                  className="flex items-center gap-2.5 py-3 px-3 border border-steel hover:border-kinetic transition-colors text-left"
                >
                  <span className="flex gap-px">
                    <span className="w-2.5 h-5" style={{ backgroundColor: p.primary }} />
                    <span className="w-2.5 h-5" style={{ backgroundColor: p.secondary }} />
                    <span className="w-2.5 h-5" style={{ backgroundColor: p.tertiary }} />
                  </span>
                  <span className="mono-label text-fog/70">{p.name}</span>
                </button>
              ))}
            </div>
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
            {editableRegions.length > 0 && (
              <div className="flex items-center gap-3 mt-3">
                <button
                  type="button"
                  onClick={() => setEditMode((v) => !v)}
                  className={`mono-label px-4 py-2 border transition-colors ${
                    editMode
                      ? 'border-kinetic text-kinetic bg-kinetic/5'
                      : 'border-steel text-fog/70 hover:border-fog/40'
                  }`}
                >
                  {editMode ? 'DONE ADJUSTING' : 'ADJUST FIT'}
                </button>
                {editMode && (
                  <button
                    type="button"
                    onClick={resetFit}
                    className="mono-label px-4 py-2 border border-steel text-fog/60 hover:border-kinetic hover:text-kinetic transition-colors"
                  >
                    RESET
                  </button>
                )}
              </div>
            )}
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

          <div className="border border-steel p-4 bg-steel/20">
            <p className="mono-label text-kinetic mb-2">SAVE YOUR DETAILS</p>
            <p className="text-fog/60 text-sm leading-relaxed">
              Copy your design brief and keep it for your records before submitting — our team may
              reference it during production.
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
              onClick={handleSubmit}
              className="flex-1 inline-flex items-center justify-center gap-2 bg-kinetic px-6 py-4 font-heading uppercase text-void hover:bg-fog transition-colors"
            >
              Submit design
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}