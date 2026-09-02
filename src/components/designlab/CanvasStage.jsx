import { useEffect, useRef, useState } from 'react';
import JerseyTemplate from './JerseyTemplate';
import PlacementLayer from './PlacementLayer';
import PatternEditor from './PatternEditor';
import { ZoomIn, ZoomOut, Maximize } from 'lucide-react';

// Canvas stage with zoom + pan over the jersey and its placements. The view
// transform is applied to a wrapper around the template and placement layer, so
// graphics stay aligned to the jersey while you inspect/micro-adjust. Dragging
// a graphic still works under zoom because PlacementLayer computes positions
// as ratios of the (transformed) container rect.
export default function CanvasStage({
  primary,
  secondary,
  tertiary,
  pattern,
  placements,
  selectedId,
  onSelect,
  onUpdate,
  onDelete,
  onBackgroundClick,
  geometry,
  editMode,
  editableRegions,
  onGeometryChange,
}) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const canvasRef = useRef(null);
  const panRef = useRef(null);

  const clamp = (z) => Math.max(1, Math.min(4, +Number(z).toFixed(3)));

  // Non-passive wheel listener so we can preventDefault (block page scroll).
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const onWheel = (e) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.12 : 0.89;
      setZoom((z) => clamp(z * factor));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const startPan = (e) => {
    if (e.button !== 0) return;
    panRef.current = { sx: e.clientX, sy: e.clientY, px: pan.x, py: pan.y, moved: false };
    const move = (ev) => {
      if (!panRef.current) return;
      const dx = ev.clientX - panRef.current.sx;
      const dy = ev.clientY - panRef.current.sy;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) panRef.current.moved = true;
      setPan({ x: panRef.current.px + dx, y: panRef.current.py + dy });
    };
    const up = () => {
      if (panRef.current && !panRef.current.moved) onBackgroundClick?.();
      panRef.current = null;
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const stop = (e) => e.stopPropagation();

  return (
    <div
      ref={canvasRef}
      className="relative mx-auto max-w-md aspect-[3/4] border border-white/10 bg-steel overflow-hidden"
      onPointerDown={startPan}
      style={{ cursor: 'grab', touchAction: 'none' }}
    >
      <div
        className="absolute inset-0"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: 'center center',
        }}
      >
        <JerseyTemplate
          primary={primary}
          secondary={secondary}
          tertiary={tertiary}
          pattern={pattern}
          geometry={geometry}
        />
        <PlacementLayer
          placements={placements}
          selectedId={selectedId}
          onSelect={onSelect}
          onUpdate={onUpdate}
          onDelete={onDelete}
        />
        {editMode && (
          <PatternEditor
            regions={editableRegions}
            geometry={geometry}
            onChange={onGeometryChange}
          />
        )}
      </div>

      {/* Zoom readout */}
      <div className="absolute top-2 left-2 z-20 mono-label text-fog/60 bg-void/70 px-2 py-1 pointer-events-none">
        {Math.round(zoom * 100)}%
      </div>

      {/* Zoom controls */}
      <div className="absolute bottom-2 right-2 z-20 flex flex-col gap-1">
        <button
          onPointerDown={stop}
          onClick={() => setZoom((z) => clamp(z * 1.2))}
          className="w-8 h-8 bg-void/80 border border-steel text-fog hover:border-kinetic hover:text-kinetic flex items-center justify-center transition-colors"
          aria-label="Zoom in"
        >
          <ZoomIn size={15} />
        </button>
        <button
          onPointerDown={stop}
          onClick={() => {
            setZoom(1);
            setPan({ x: 0, y: 0 });
          }}
          className="w-8 h-8 bg-void/80 border border-steel text-fog hover:border-kinetic hover:text-kinetic flex items-center justify-center transition-colors"
          aria-label="Reset view"
        >
          <Maximize size={15} />
        </button>
        <button
          onPointerDown={stop}
          onClick={() => setZoom((z) => clamp(z / 1.2))}
          className="w-8 h-8 bg-void/80 border border-steel text-fog hover:border-kinetic hover:text-kinetic flex items-center justify-center transition-colors"
          aria-label="Zoom out"
        >
          <ZoomOut size={15} />
        </button>
      </div>
    </div>
  );
}