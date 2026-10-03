import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Trash2, Plus } from 'lucide-react';

export default function ColorsEditor({ colors, onChange, jerseyId }) {
  const [uploading, setUploading] = useState(null);

  const addColor = () => {
    onChange([...colors, { name: '', hex: '#000000', images: [] }]);
  };

  const updateColor = (index, field, value) => {
    onChange(colors.map((c, i) => (i === index ? { ...c, [field]: value } : c)));
  };

  const removeColor = (index) => {
    onChange(colors.filter((_, i) => i !== index));
  };

  const setImage = async (colorIndex, file) => {
    setUploading(colorIndex);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      onChange(colors.map((c, i) =>
        i === colorIndex ? { ...c, images: [{ url: file_url }] } : c
      ));
    } catch {
      alert('Upload failed.');
    } finally {
      setUploading(null);
    }
  };

  const removeImage = (colorIndex) => {
    onChange(colors.map((c, i) =>
      i === colorIndex ? { ...c, images: [] } : c
    ));
  };

  const inputCls = "flex-1 min-w-0 bg-white text-black border border-steel rounded-[6px] px-3 py-2 text-sm placeholder:text-black/40 focus:border-kinetic outline-none transition-colors";

  return (
    <div className="space-y-4">
      {colors.map((color, ci) => (
        <div key={ci} className="border border-steel rounded-[6px] p-4">
          <div className="flex items-center gap-3">
            {color.images[0] ? (
              <div className="relative w-24 h-24 shrink-0 overflow-hidden rounded-[12px] group">
                <img src={color.images[0].url} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeImage(ci)}
                  className="absolute top-1 right-1 bg-void/80 text-fog p-1 rounded-[4px] opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Remove image"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ) : (
              <label className="w-24 h-24 shrink-0 border border-dashed border-steel rounded-[12px] flex items-center justify-center cursor-pointer hover:border-kinetic transition-colors">
                {uploading === ci ? (
                  <span className="mono-label text-fog/40 text-[0.5rem]">...</span>
                ) : (
                  <Plus size={20} className="text-fog/40" />
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) setImage(ci, f); e.target.value = ''; }}
                />
              </label>
            )}
            <input
              type="color"
              value={color.hex || '#000000'}
              onChange={(e) => updateColor(ci, 'hex', e.target.value)}
              className="w-10 h-10 bg-white border border-steel rounded-[4px] cursor-pointer shrink-0"
            />
            <input
              type="text"
              value={color.name || ''}
              onChange={(e) => updateColor(ci, 'name', e.target.value)}
              placeholder="Color name (e.g. Blackout)"
              className={inputCls}
            />
            <button
              type="button"
              onClick={() => removeColor(ci)}
              className="text-fog/40 hover:text-kinetic transition-colors shrink-0"
              aria-label="Remove color"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={addColor}
        className="inline-flex items-center gap-2 border border-steel rounded-[6px] px-4 py-2 hover:border-kinetic transition-colors"
      >
        <Plus size={16} className="text-fog/60" />
        <span className="mono-label text-fog/60">ADD COLOR</span>
      </button>
    </div>
  );
}