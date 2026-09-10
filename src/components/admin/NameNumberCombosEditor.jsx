import { Trash2, Plus } from 'lucide-react';

export default function NameNumberCombosEditor({ combos, onChange }) {
  const addCombo = () => {
    onChange([...combos, { name: '', number: '' }]);
  };

  const updateCombo = (index, field, value) => {
    onChange(combos.map((c, i) => (i === index ? { ...c, [field]: value } : c)));
  };

  const removeCombo = (index) => {
    onChange(combos.filter((_, i) => i !== index));
  };

  const inputCls = "bg-white text-black border border-steel rounded-[6px] px-3 py-2 text-sm placeholder:text-black/40 focus:border-kinetic outline-none transition-colors";

  return (
    <div className="space-y-3">
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