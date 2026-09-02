import { useRef } from 'react';
import { buildPath } from './geometry';

const VIEW = 1024;

// Draggable overlay for the active pattern's regions. Renders in the same
// 1024x1024 viewBox (xMidYMid meet) as the jersey template so handles sit
// exactly on the seams. Drag corner anchors to move; drag edge handles to
// curve. The SVG passes through pointer events except on the handles, so canvas
// pan/zoom still work on empty areas.
export default function PatternEditor({ regions, geometry, onChange }) {
  const svgRef = useRef(null);
  const dragRef = useRef(null);

  const toSvg = (clientX, clientY) => {
    const rect = svgRef.current.getBoundingClientRect();
    const drawW = Math.min(rect.width, rect.height);
    const offX = (rect.width - drawW) / 2;
    const offY = (rect.height - drawW) / 2;
    return {
      x: Math.max(0, Math.min(VIEW, (((clientX - rect.left) - offX) / drawW) * VIEW)),
      y: Math.max(0, Math.min(VIEW, (((clientY - rect.top) - offY) / drawW) * VIEW)),
    };
  };

  const startDrag = (e, regionId, type, index) => {
    e.stopPropagation();
    e.preventDefault();
    dragRef.current = { regionId, type, index };
    const move = (ev) => {
      if (!dragRef.current) return;
      const pt = toSvg(ev.clientX, ev.clientY);
      const region = geometry[regionId];
      if (type === 'anchor') {
        const anchors = region.anchors.map((a, i) => (i === index ? pt : a));
        onChange(regionId, { ...region, anchors });
      } else {
        const handles = region.handles.map((h, i) => (i === index ? pt : h));
        onChange(regionId, { ...region, handles });
      }
    };
    const up = () => {
      dragRef.current = null;
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  return (
    <svg
      ref={svgRef}
      className="absolute inset-0 w-full h-full"
      viewBox={`0 0 ${VIEW} ${VIEW}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ pointerEvents: 'none' }}
    >
      {regions.map((rid) => {
        const region = geometry[rid];
        if (!region) return null;
        return (
          <g key={rid}>
            <path
              d={buildPath(region)}
              fill="none"
              stroke="#0066FF"
              strokeWidth="5"
              strokeDasharray="12 8"
              pointerEvents="none"
            />
            {region.anchors.map((a, i) => {
              const next = region.anchors[(i + 1) % region.anchors.length];
              const h = region.handles[i];
              const mid = { x: (a.x + next.x) / 2, y: (a.y + next.y) / 2 };
              return (
                <g key={i}>
                  <line
                    x1={mid.x}
                    y1={mid.y}
                    x2={h.x}
                    y2={h.y}
                    stroke="#0066FF"
                    strokeWidth="2"
                    opacity="0.6"
                    pointerEvents="none"
                  />
                  {/* Curve handle (edge control) */}
                  <circle
                    cx={h.x}
                    cy={h.y}
                    r="40"
                    fill="transparent"
                    pointerEvents="all"
                    cursor="pointer"
                    onPointerDown={(e) => startDrag(e, rid, 'handle', i)}
                  />
                  <circle cx={h.x} cy={h.y} r="16" fill="#0066FF" pointerEvents="none" />
                  {/* Corner anchor */}
                  <circle
                    cx={a.x}
                    cy={a.y}
                    r="44"
                    fill="transparent"
                    pointerEvents="all"
                    cursor="move"
                    onPointerDown={(e) => startDrag(e, rid, 'anchor', i)}
                  />
                  <circle
                    cx={a.x}
                    cy={a.y}
                    r="20"
                    fill="#0A0A0A"
                    stroke="#0066FF"
                    strokeWidth="4"
                    pointerEvents="none"
                  />
                </g>
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}