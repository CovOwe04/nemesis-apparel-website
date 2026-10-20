import { useRef, useState } from 'react';
import { Check, RotateCcw } from 'lucide-react';
import { getMockupImageUrl, resolveMockupCrop, MOCKUP_CROP_RATIO } from '@/lib/jerseyStyle';

const MIN_SIDE = 0.05; // smallest frame, as a fraction of the image's shorter side
const CORNERS = ['nw', 'ne', 'sw', 'se'];
const FULL_CROP = { x: 0, y: 0, w: 1, h: 1 };

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

// Fit a saved rect to the locked frame ratio (a square, in source pixels),
// centered on it — a stale non-square crop is trimmed, never letterboxed.
function frameCrop(crop, natural) {
  if (!natural?.w || !natural?.h) return crop;
  const px = {
    x: crop.x * natural.w,
    y: crop.y * natural.h,
    w: crop.w * natural.w,
    h: crop.h * natural.h,
  };
  let w = px.w;
  let h = px.h;
  if (w / h > MOCKUP_CROP_RATIO) w = h * MOCKUP_CROP_RATIO;
  else h = w / MOCKUP_CROP_RATIO;
  return {
    x: (px.x + (px.w - w) / 2) / natural.w,
    y: (px.y + (px.h - h) / 2) / natural.h,
    w: w / natural.w,
    h: h / natural.h,
  };
}

// One crop applied to every color of the listing: the same framing is uploaded
// as the Merchize product mockup for the whole listing. The frame is locked to
// the Merchize product ratio — corner handles resize it, the middle moves it —
// so the product image fills the frame with no letterboxed bars.
export default function MockupCropDesigner({ colors = [], updateColor }) {
  const boxRef = useRef(null);
  const dragRef = useRef(null);
  const [natural, setNatural] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [cropSet, setCropSet] = useState(false);
  const [draftCrop, setDraftCrop] = useState(null);
  const [selected, setSelected] = useState(() => {
    const withImage = colors.findIndex((c) => getMockupImageUrl(c));
    return withImage === -1 ? 0 : withImage;
  });

  const displayIndex = selected < colors.length ? selected : 0;
  const displayColor = colors[displayIndex] || {};
  const imageUrl = getMockupImageUrl(displayColor);
  // Framing changes stay in a local draft so an accidental drag never reaches
  // the listing (and the Merchize mockup upload). SET is the save action.
  const storedCrop = frameCrop(resolveMockupCrop(displayColor), natural);
  const crop = draftCrop || storedCrop;
  const unsaved = draftCrop !== null;

  const commit = (next) => colors.forEach((_, i) => updateColor(i, { mockup_crop: next }));

  // "SET" saves the framed crop to every color.
  const applyCrop = () => {
    commit(frameCrop(crop, natural));
    setDraftCrop(null);
    setCropSet(true);
  };

  const resetCrop = () => {
    setDraftCrop(frameCrop(FULL_CROP, natural));
    setCropSet(false);
  };

  const startDrag = (mode, event) => {
    event.preventDefault();
    event.stopPropagation();
    const box = boxRef.current?.getBoundingClientRect();
    if (!box || !box.width || !box.height || !natural?.w) return;

    const start = frameCrop(crop, natural);
    dragRef.current = {
      mode,
      box,
      start,
      startPx: {
        x: start.x * natural.w,
        y: start.y * natural.h,
        w: start.w * natural.w,
        h: start.h * natural.h,
      },
      startX: clamp((event.clientX - box.left) / box.width, 0, 1),
      startY: clamp((event.clientY - box.top) / box.height, 0, 1),
      minSide: MIN_SIDE * Math.min(natural.w, natural.h),
      maxSide: Math.min(natural.w, natural.h),
    };
    setDragging(true);

    const onMove = (e) => {
      const drag = dragRef.current;
      if (!drag) return;
      const nx = clamp((e.clientX - drag.box.left) / drag.box.width, 0, 1);
      const ny = clamp((e.clientY - drag.box.top) / drag.box.height, 0, 1);
      let next;
      if (drag.mode === 'move') {
        const s = drag.start;
        next = {
          x: clamp(s.x + (nx - drag.startX), 0, 1 - s.w),
          y: clamp(s.y + (ny - drag.startY), 0, 1 - s.h),
          w: s.w,
          h: s.h,
        };
      } else {
        // Corner handles keep the frame ratio: the opposite corner is anchored.
        const east = drag.mode.includes('e');
        const south = drag.mode.includes('s');
        const anchorX = east ? drag.startPx.x : drag.startPx.x + drag.startPx.w;
        const anchorY = south ? drag.startPx.y : drag.startPx.y + drag.startPx.h;
        const availX = east ? natural.w - anchorX : anchorX;
        const availY = south ? natural.h - anchorY : anchorY;
        const side = clamp(
          Math.max(Math.abs(nx * natural.w - anchorX), Math.abs(ny * natural.h - anchorY)),
          drag.minSide,
          Math.min(drag.maxSide, availX, availY)
        );
        next = {
          x: (east ? anchorX : anchorX - side) / natural.w,
          y: (south ? anchorY : anchorY - side) / natural.h,
          w: side / natural.w,
          h: side / natural.h,
        };
      }
      setDraftCrop(next);
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
          <button type="button" onClick={resetCrop}
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
              FRAME {MOCKUP_CROP_RATIO}:1 — MATCHES THE MERCHIZE PRODUCT. Drag the box to reposition it, or a corner to
              resize it, then press SET to save it. Use the swatches to check another color's image.
            </p>
          </div>

          {/* Cropped result */}
          <div>
            <div
              className="relative overflow-hidden rounded-[4px] border border-steel bg-void"
              style={{ aspectRatio: String(MOCKUP_CROP_RATIO) }}
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
              {unsaved
                ? 'Not saved yet — press SET to apply this crop to every color.'
                : cropSet
                  ? 'Crop saved for every color. Generate the Merchize products again to apply it.'
                  : 'Press SET to save this crop to every color — it is uploaded as the product mockup.'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}