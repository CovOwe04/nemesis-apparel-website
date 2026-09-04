import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Upload } from 'lucide-react';

// Minimal font uploader: just the button, with the font name and a remove
// link shown inline when a font is already uploaded.
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
      e.target.value = '';
    }
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <label className="inline-flex items-center gap-2 border border-steel px-3 py-2 cursor-pointer hover:border-kinetic transition-colors rounded-[6px]">
        <Upload size={14} className="text-fog/60" />
        <span className="mono-label text-fog/60 text-[0.65rem]">{uploading ? 'UPLOADING…' : 'UPLOAD FONT'}</span>
        <input type="file" accept=".ttf,.otf,.woff,.woff2" onChange={handle} className="hidden" />
      </label>
      {fontUrl && (
        <>
          <span className="mono-label text-fog/40 text-[0.65rem] truncate max-w-32">{fontName}</span>
          <button type="button" onClick={() => onChange({ url: '', name: '' })}
            className="mono-label text-fog/40 hover:text-kinetic text-[0.65rem] transition-colors">
            REMOVE
          </button>
        </>
      )}
    </div>
  );
}