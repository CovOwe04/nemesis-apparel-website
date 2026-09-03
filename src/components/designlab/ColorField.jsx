import { useState, useEffect, useRef } from 'react';
import { ChevronDown, Pipette } from 'lucide-react';

// Inline color selector that uses the NATIVE browser color picker (the popup in
// the reference: saturation gradient, hue slider, eyedropper, swatch, hex
// field) — no custom gradient/hue UI is built. On top of the native picker we
// add a value input + a HEX/RGB/HSL format dropdown so colors can be entered in
// any of those formats. The stored value is always a hex string.

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const num = parseInt(full, 16);
  if (Number.isNaN(num)) return { r: 0, g: 0, b: 0 };
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

function rgbToHex({ r, g, b }) {
  const to = (n) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`;
}

function rgbToHsl({ r, g, b }) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) * 60;
    else if (max === gn) h = ((bn - rn) / d + 2) * 60;
    else h = ((rn - gn) / d + 4) * 60;
  }
  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function hslToRgb({ h, s, l }) {
  const sn = s / 100;
  const ln = l / 100;
  const c = (1 - Math.abs(2 * ln - 1)) * sn;
  const hp = h / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r1 = 0;
  let g1 = 0;
  let b1 = 0;
  if (hp >= 0 && hp < 1) { r1 = c; g1 = x; }
  else if (hp < 2) { r1 = x; g1 = c; }
  else if (hp < 3) { g1 = c; b1 = x; }
  else if (hp < 4) { g1 = x; b1 = c; }
  else if (hp < 5) { r1 = x; b1 = c; }
  else { r1 = c; b1 = x; }
  const m = ln - c / 2;
  return { r: (r1 + m) * 255, g: (g1 + m) * 255, b: (b1 + m) * 255 };
}

const FORMATS = ['HEX', 'RGB', 'HSL'];

function formatValue(hex, fmt) {
  const rgb = hexToRgb(hex);
  if (fmt === 'HEX') return hex.toUpperCase();
  if (fmt === 'RGB') return `${rgb.r}, ${rgb.g}, ${rgb.b}`;
  const hsl = rgbToHsl(rgb);
  return `${hsl.h}, ${hsl.s}, ${hsl.l}`;
}

export default function ColorField({ label, value, onChange }) {
  const [format, setFormat] = useState('HEX');
  const [text, setText] = useState(formatValue(value, 'HEX'));
  const [dropOpen, setDropOpen] = useState(false);
  const wrapRef = useRef(null);

  // Keep the text field in sync when the color changes externally (presets,
  // native picker, etc.).
  useEffect(() => {
    setText(formatValue(value, format));
  }, [value, format]);

  // Close dropdown on outside click.
  useEffect(() => {
    if (!dropOpen) return;
    const onDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setDropOpen(false);
    };
    window.addEventListener('pointerdown', onDown);
    return () => window.removeEventListener('pointerdown', onDown);
  }, [dropOpen]);

  const parse = (raw) => {
    const t = raw.trim();
    if (format === 'HEX') {
      let h = t;
      if (h && !h.startsWith('#')) h = '#' + h;
      if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(h)) return h.toLowerCase();
    } else if (format === 'RGB') {
      const parts = t.split(/[,\s]+/).map((p) => parseInt(p, 10));
      if (parts.length === 3 && parts.every((n) => Number.isFinite(n))) {
        return rgbToHex({
          r: clamp(parts[0], 0, 255),
          g: clamp(parts[1], 0, 255),
          b: clamp(parts[2], 0, 255),
        });
      }
    } else {
      const parts = t.split(/[,\s]+/).map((p) => parseInt(p, 10));
      if (parts.length === 3 && parts.every((n) => Number.isFinite(n))) {
        return rgbToHex(
          hslToRgb({
            h: clamp(parts[0], 0, 360),
            s: clamp(parts[1], 0, 100),
            l: clamp(parts[2], 0, 100),
          })
        );
      }
    }
    return null;
  };

  const commit = () => {
    const parsed = parse(text);
    if (parsed) onChange(parsed);
    else setText(formatValue(value, format));
  };

  return (
    <div className="flex flex-col gap-2" ref={wrapRef}>
      <div className="mono-label text-fog/50">{label}</div>

      {/* Swatch — opens the native color picker popup (gradient, hue, eyedropper). */}
      <label className="relative w-full h-12 border border-steel hover:border-kinetic transition-colors overflow-hidden cursor-pointer group">
        <span className="absolute inset-0" style={{ backgroundColor: value }} />
        <span className="absolute top-1.5 right-1.5 z-10 text-fog/70 group-hover:text-kinetic transition-colors pointer-events-none">
          <Pipette size={13} />
        </span>
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 opacity-0 cursor-pointer"
        />
      </label>

      {/* Value input + format dropdown */}
      <div className="flex items-stretch">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === 'Enter' && commit()}
          spellCheck={false}
          className="flex-1 min-w-0 h-9 px-2 text-xs bg-void border border-steel border-r-0 text-fog focus:border-kinetic outline-none"
        />
        <div className="relative">
          <button
            type="button"
            onClick={() => setDropOpen((v) => !v)}
            className="h-full px-2 flex items-center gap-1 bg-void border border-kinetic text-kinetic mono-label text-[0.6rem] hover:bg-kinetic/10 transition-colors"
          >
            {format}
            <ChevronDown size={12} />
          </button>
          {dropOpen && (
            <div className="absolute right-0 top-full mt-px z-50 bg-void border border-steel py-1 min-w-[72px]">
              {FORMATS.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => {
                    setFormat(f);
                    setDropOpen(false);
                  }}
                  className={`w-full text-left px-2.5 py-1.5 mono-label text-[0.6rem] transition-colors ${
                    format === f
                      ? 'text-kinetic bg-kinetic/5'
                      : 'text-fog/70 hover:text-kinetic hover:bg-kinetic/5'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}