import { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Upload, X, Loader2, Image as ImageIcon } from 'lucide-react';

const PIECES = [
  { key: 'artwork_front', label: 'FRONT' },
  { key: 'artwork_back', label: 'BACK' },
  { key: 'artwork_sleeve', label: 'SLEEVE' },
  { key: 'artwork_hood', label: 'HOOD' },
];

export default function ArtworkUploader({ artwork, onChange }) {
  const [uploading, setUploading] = useState(null);
  const fileRefs = useRef({});

  const handleUpload = async (key, file) => {
    if (!file) return;
    setUploading(key);
    try {
      const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });
      onChange({ ...artwork, [key]: file_url });
    } catch (err) {
      console.error('Artwork upload failed:', err);
      alert('Upload failed: ' + (err?.message || 'unknown error'));
    } finally {
      setUploading(null);
      if (fileRefs.current[key]) fileRefs.current[key].value = '';
    }
  };

  const handleRemove = (key) => {
    onChange({ ...artwork, [key]: '' });
  };

  return (
    <div>
      <label className="mono-label text-fog/50 block mb-2">FULFILLMENT ARTWORK</label>
      <p className="mono-label text-fog/30 text-[0.6rem] mb-3">
        Print-ready files sent to Merchize on Generate. Used for front, back, sleeve & hood printing.
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {PIECES.map(({ key, label }) => {
          const url = artwork?.[key] || '';
          const isUploading = uploading === key;
          return (
            <div key={key} className="border border-steel rounded-[4px] p-2">
              <div className="mono-label text-fog/40 text-[0.6rem] mb-2">{label}</div>
              {url ? (
                <div className="relative group">
                  <div className="aspect-square bg-void border border-steel rounded-[2px] overflow-hidden">
                    <img src={url} alt={label} className="w-full h-full object-contain" />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemove(key)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-kinetic text-void rounded-full flex items-center justify-center hover:bg-fog transition-colors"
                  >
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileRefs.current[key]?.click()}
                  disabled={isUploading}
                  className="w-full aspect-square border border-dashed border-steel rounded-[2px] flex flex-col items-center justify-center gap-1.5 text-fog/30 hover:text-kinetic hover:border-kinetic transition-colors disabled:opacity-60"
                >
                  {isUploading ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <>
                      <Upload size={16} />
                      <span className="mono-label text-[0.55rem]">UPLOAD</span>
                    </>
                  )}
                </button>
              )}
              <input
                ref={(el) => { fileRefs.current[key] = el; }}
                type="file"
                accept="image/png,image/jpeg,image/svg+xml"
                className="hidden"
                onChange={(e) => handleUpload(key, e.target.files?.[0])}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}