import { useState } from 'react';
import { Link } from 'react-router-dom';
import JerseyTemplate, { PATTERNS, TEMPLATE_URL, BACK_TEMPLATE_URL } from '@/components/designlab/JerseyTemplate';
import AssetUploader from '@/components/designlab/AssetUploader';
import CanvasStage from '@/components/designlab/CanvasStage';
import { useDesignState } from '@/components/designlab/useDesignState';
import { REGION_TO_PATTERN } from '@/components/designlab/geometry';
import { ArrowLeft, Copy, Check, Trash2 } from 'lucide-react';

const MATERIALS = ['Polyester', 'Performance Mesh', 'Cotton', 'Silk', 'Tri-Blend'];
const PRESETS = [
  { name: 'BLACKOUT', primary: '#0A0A0A', secondary: '#FFFFFF', tertiary: '#FF1F3D', patterns: ['accent-sleeves'], material: 'Polyester' },
  { name: 'BLOOD SPORT', primary: '#0A0A0A', secondary: '#FF1F3D', tertiary: '#FFFFFF', patterns: ['accent-sleeves', 'chest-band'], material: 'Performance Mesh' },
  { name: 'ICE', primary: '#FFFFFF', secondary: '#1E3A8A', tertiary: '#94A3B8', patterns: ['shoulder-stripe'], material: 'Polyester' },
  { name: 'VOLTAGE', primary: '#FFFFFF', secondary: '#F59E0B', tertiary: '#0A0A0A', patterns: ['chest-band'], material: 'Tri-Blend' },
  { name: 'STEALTH', primary: '#3F3F46', secondary: '#0A0A0A', tertiary: '#FF1F3D', patterns: ['side-panels'], material: 'Cotton' },
  { name: 'COURT KING', primary: '#1E3A8A', secondary: '#FFFFFF', tertiary: '#F59E0B', patterns: ['accent-sleeves', 'chest-band'], material: 'Silk' },
];

function ColorField({ label, value, onChange }) {
  return (
    <label className="flex flex-col gap-2 cursor-pointer group">
      <div className="mono-label text-fog/50">{label}</div>
      <span className="relative w-full h-12 border border-steel group-hover:border-kinetic transition-colors overflow-hidden">
        <span className="absolute inset-0" style={{ backgroundColor: value }} />
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 opacity-0 cursor-pointer"
        />
      </span>
    </label>
  );
}

export default function DesignLab() {
  // Two independent design states — front and back are fully separate.
  const frontDesign = useDesignState();
  const backDesign = useDesignState();
  const [activeSide, setActiveSide] = useState('front');
  const design = activeSide === 'front' ? frontDesign : backDesign;

  // Shared state (not side-specific)
  const [material, setMaterial] = useState('Polyester');
  const [logos, setLogos] = useState([]);
  const [icons, setIcons] = useState([]);
  const [shirtSize, setShirtSize] = useState('M');
  const [quantity, setQuantity] = useState(1);
  const [copied, setCopied] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [confirming, setConfirming] = useState(false);

  // UI state (shared, reset on side switch)
  const [editMode, setEditMode] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedRegionId, setSelectedRegionId] = useState(null);
  const [ctxMenu, setCtxMenu] = useState(null);

  const switchSide = (side) => {
    if (side === activeSide) return;
    setSelectedId(null);
    setSelectedRegionId(null);
    setCtxMenu(null);
    setActiveSide(side);
  };

  const handleApplyPreset = (p) => {
    design.applyPreset(p);
    setMaterial(p.material);
    setSelectedRegionId(null);
  };

  const handleAddPlacement = (url, type) => {
    const id = design.addPlacement(url, type);
    setSelectedId(id);
  };

  const handleDeletePlacement = (id) => {
    design.deletePlacement(id);
    setSelectedId((s) => (s === id ? null : s));
  };

  const handleAddCustomShape = () => {
    const id = design.addCustomShape();
    setSelectedRegionId(id);
    setEditMode(true);
  };

  const handleDeleteRegion = (rid) => {
    design.deleteRegion(rid);
    setSelectedRegionId((s) => (s === rid ? null : s));
  };

  const buildSideBrief = (label, d) => [
    `--- ${label} ---`,
    `Base (Primary):      ${d.primary}`,
    `Accent (Secondary):  ${d.secondary}`,
    `Accent 2 (Tertiary): ${d.tertiary}`,
    `Patterns: ${d.selectedPatterns.map((p) => PATTERNS.find((x) => x.id === p)?.label || p).join(', ') || 'none'}`,
    `Custom shapes: ${d.customShapes.length}`,
    `Graphics on jersey (${d.placements.length}):`,
    ...d.placements.map(
      (pl, i) =>
        `  ${i + 1}. [${pl.type.toUpperCase()}] @ ${pl.x.toFixed(0)}%, ${pl.y.toFixed(0)}% (scale ${pl.scale.toFixed(2)}, rot ${Math.round(pl.rotation || 0)}°) — ${pl.url}`
    ),
  ];

  const buildBrief = () => {
    const lines = [
      'NEMESIS APPAREL — CUSTOM JERSEY DESIGN BRIEF',
      '-------------------------------------------',
      `Material: ${material}`,
      `Shirt Size: ${shirtSize}`,
      `Quantity: ${quantity}`,
      '',
      ...buildSideBrief('FRONT', frontDesign),
      '',
      ...buildSideBrief('BACK', backDesign),
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
    setConfirming(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const confirmSubmit = () => {
    setConfirming(false);
    setSubmitted(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (confirming) {
    return (
      <div className="bg-void min-h-screen">
        <div className="border-b border-steel">
          <div className="mx-auto max-w-7xl px-5 sm:px-8 py-5 flex items-center justify-between">
            <button
              onClick={() => setConfirming(false)}
              className="mono-label text-fog/60 hover:text-kinetic inline-flex items-center gap-2 transition-colors"
            >
              <ArrowLeft size={14} /> BACK TO EDITOR
            </button>
            <div className="mono-label text-kinetic">REVIEW BOTH SIDES</div>
          </div>
        </div>
        <div className="mx-auto max-w-3xl px-5 sm:px-8 py-12 flex flex-col items-center text-center">
          <h1 className="font-heading text-3xl sm:text-4xl uppercase text-fog">Review your design</h1>
          <p className="mt-3 text-fog/60 max-w-md">
            Check both the front and back of your jersey before submitting. Make sure everything
            looks right — you can go back to adjust if needed.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-6">
            <div>
              <div className="mono-label text-fog/40 mb-1">FRONT</div>
              <div className="relative w-56 aspect-[3/4] border border-steel bg-steel overflow-hidden">
                <JerseyTemplate templateUrl={TEMPLATE_URL} primary={frontDesign.primary} regions={frontDesign.regions} geometry={frontDesign.geometry} />
              </div>
            </div>
            <div>
              <div className="mono-label text-fog/40 mb-1">BACK</div>
              <div className="relative w-56 aspect-[3/4] border border-steel bg-steel overflow-hidden">
                <JerseyTemplate templateUrl={BACK_TEMPLATE_URL} primary={backDesign.primary} regions={backDesign.regions} geometry={backDesign.geometry} />
              </div>
            </div>
          </div>

          <div className="mt-10 flex flex-col sm:flex-row items-stretch gap-3 w-full max-w-md">
            <button
              onClick={() => setConfirming(false)}
              className="mono-label border border-steel px-6 py-4 text-fog hover:border-kinetic hover:text-kinetic transition-colors"
            >
              KEEP EDITING
            </button>
            <button
              onClick={confirmSubmit}
              className="flex-1 inline-flex items-center justify-center gap-2 bg-kinetic px-6 py-4 font-heading uppercase text-void hover:bg-fog transition-colors"
            >
              <Check size={18} /> Confirm & submit
            </button>
          </div>
        </div>
      </div>
    );
  }

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
          <div className="mt-8 flex gap-4">
            <div>
              <div className="mono-label text-fog/40 mb-1">FRONT</div>
              <div className="relative w-48 aspect-[3/4] border border-steel bg-steel overflow-hidden">
                <JerseyTemplate templateUrl={TEMPLATE_URL} primary={frontDesign.primary} regions={frontDesign.regions} geometry={frontDesign.geometry} />
              </div>
            </div>
            <div>
              <div className="mono-label text-fog/40 mb-1">BACK</div>
              <div className="relative w-48 aspect-[3/4] border border-steel bg-steel overflow-hidden">
                <JerseyTemplate templateUrl={BACK_TEMPLATE_URL} primary={backDesign.primary} regions={backDesign.regions} geometry={backDesign.geometry} />
              </div>
            </div>
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
          {/* SIDE TABS */}
          <div className="flex mb-4">
            {['front', 'back'].map((side) => (
              <button
                key={side}
                onClick={() => switchSide(side)}
                className={`flex-1 py-3 mono-label border transition-colors ${
                  activeSide === side
                    ? 'border-kinetic text-kinetic bg-kinetic/5'
                    : 'border-steel text-fog/60 hover:border-fog/40 hover:text-fog'
                } ${side === 'front' ? 'border-r-0' : ''}`}
              >
                {side === 'front' ? 'FRONT' : 'BACK'}
              </button>
            ))}
          </div>

          <CanvasStage
            templateUrl={activeSide === 'front' ? TEMPLATE_URL : BACK_TEMPLATE_URL}
            primary={design.primary}
            regions={design.regions}
            geometry={design.geometry}
            placements={design.placements}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onUpdate={design.updatePlacement}
            onDelete={handleDeletePlacement}
            onBackgroundClick={() => {
              setSelectedId(null);
              setSelectedRegionId(null);
            }}
            editMode={editMode}
            regionIds={design.activeRegionIds}
            selectedRegionId={selectedRegionId}
            onSelectRegion={setSelectedRegionId}
            onChangeGeometry={design.updateGeometry}
            onContextMenuRegion={setCtxMenu}
          />
          <div className="mt-4 text-center mono-label text-fog/40">
            {editMode
              ? selectedRegionId
                ? 'DRAG CORNERS TO MOVE · DOTS TO CURVE · RIGHT-CLICK TO ADD/DELETE VERTEX · DRAG INSIDE TO MOVE SHAPE'
                : 'TAP A SHAPE ON THE JERSEY TO ADJUST IT'
              : 'DRAG GRAPHICS TO POSITION · CORNER HANDLE TO RESIZE · SCROLL OR BUTTONS TO ZOOM · DRAG CANVAS TO PAN'}
          </div>
        </div>

        {/* RIGHT-CLICK VERTEX MENU */}
        {ctxMenu && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setCtxMenu(null)}
              onContextMenu={(e) => {
                e.preventDefault();
                setCtxMenu(null);
              }}
            />
            <div
              className="fixed z-50 bg-void border border-steel py-1 min-w-[160px]"
              style={{ left: Math.min(ctxMenu.clientX, window.innerWidth - 170), top: Math.min(ctxMenu.clientY, window.innerHeight - 90) }}
            >
              <button
                onClick={() => {
                  design.insertVertex(ctxMenu.rid, ctxMenu.edgeIndex);
                  setCtxMenu(null);
                }}
                className="w-full text-left px-3 py-2 mono-label text-fog/80 hover:bg-kinetic/10 hover:text-kinetic transition-colors"
              >
                + ADD VERTEX
              </button>
              {ctxMenu.canDelete ? (
                <button
                  onClick={() => {
                    design.deleteVertex(ctxMenu.rid, ctxMenu.vertexIndex);
                    setCtxMenu(null);
                  }}
                  className="w-full text-left px-3 py-2 mono-label text-fog/80 hover:bg-kinetic/10 hover:text-kinetic transition-colors"
                >
                  − DELETE VERTEX
                </button>
              ) : (
                <div className="px-3 py-2 mono-label text-fog/30 cursor-not-allowed">
                  − DELETE VERTEX
                </div>
              )}
            </div>
          </>
        )}

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
                  onClick={() => handleApplyPreset(p)}
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
          <div className="grid grid-cols-3 gap-3">
            <ColorField label="PRIMARY" value={design.primary} onChange={design.setPrimary} />
            <ColorField label="SECONDARY" value={design.secondary} onChange={design.setSecondary} />
            <ColorField label="TERTIARY" value={design.tertiary} onChange={design.setTertiary} />
          </div>

          {/* PATTERNS */}
          <div>
            <div className="mono-label text-fog/50 mb-2">PATTERNS</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {PATTERNS.map((p) => {
                const active = design.selectedPatterns.includes(p.id);
                return (
                  <button
                    key={p.id}
                    onClick={() => design.togglePattern(p.id)}
                    className={`py-3 text-center mono-label border transition-colors ${
                      active
                        ? 'border-kinetic text-kinetic bg-kinetic/5'
                        : 'border-steel text-fog/70 hover:border-fog/40'
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>

            {design.selectedPatterns.length > 0 && (
              <div className="mt-3 flex flex-col gap-2">
                {design.selectedPatterns.map((pId) => {
                  const p = PATTERNS.find((x) => x.id === pId);
                  const accent = design.patternColors[pId] || 'secondary';
                  return (
                    <div key={pId} className="flex items-center gap-3 border border-steel p-2.5">
                      <span className="mono-label text-fog/70 flex-1 min-w-0 truncate">
                        {p?.label || pId}
                      </span>
                      <button
                        type="button"
                        onClick={() => design.setPatternColor(pId, 'secondary')}
                        className={`mono-label px-3 py-1.5 border transition-colors ${
                          accent === 'secondary'
                            ? 'border-kinetic text-kinetic bg-kinetic/5'
                            : 'border-steel text-fog/70 hover:border-fog/40'
                        }`}
                      >
                        ACCENT 1
                      </button>
                      <button
                        type="button"
                        onClick={() => design.setPatternColor(pId, 'tertiary')}
                        className={`mono-label px-3 py-1.5 border transition-colors ${
                          accent === 'tertiary'
                            ? 'border-kinetic text-kinetic bg-kinetic/5'
                            : 'border-steel text-fog/70 hover:border-fog/40'
                        }`}
                      >
                        ACCENT 2
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex items-center gap-3 mt-3 flex-wrap">
              <button
                type="button"
                onClick={handleAddCustomShape}
                className="mono-label px-4 py-2 border border-steel text-fog/70 hover:border-kinetic hover:text-kinetic transition-colors"
              >
                + CUSTOM SHAPE
              </button>
              {design.activeRegionIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setEditMode((v) => !v);
                    setSelectedRegionId(null);
                  }}
                  className={`mono-label px-4 py-2 border transition-colors ${
                    editMode
                      ? 'border-kinetic text-kinetic bg-kinetic/5'
                      : 'border-steel text-fog/70 hover:border-fog/40'
                  }`}
                >
                  {editMode ? 'DONE ADJUSTING' : 'ADJUST PATTERN'}
                </button>
              )}
              {editMode &&
                (() => {
                  const disabled = !selectedRegionId;
                  const label = disabled ? 'SELECT SHAPE' : 'RESET SHAPE';
                  return (
                    <button
                      type="button"
                      onClick={() => design.resetSelectedShape(selectedRegionId)}
                      disabled={disabled}
                      className={`mono-label px-4 py-2 border transition-colors ${
                        disabled
                          ? 'border-steel/50 text-fog/20 cursor-not-allowed opacity-50'
                          : 'border-steel text-fog/60 hover:border-kinetic hover:text-kinetic'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })()}
            </div>

            {design.customShapes.length > 0 && (
              <div className="mt-3 flex flex-col gap-2">
                <div className="mono-label text-fog/50">
                  CUSTOM SHAPES ({design.customShapes.length})
                </div>
                {design.customShapes.map((c, idx) => (
                  <div key={c.id} className="flex items-center gap-2 border border-steel p-2.5">
                    <span className="mono-label text-fog/70 flex-1 min-w-0 truncate">
                      SHAPE {idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => design.setCustomColor(c.id, 'secondary')}
                      className={`mono-label px-3 py-1.5 border transition-colors ${
                        c.color === 'secondary'
                          ? 'border-kinetic text-kinetic bg-kinetic/5'
                          : 'border-steel text-fog/70 hover:border-fog/40'
                      }`}
                    >
                      ACCENT 1
                    </button>
                    <button
                      type="button"
                      onClick={() => design.setCustomColor(c.id, 'tertiary')}
                      className={`mono-label px-3 py-1.5 border transition-colors ${
                        c.color === 'tertiary'
                          ? 'border-kinetic text-kinetic bg-kinetic/5'
                          : 'border-steel text-fog/70 hover:border-fog/40'
                      }`}
                    >
                      ACCENT 2
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteRegion(c.id)}
                      className="text-fog/50 hover:text-kinetic p-1.5 border border-steel hover:border-kinetic transition-colors"
                      aria-label="Delete shape"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
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
            onSelect={(u) => handleAddPlacement(u, 'logo')}
          />
          <AssetUploader
            label="ICONS"
            hint="CLICK TO PLACE"
            assets={icons}
            onUpload={(u) => setIcons((a) => [...a, u])}
            onSelect={(u) => handleAddPlacement(u, 'icon')}
          />

          {/* PLACEMENTS LIST */}
          {design.placements.length > 0 && (
            <div>
              <div className="mono-label text-fog/50 mb-2">
                GRAPHICS ON {activeSide.toUpperCase()} ({design.placements.length})
              </div>
              <div className="flex flex-col gap-2">
                {design.placements.map((pl, i) => (
                  <div key={pl.id} className="flex items-center gap-3 border border-steel p-2">
                    <div className="w-10 h-10 bg-steel overflow-hidden shrink-0">
                      <img src={pl.url} alt="" className="w-full h-full object-contain" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="mono-label text-fog/70">{pl.type.toUpperCase()} #{i + 1}</div>
                    </div>
                    <button
                      onClick={() => setSelectedId(pl.id)}
                      className="mono-label text-fog/50 hover:text-kinetic px-2"
                    >
                      EDIT
                    </button>
                    <button
                      onClick={() => handleDeletePlacement(pl.id)}
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

          {/* QUANTITY */}
          <div>
            <div className="mono-label text-fog/50 mb-2">QUANTITY</div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="w-11 h-11 border border-steel text-fog hover:border-kinetic hover:text-kinetic font-heading text-xl flex items-center justify-center transition-colors"
                aria-label="Decrease quantity"
              >
                −
              </button>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  setQuantity(Number.isFinite(v) && v > 0 ? v : 1);
                }}
                className="no-spinner w-16 h-11 text-center font-heading text-lg bg-void border border-steel text-fog focus:border-kinetic outline-none"
              />
              <button
                type="button"
                onClick={() => setQuantity((q) => q + 1)}
                className="w-11 h-11 border border-steel text-fog hover:border-kinetic hover:text-kinetic font-heading text-xl flex items-center justify-center transition-colors"
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
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