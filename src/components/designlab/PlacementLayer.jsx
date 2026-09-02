import { useRef } from 'react';
import { X, RotateCw } from 'lucide-react';
import { TEMPLATE_URL } from './JerseyTemplate';

// Absolutely-positioned drag-and-drop layer over the jersey canvas. Each
// placement stores x/y as percentages (0–100) so it scales with the canvas,
// and a scale multiplier for resizing. Drag the body to move; drag the
// bottom-right handle to resize; click the × to delete.
//
// Graphics are rendered in three stacked layers so they clip to the jersey:
//   1. a 20%-opacity base (unmasked) — the part of the graphic hanging off
//      the jersey stays visible at low opacity.
//   2. a 100%-opacity copy masked to the jersey silhouette — only the on-jersey
//      portion shows at full strength.
//   3. an invisible interaction layer on top with the drag/resize/rotate
//      handles, kept unmasked so the handles always stay hittable.
const JERSEY_MASK_STYLE = {
  WebkitMaskImage: `url(${TEMPLATE_URL})`,
  WebkitMaskSize: 'contain',
  WebkitMaskPosition: 'center',
  WebkitMaskRepeat: 'no-repeat',
  maskImage: `url(${TEMPLATE_URL})`,
  maskSize: 'contain',
  maskPosition: 'center',
  maskRepeat: 'no-repeat',
  maskMode: 'luminance',
};

const placementStyle = (pl) => ({
  left: `${pl.x}%`,
  top: `${pl.y}%`,
  transform: `translate(-50%, -50%) rotate(${pl.rotation || 0}deg)`,
  touchAction: 'none',
});

function Graphic({ pl, opacity }) {
  return (
    <div className="absolute pointer-events-none" style={placementStyle(pl)}>
      <div style={{ width: 88 * pl.scale, height: 88 * pl.scale, opacity }}>
        <img
          src={pl.url}
          alt=""
          className="w-full h-full object-contain select-none"
          draggable={false}
        />
      </div>
    </div>
  );
}

export default function PlacementLayer({ placements, selectedId, onSelect, onUpdate, onDelete }) {
  const containerRef = useRef(null);

  const toPct = (clientX, clientY, rect) => ({
    x: ((clientX - rect.left) / rect.width) * 100,
    y: ((clientY - rect.top) / rect.height) * 100,
  });

  const startMove = (e, id) => {
    e.stopPropagation();
    onSelect(id);
    const p = placements.find((pl) => pl.id === id);
    const rect = containerRef.current.getBoundingClientRect();
    const pos = toPct(e.clientX, e.clientY, rect);
    const ox = pos.x - p.x;
    const oy = pos.y - p.y;
    const move = (ev) => {
      const cur = toPct(ev.clientX, ev.clientY, rect);
      onUpdate(id, {
        x: Math.max(2, Math.min(98, cur.x - ox)),
        y: Math.max(2, Math.min(98, cur.y - oy)),
      });
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const startResize = (e, id) => {
    e.stopPropagation();
    onSelect(id);
    const p = placements.find((pl) => pl.id === id);
    const rect = containerRef.current.getBoundingClientRect();
    const start = toPct(e.clientX, e.clientY, rect);
    const startDist = Math.max(1, Math.hypot(start.x - p.x, start.y - p.y));
    const move = (ev) => {
      const cur = toPct(ev.clientX, ev.clientY, rect);
      const dist = Math.hypot(cur.x - p.x, cur.y - p.y);
      const scale = Math.max(0.3, Math.min(3, p.scale * (dist / startDist)));
      onUpdate(id, { scale });
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const startRotate = (e, id) => {
    e.stopPropagation();
    onSelect(id);
    const p = placements.find((pl) => pl.id === id);
    const rect = containerRef.current.getBoundingClientRect();
    const cx = rect.left + (p.x / 100) * rect.width;
    const cy = rect.top + (p.y / 100) * rect.height;
    const startAngle = Math.atan2(e.clientY - cy, e.clientX - cx);
    const startRot = p.rotation || 0;
    const move = (ev) => {
      const angle = Math.atan2(ev.clientY - cy, ev.clientX - cx);
      const deg = startRot + (angle - startAngle) * (180 / Math.PI);
      onUpdate(id, { rotation: deg });
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  return (
    <div ref={containerRef} className="absolute inset-0 pointer-events-none">
      {/* 20% base — visible everywhere, including the off-jersey bleed */}
      <div className="absolute inset-0 pointer-events-none">
        {placements.map((pl) => (
          <Graphic key={`${pl.id}-base`} pl={pl} opacity={0.2} />
        ))}
      </div>

      {/* 100% masked — only the on-jersey portion shows at full strength */}
      <div className="absolute inset-0 pointer-events-none" style={JERSEY_MASK_STYLE}>
        {placements.map((pl) => (
          <Graphic key={`${pl.id}-mask`} pl={pl} opacity={1} />
        ))}
      </div>

      {/* Interaction layer — drag, resize, rotate, delete (unmasked) */}
      <div className="absolute inset-0">
        {placements.map((pl) => {
          const selected = pl.id === selectedId;
          return (
            <div
              key={pl.id}
              onPointerDown={(e) => startMove(e, pl.id)}
              onClick={(e) => {
                e.stopPropagation();
                onSelect(pl.id);
              }}
              className="absolute pointer-events-auto cursor-move"
              style={placementStyle(pl)}
            >
              <div
                className={`relative ${selected ? 'outline outline-2 outline-kinetic' : ''}`}
                style={{ width: 88 * pl.scale, height: 88 * pl.scale }}
              >
                {selected && (
                  <>
                    <button
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(pl.id);
                      }}
                      className="absolute -top-2 -right-2 w-5 h-5 bg-kinetic text-void flex items-center justify-center"
                      aria-label="Remove graphic"
                    >
                      <X size={12} />
                    </button>
                    <div
                      onPointerDown={(e) => startResize(e, pl.id)}
                      className="absolute -bottom-1.5 -right-1.5 w-4 h-4 bg-kinetic cursor-nwse-resize"
                      aria-label="Resize"
                    />
                    <div className="absolute left-1/2 -top-6 h-6 w-px bg-kinetic -translate-x-1/2 pointer-events-none" />
                    <div
                      onPointerDown={(e) => startRotate(e, pl.id)}
                      className="absolute left-1/2 -top-7 w-4 h-4 -translate-x-1/2 bg-kinetic rounded-full flex items-center justify-center cursor-grab"
                      aria-label="Rotate"
                    >
                      <RotateCw size={9} className="text-void" />
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}