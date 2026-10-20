import { useRef, useState } from 'react';
import { Check, RotateCcw } from 'lucide-react';
import { getMockupImageUrl, resolveMockupCrop } from '@/lib/jerseyStyle';

const MIN_SIZE = 0.05;
const CORNERS = ['nw', 'ne', 'sw', 'se'];
const FULL_CROP = { x: 0, y: 0, w: 1, h: 1 };

function clamp01(n) {
  return Math.min(1, Math.max(0, n));
}

// One crop applied to every color of the listing: the same framing is uploaded
// as the Merchize 3D mockup for the whole listing. A color's image can be
// previewed while cropping, but the result is written to all colors.
export default function MockupCropDesigner({ colors = [], updateColor }) {
  const boxRef = useRef(null);
  const dragRef = useRef(null);
  const [natural, setNatural] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [cropSet, setCropSet] = useState(false);
  const [selected, setSelected] = useState(() => {
    const withImage = colors.findIndex((c) => getMockupImageUrl(c));
    return withImage === -1 ? 0 : withImage;
  });

  const displayIndex = selected < colors.length ? selected : 0;
  const displayColor = colors[displayIndex] || {};
  const imageUrl = getMockupImageUrl(displayColor);
  const crop = resolveMockupCrop(displayColor);

  const commit = (next) => colors.forEach((_, i) => updateColor(i, { mockup_crop: next }));

  // "SET" writes the framed crop to every color and confirms it is applied.
  const applyCrop = () => {
    commit(resolveMockupCrop(displayColor));
    setCropSet(true);
  };

  const startDrag = (mode, event) => {
    event.preventDefault();
    event.stopPropagation();
    const box = boxRef.current?.getBoundingClientRect();
    if (!box || !box.width || !box.height) return;

    dragRef.current = {
      mode,
      box,
      start: { ...crop },
      startX: clamp01((event.clientX - box.left) / box.width),
      startY: clamp01((event.clientY - box.top) / box.height),
    };
    setDragging(true);

    const onMove = (e) => {
      const drag = dragRef.current;
      if (!drag) return;
      const nx = clamp01((e.clientX - drag.box.left) / drag.box.width);
      const ny = clamp01((e.clientY - drag.box.top) / drag.box.height);
      const dx = nx - drag.startX;
      const dy = ny - drag.startY;
      const s = drag.start;
      let next;
      if (drag.mode === 'move') {
        next = {
          x: clamp01(Math.min(s.x + dx, 1 - s.w)),
          y: clamp01(Math.min(s.y + dy, 1 - s.h)),
          w: s.w,
          h: s.h,
        };
      } else {
        let { x, y, w, h } = s;
        if (drag.mode.includes('w')) {
          const right = s.x + s.w;
          x = Math.min(clamp01(s.x + dx), right - MIN_SIZE);
          w = right - x;
        }
        if (drag.mode.includes('e')) {
          w = Math.max(clamp01(s.x + s.w + dx) - s.x, MIN_SIZE);
        }
        if (drag.mode.includes('n')) {
          const bottom = s.y + s.h;
          y = Math.min(clamp01(s.y + dy), bottom - MIN_SIZE);
          h = bottom - y;
        }
        if (drag.mode.includes('s')) {
          h = Math.max(clamp01(s.y + s.h + dy) - s.y, MIN_SIZE);
        }
        next = { x, y, w, h };
      }
      commit(next);
      setCropSet(false);
    };

    const onUp = () => {
      dragRef.current = null;
      setDragging(false);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  return (
    <div className="border border-steel rounded-[4px] p-3">
      <div className="flex items-center justify-between gap-3 mb-3">
        <span className="mono-label text-fog/60 text-[0.65rem] truncate">
          {(displayColor.name || 'DEFAULT').toUpperCase()} &middot; APPLIES TO ALL COLORS
        </span>
        <span className="flex items-center gap-2 shrink-0">
          {colors.length > 1 &&
            colors.map((c, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setSelected(i)}
                title={`Preview ${c.name || `color ${i + 1}`}`}
                className={`w-5 h-5 rounded-full border transition-colors ${i === displayIndex ? 'border-kinetic' : 'border-steel hover:border-fog'}`}
                style={{ backgroundColor: c.hex || '#000' }}
              />
            ))}
          <button type="button" onClick={() => { commit(FULL_CROP); setCropSet(false); }}
            className="inline-flex items-center gap-1 mono-label text-fog/50 hover:text-kinetic transition-colors text-[0.6rem]">
            <RotateCcw size={11} /> RESET
          </button>
          <button type="button" onClick={applyCrop}
            className={`inline-flex items-center gap-1.5 font-heading uppercase text-[0.7rem] px-3 py-1 rounded-[4px] transition-colors ${cropSet ? 'bg-void text-kinetic border border-kinetic' : 'bg-kinetic text-void hover:bg-fog'}`}>
            {cropSet ? <><Check size={12} /> SET</> : 'SET'}
          </button>
        </span>
      </div>

      {!imageUrl ? (
        <p className="mono-label text-fog/30 py-6 text-center text-[0.6rem]">Add an image to a color to crop the 3D mockup.</p>
      ) : (
        <div className="grid lg:grid-cols-2 gap-3">
          {/* Crop editor */}
          <div>
            <div ref={boxRef} className="relative overflow-hidden rounded-[4px] border border-steel select-none touch-none">
              <img
                src={imageUrl}
                alt=""
                draggable={false}
                onLoad={(e) => setNatural({ w: e.target.naturalWidth, h: e.target.naturalHeight })}
                className="w-full h-auto block pointer-events-none"
              />
              <div
                className="absolute border-2 border-kinetic"
                style={{
                  left: `${crop.x * 100}%`,
                  top: `${crop.y * 100}%`,
                  width: `${crop.w * 100}%`,
                  height: `${crop.h * 100}%`,
                  boxShadow: '0 0 0 9999px rgba(0,0,0,0.6)',
                  cursor: dragging ? 'grabbing' : 'grab',
                }}
                onPointerDown={(e) => startDrag('move', e)}
              >
                {CORNERS.map((corner) => (
                  <span
                    key={corner}
                    onPointerDown={(e) => startDrag(corner, e)}
                    className={`absolute w-3 h-3 bg-kinetic ${corner === 'nw' || corner === 'se' ? 'cursor-nwse-resize' : 'cursor-nesw-resize'}`}
                    style={{
                      left: corner.includes('w') ? -2 : undefined,
                      right: corner.includes('e') ? -2 : undefined,
                      top: corner.includes('n') ? -2 : undefined,
                      bottom: corner.includes('s') ? -2 : undefined,
                    }}
                  />
                ))}
              </div>
            </div>
            <p className="mono-label text-fog/30 mt-2 text-[0.55rem] leading-relaxed">
              Drag the box or a corner to frame the 3D mockup. Use the swatches to check another color's image.
            </p>
          </div>

          {/* Cropped result */}
          <div>
            <div
              className="relative overflow-hidden rounded-[4px] border border-steel bg-void"
              style={{ aspectRatio: natural ? `${(crop.w * natural.w) / (crop.h * natural.h)}` : '1' }}
            >
              <img
                src={imageUrl}
                alt=""
                draggable={false}
                className="absolute max-w-none pointer-events-none"
                style={{
                  width: `${100 / crop.w}%`,
                  height: `${100 / crop.h}%`,
                  left: `${-(crop.x / crop.w) * 100}%`,
                  top: `${-(crop.y / crop.h) * 100}%`,
                }}
              />
            </div>
            <p className="mono-label text-fog/30 mt-2 text-[0.55rem] leading-relaxed">
              {cropSet
                ? 'Crop set for every color. Generate the Merchize products again to apply it.'
                : 'Press SET to apply this crop to every color — it is uploaded as the 3D mockup.'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}