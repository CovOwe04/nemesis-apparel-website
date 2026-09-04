import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Upload, Type } from 'lucide-react';

// Uploads a custom font file (.ttf/.otf/.woff) and reports the URL + chosen name
// back to the parent. The parent stores both on the Jersey entity so the
// Identity Lab and admin preview can load the font via an injected @font-face.
export default function FontUploader({ fontUrl, fontName, onChange }) {
  const [uploading, setUploading] = useState(false);

  const handle = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const name = file.name.replace(/\.[^.]+$/, '');
      onChange({ url: file_url, name });
    } catch {
      alert('Font upload failed. Try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="border border-steel rounded-[6px] p-4">
      <div className="mono-label text-fog/50 mb-3">CUSTOM FONT</div>
      {fontUrl ? (
        <div className="flex items-center gap-3 mb-3">
          <Type size={18} className="text-kinetic" />
          <div className="flex-1 min-w-0">
            <div className="font-display text-fog text-sm truncate">{fontName || 'Unnamed font'}</div>
            <div className="mono-label text-fog/30 truncate">{fontUrl}</div>
          </div>
          <button
            type="button"
            onClick={() => onChange({ url: '', name: '' })}
            className="mono-label text-fog/40 hover:text-kinetic transition-colors"
          >
            REMOVE
          </button>
        </div>
      ) : (
        <p className="text-fog/40 text-sm mb-3">Upload a .ttf, .otf, or .woff file to use as the jersey text font.</p>
      )}
      <label className="inline-flex items-center gap-2 border border-steel px-4 py-2 cursor-pointer hover:border-kinetic transition-colors rounded-[6px]">
        <Upload size={16} className="text-fog/60" />
        <span className="mono-label text-fog/60">{uploading ? 'UPLOADING…' : 'UPLOAD FONT'}</span>
        <input type="file" accept=".ttf,.otf,.woff,.woff2" onChange={handle} className="hidden" />
      </label>
    </div>
  );
}