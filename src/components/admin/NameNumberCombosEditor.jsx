import { Trash2, Plus, Upload } from 'lucide-react';
import { useState } from 'react';

function parsePresets(input) {
  const text = input.trim();
  if (!text) return [];

  if (text.includes(';')) {
    return text.split(';').map((part) => {
      const [name, number] = part.split(',').map((s) => s.trim());
      return { name: name || '', number: (number || '').replace(/\D/g, '').slice(0, 3) };
    }).filter((c) => c.name || c.number);
  }
  return text.split(',').map((s) => s.trim()).filter((s) => s).map((name) => ({ name, number: '' }));
}

export default function NameNumberCombosEditor({ combos, onChange }) {
  const [bulkText, setBulkText] = useState('');

  const addCombo = () => {
    onChange([...combos, { name: '', number: '' }]);
  };

  const updateCombo = (index, field, value) => {
    onChange(combos.map((c, i) => (i === index ? { ...c, [field]: value } : c)));
  };

  const removeCombo = (index) => {
    onChange(combos.filter((_, i) => i !== index));
  };

  const importBulk = () => {
    const parsed = parsePresets(bulkText);
    if (parsed.length > 0) {
      onChange([...combos, ...parsed]);
      setBulkText('');
    }
  };

  const inputCls = "bg-white text-black border border-steel rounded-[6px] px-3 py-2 text-sm placeholder:text-black/40 focus:border-kinetic outline-none transition-colors";

  return (
    <div className="space-y-3">
      <div className="border border-steel rounded-[6px] p-3 bg-steel/20">
        <div className="mono-label text-fog/50 mb-1.5">BULK IMPORT</div>
        <textarea
          value={bulkText}
          onChange={(e) => setBulkText(e.target.value)}
          placeholder="With numbers: nameone, 13; nametwo, 40"
          rows={2}
          className={`${inputCls} w-full resize-none text-xs`}
        />
        <p className="mono-label text-fog/30 text-[0.6rem] mt-1 mb-2">
          Semicolons = name/number pairs. Commas only = names without numbers.
        </p>
        <button
          type="button"
          onClick={importBulk}
          className="inline-flex items-center gap-2 border border-steel rounded-[6px] px-3 py-1.5 hover:border-kinetic transition-colors"
        >
          <Upload size={14} className="text-fog/60" />
          <span className="mono-label text-fog/60 text-[0.65rem]">IMPORT PRESETS</span>
        </button>
      </div>

      {combos.map((combo, i) => (
        <div key={i} className="flex gap-3 items-center">
          <input
            type="text"
            value={combo.name || ''}
            onChange={(e) => updateCombo(i, 'name', e.target.value)}
            placeholder="Name (e.g. JOHN)"
            className={`${inputCls} flex-1 min-w-0 w-full`}
          />
          <input
            type="text"
            inputMode="numeric"
            value={combo.number || ''}
            onChange={(e) => updateCombo(i, 'number', e.target.value.replace(/\D/g, '').slice(0, 3))}
            placeholder="Number"
            className={`${inputCls} w-24 shrink-0`}
          />
          <button
            type="button"
            onClick={() => removeCombo(i)}
            className="text-fog/40 hover:text-kinetic transition-colors shrink-0"
            aria-label="Remove preset"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={addCombo}
        className="inline-flex items-center gap-2 border border-steel rounded-[6px] px-4 py-2 hover:border-kinetic transition-colors"
      >
        <Plus size={16} className="text-fog/60" />
        <span className="mono-label text-fog/60">ADD PRESET</span>
      </button>
    </div>
  );
}