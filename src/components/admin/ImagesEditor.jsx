import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Image } from '@/components/ui/image';
import { Upload, Trash2, Plus } from 'lucide-react';

// Multi-image editor: the first image is mandatory (name optional, defaults
// to "Base" on save). Additional images require a name. Images are not
// labeled as front/back — they show the product from whichever angle.
export default function ImagesEditor({ images, onChange }) {
  const [uploading, setUploading] = useState(false);

  const addImage = async (file) => {
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      onChange([...images, { url: file_url, name: '' }]);
    } catch {
      alert('Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const updateName = (index, value) => {
    onChange(images.map((img, i) => (i === index ? { ...img, name: value } : img)));
  };

  const removeImage = (index) => {
    onChange(images.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      {images.map((img, index) => (
        <div key={index} className="flex gap-3 items-start border border-steel rounded-[6px] p-3">
          <div className="w-20 h-24 bg-steel shrink-0 overflow-hidden rounded-[4px]">
            <Image src={img.url} alt="" fittingType="fill" className="w-full h-full" />
          </div>
          <div className="flex-1">
            <input
              type="text"
              value={img.name || ''}
              onChange={(e) => updateName(index, e.target.value)}
              placeholder={index === 0 ? 'Base (optional)' : 'Name (required)'}
              className="w-full bg-white text-black border border-steel rounded-[6px] px-3 py-2 text-sm placeholder:text-black/40 focus:border-kinetic outline-none"
            />
            <button
              type="button"
              onClick={() => removeImage(index)}
              className="mt-2 mono-label text-fog/40 hover:text-kinetic inline-flex items-center gap-1 transition-colors"
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