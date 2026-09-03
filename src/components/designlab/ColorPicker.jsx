import { useState, useEffect } from 'react';

// Color picker with three input modes: HEX, RGB, HSL. The native swatch picker
// stays available in all modes. The stored value is always a hex string, so the
// parent API (value/onChange) is unchanged from the old ColorField.

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
  return {
    r: (r1 + m) * 255,
    g: (g1 + m) * 255,
    b: (b1 + m) * 255,
  };
}

const MODES = ['HEX', 'RGB', 'HSL'];

export default function ColorPicker({ label, value, onChange }) {
  const [mode, setMode] = useState('HEX');
  const rgb = hexToRgb(value);
  const hsl = rgbToHsl(rgb);

  // Local text state per mode so typing partial values doesn't snap.
  const [hexText, setHexText] = useState(value);
  const [rgbText, setRgbText] = useState({ r: rgb.r, g: rgb.g, b: rgb.b });
  const [hslText, setHslText] = useState({ h: hsl.h, s: hsl.s, l: hsl.l });

  // Sync local text when the external value changes (preset apply, etc.).
  useEffect(() => {
    const r = hexToRgb(value);
    const h = rgbToHsl(r);
    setHexText(value);
    setRgbText({ r: r.r, g: r.g, b: r.b });
    setHslText({ h: h.h, s: h.s, l: h.l });
  }, [value]);

  const commitHex = (txt) => {
    let t = txt.trim();
    if (t && !t.startsWith('#')) t = '#' + t;
    if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(t)) onChange(t.toLowerCase());
  };

  const commitRgb = (field, val) => {
    const next = { ...rgbText, [field]: clamp(parseInt(val, 10) || 0, 0, 255) };
    setRgbText(next);
    onChange(rgbToHex(next));
  };

  const commitHsl = (field, val) => {
    const max = field === 'h' ? 360 : 100;
    const next = { ...hslText, [field]: clamp(parseInt(val, 10) || 0, 0, max) };
    setHslText(next);
    onChange(rgbToHex(hslToRgb(next)));
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="mono-label text-fog/50">{label}</div>
        <div className="flex">
          {MODES.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`mono-label px-1.5 py-0.5 text-[0.6rem] border transition-colors ${
                mode === m
                  ? 'border-kinetic text-kinetic bg-kinetic/5'
                  : 'border-steel text-fog/50 hover:text-fog hover:border-fog/40'
              } ${m === 'HEX' ? 'border-r-0' : m === 'RGB' ? 'border-r-0' : ''}`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <div className="relative w-full h-12 border border-steel hover:border-kinetic transition-colors overflow-hidden group">
        <span className="absolute inset-0" style={{ backgroundColor: value }} />
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 opacity-0 cursor-pointer"
        />
      </div>

      {mode === 'HEX' && (
        <input
          type="text"
          value={hexText}
          onChange={(e) => setHexText(e.target.value)}
          onBlur={(e) => commitHex(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && commitHex(e.target.value)}
          className="w-full h-9 px-2 mono-label text-xs bg-void border border-steel text-fog focus:border-kinetic outline-none uppercase"
          spellCheck={false}
          maxLength={7}
        />
      )}

      {mode === 'RGB' && (
        <div className="grid grid-cols-3 gap-1">
          {['r', 'g', 'b'].map((f) => (
            <div key={f} className="flex flex-col">
              <span className="mono-label text-fog/30 text-[0.55rem] mb-0.5 text-center">{f.toUpperCase()}</span>
              <input
                type="number"
                min="0"
                max="255"
                value={rgbText[f]}
                onChange={(e) => commitRgb(f, e.target.value)}
                className="no-spinner w-full h-9 px-1 text-center mono-label text-xs bg-void border border-steel text-fog focus:border-kinetic outline-none"
              />
            </div>
          ))}
        </div>
      )}

      {mode === 'HSL' && (
        <div className="grid grid-cols-3 gap-1">
          {[
            { f: 'h', max: 360, suf: '°' },
            { f: 's', max: 100, suf: '%' },
            { f: 'l', max: 100, suf: '%' },
          ].map(({ f, max, suf }) => (
            <div key={f} className="flex flex-col">
              <span className="mono-label text-fog/30 text-[0.55rem] mb-0.5 text-center">{f.toUpperCase()}{suf}</span>
              <input
                type="number"
                min="0"
                max={max}
                value={hslText[f]}
                onChange={(e) => commitHsl(f, e.target.value)}
                className="no-spinner w-full h-9 px-1 text-center mono-label text-xs bg-void border border-steel text-fog focus:border-kinetic outline-none"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}