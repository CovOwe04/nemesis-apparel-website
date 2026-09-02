import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Upload, Plus } from 'lucide-react';

// Uploads images (logos or icons) to storage and lists them as clickable
// thumbnails. Clicking a thumbnail calls onSelect(url) so the parent can drop
// it onto the jersey canvas.
export default function AssetUploader({ label, hint, assets, onUpload, onSelect }) {
  const [uploading, setUploading] = useState(false);

  const handle = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    try {
      const results = await Promise.all(
        files.map((f) => base44.integrations.Core.UploadFile({ file: f }))
      );
      results.forEach(({ file_url }) => onUpload(file_url));
    } catch {
      alert('Upload failed. Try again.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="mono-label text-fog/50">{label}</div>
        {hint && <span className="mono-label text-fog/30">{hint}</span>}
      </div>
      <label className="relative flex items-center justify-center gap-2 border border-dashed border-steel px-4 py-3 cursor-pointer hover:border-kinetic transition-colors">
        <Upload size={16} className="text-kinetic" />
        <span className="mono-label text-fog/70">{uploading ? 'UPLOADING…' : 'UPLOAD'}</span>
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handle}
          className="absolute inset-0 opacity-0 cursor-pointer"
        />
      </label>

      {assets.length > 0 && (
        <div className="mt-3 grid grid-cols-4 gap-2">
          {assets.map((url) => (
            <button
              key={url}
              type="button"
              onClick={() => onSelect(url)}
              className="relative aspect-square border border-steel hover:border-kinetic overflow-hidden bg-steel group transition-colors"
            >
              <img src={url} alt="asset" className="w-full h-full object-contain" draggable={false} />
              <span className="absolute inset-0 flex items-center justify-center bg-void/0 group-hover:bg-void/40 transition-colors">
                <Plus size={16} className="text-fog opacity-0 group-hover:opacity-100" />
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}