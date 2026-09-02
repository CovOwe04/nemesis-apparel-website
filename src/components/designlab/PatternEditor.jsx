import { useRef } from 'react';
import { buildPath } from './geometry';

const VIEW = 1024;

// Draggable overlay for the active pattern regions. Renders in the same
// 1024x1024 viewBox (xMidYMid meet) as the jersey template so handles sit
// exactly on the seams. In adjust mode each region is click-to-select; only the
// selected region shows corners + curve handles + add-vertex buttons. Drag a
// corner to move it, drag a dot to curve its edge, tap + to insert a vertex
// (bezier split), drag inside a region to move the whole shape.
export default function PatternEditor({
  regionIds,
  geometry,
  selectedRegionId,
  onSelectRegion,
  onChange,
  onInsertVertex,
}) {
  const svgRef = useRef(null);

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

  // Move an entire region by dragging inside it.
  const startMove = (e, rid) => {
    e.stopPropagation();
    e.preventDefault();
    onSelectRegion(rid);
    const start = toSvg(e.clientX, e.clientY);
    const region = geometry[rid];
    const snapA = region.anchors;
    const snapH = region.handles;
    const move = (ev) => {
      const cur = toSvg(ev.clientX, ev.clientY);
      const dx = cur.x - start.x;
      const dy = cur.y - start.y;
      const anchors = snapA.map((a) => ({ x: a.x + dx, y: a.y + dy }));
      const handles = snapH.map((h) => ({ x: h.x + dx, y: h.y + dy }));
      onChange(rid, { anchors, handles });
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  // Drag a single corner anchor or edge curve handle.
  const startDrag = (e, rid, type, index) => {
    e.stopPropagation();
    e.preventDefault();
    onSelectRegion(rid);
    const move = (ev) => {
      const pt = toSvg(ev.clientX, ev.clientY);
      const region = geometry[rid];
      if (type === 'anchor') {
        const anchors = region.anchors.map((a, i) => (i === index ? pt : a));
        onChange(rid, { ...region, anchors });
      } else {
        const handles = region.handles.map((h, i) => (i === index ? pt : h));
        onChange(rid, { ...region, handles });
      }
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  // Quadratic bezier point at t=0.5 — used to place the + button on the curve.
  const edgeMidpoint = (a, c, b) => ({
    x: 0.25 * a.x + 0.5 * c.x + 0.25 * b.x,
    y: 0.25 * a.y + 0.5 * c.y + 0.25 * b.y,
  });

  return (
    <svg
      ref={svgRef}
      className="absolute inset-0 w-full h-full"
      viewBox={`0 0 ${VIEW} ${VIEW}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ pointerEvents: 'none' }}
    >
      {regionIds.map((rid) => {
        const region = geometry[rid];
        if (!region) return null;
        const selected = rid === selectedRegionId;
        const d = buildPath(region);
        return (
          <g key={rid}>
            {/* Click/drag anywhere inside the shape to select + move it. */}
            <path
              d={d}
              fill="transparent"
              pointerEvents="all"
              cursor={selected ? 'move' : 'pointer'}
              onPointerDown={(e) => startMove(e, rid)}
            />
            <path
              d={d}
              fill="none"
              stroke="#0066FF"
              strokeWidth={selected ? 4 : 3}
              strokeDasharray={selected ? '10 6' : '6 6'}
              opacity={selected ? 1 : 0.45}
              pointerEvents="none"
            />

            {selected &&
              region.anchors.map((a, i) => {
                const next = region.anchors[(i + 1) % region.anchors.length];
                const c = region.handles[i];
                const mid = { x: (a.x + next.x) / 2, y: (a.y + next.y) / 2 };
                // Place the + button beside the edge, perpendicular to the handle
                // stem, so it never overlaps the curve-handle dot — even when the
                // edge is straight and the handle sits on the midpoint.
                let sdx = c.x - mid.x;
                let sdy = c.y - mid.y;
                let slen = Math.hypot(sdx, sdy);
                if (slen < 1) {
                  sdx = next.x - a.x;
                  sdy = next.y - a.y;
                  slen = Math.hypot(sdx, sdy) || 1;
                }
                const cm = { x: mid.x + (-sdy / slen) * 48, y: mid.y + (sdx / slen) * 48 };
                return (
                  <g key={i}>
                    <line
                      x1={mid.x}
                      y1={mid.y}
                      x2={c.x}
                      y2={c.y}
                      stroke="#0066FF"
                      strokeWidth="1.5"
                      opacity="0.6"
                      pointerEvents="none"
                    />
                    {/* Curve handle */}
                    <circle
                      cx={c.x}
                      cy={c.y}
                      r="18"
                      fill="transparent"
                      pointerEvents="all"
                      cursor="pointer"
                      onPointerDown={(e) => startDrag(e, rid, 'handle', i)}
                    />
                    <circle cx={c.x} cy={c.y} r="8" fill="#0066FF" pointerEvents="none" />
                    {/* Corner anchor */}
                    <circle
                      cx={a.x}
                      cy={a.y}
                      r="28"
                      fill="transparent"
                      pointerEvents="all"
                      cursor="move"
                      onPointerDown={(e) => startDrag(e, rid, 'anchor', i)}
                    />
                    <circle
                      cx={a.x}
                      cy={a.y}
                      r="10"
                      fill="#0A0A0A"
                      stroke="#0066FF"
                      strokeWidth="3"
                      pointerEvents="none"
                    />
                    {/* Add-vertex button at the curve midpoint */}
                    <g>
                      <circle
                        cx={cm.x}
                        cy={cm.y}
                        r="20"
                        fill="transparent"
                        pointerEvents="all"
                        cursor="pointer"
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          onInsertVertex(rid, i);
                        }}
                      />
                      <circle
                        cx={cm.x}
                        cy={cm.y}
                        r="13"
                        fill="#0A0A0A"
                        stroke="#0066FF"
                        strokeWidth="2.5"
                        pointerEvents="none"
                      />
                      <line
                        x1={cm.x - 6}
                        y1={cm.y}
                        x2={cm.x + 6}
                        y2={cm.y}
                        stroke="#0066FF"
                        strokeWidth="2.5"
                        pointerEvents="none"
                      />
                      <line
                        x1={cm.x}
                        y1={cm.y - 6}
                        x2={cm.x}
                        y2={cm.y + 6}
                        stroke="#0066FF"
                        strokeWidth="2.5"
                        pointerEvents="none"
                      />
                    </g>
                  </g>
                );
              })}
          </g>
        );
      })}
    </svg>
  );
}