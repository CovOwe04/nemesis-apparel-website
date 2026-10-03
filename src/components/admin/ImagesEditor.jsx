import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Image } from '@/components/ui/image';
import { Trash2, Plus } from 'lucide-react';

// Multi-image editor: each image has optional name and number fields.
// Both are optional for all images. The buy screen uses the name/number
// as preset labels (name takes priority, then number, then a placeholder).
export default function ImagesEditor({ images, onChange }) {
  const [uploading, setUploading] = useState(false);

  const addImage = async (file) => {
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      onChange([...images, { url: file_url, name: '', number: '' }]);
    } catch {
      alert('Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const updateField = (index, field, value) => {
    onChange(images.map((img, i) => (i === index ? { ...img, [field]: value } : img)));
  };

  const removeImage = (index) => {
    onChange(images.filter((_, i) => i !== index));
  };

  const inputCls = "w-full bg-white text-black border border-steel rounded-[6px] px-3 py-2 text-sm placeholder:text-black/40 focus:border-kinetic outline-none transition-colors";

  return (
    <div className="space-y-3">
      {images.map((img, index) => (
        <div key={index} className="flex gap-3 items-start border border-steel rounded-[6px] p-3">
          <div className="w-20 h-24 bg-steel shrink-0 overflow-hidden rounded-[4px]">
            <Image src={img.url} alt="" fittingType="fill" className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 space-y-2">
            <input
              type="text"
              value={img.name || ''}
              onChange={(e) => updateField(index, 'name', e.target.value)}
              placeholder="Name (optional)"
              className={inputCls}
            />
            <input
              type="text"
              inputMode="numeric"
              value={img.number || ''}
              onChange={(e) => updateField(index, 'number', e.target.value.replace(/\D/g, '').slice(0, 3))}
              placeholder="Number (optional)"
              className={inputCls}
            />
            <button
              type="button"
              onClick={() => removeImage(index)}
              className="mono-label text-fog/40 hover:text-kinetic inline-flex items-center gap-1 transition-colors"
            >
              <Trash2 size={12} /> REMOVE
            </button>
          </div>
        </div>
      ))}
      <label className="inline-flex items-center gap-2 border border-steel rounded-[6px] px-4 py-2 cursor-pointer hover:border-kinetic transition-colors">
        <Plus size={16} className="text-fog/60" />
        <span className="mono-label text-fog/60">{uploading ? 'UPLOADING…' : 'ADD IMAGE'}</span>
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) addImage(f); e.target.value = ''; }}
        />
      </label>
    </div>
  );
}