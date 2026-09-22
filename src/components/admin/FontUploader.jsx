import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Upload } from 'lucide-react';

export default function FontUploader({ fontUrl, fontName, onChange }) {
  const [uploading, setUploading] = useState(false);
  const [fontLibrary, setFontLibrary] = useState([]);

  useEffect(() => {
    base44.entities.Font.list('name', 200)
      .then((fonts) => setFontLibrary(fonts || []))
      .catch(() => setFontLibrary([]));
  }, []);

  const checksumOf = async (file) => {
    if (!globalThis.crypto?.subtle) return `${file.name.toLowerCase()}-${file.size}`;
    const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
    return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
  };

  const handle = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const checksum = await checksumOf(file);
      const existing = fontLibrary.find((font) => font.checksum === checksum);
      if (existing) {
        onChange({ url: existing.file_url, name: existing.name });
        return;
      }

      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const name = file.name.replace(/\.[^.]+$/, '');
      const savedFont = await base44.entities.Font.create({ name, file_url, checksum });
      setFontLibrary((fonts) => [...fonts, savedFont]);
      onChange({ url: file_url, name });
    } catch {
      alert('Font could not be saved to the shared font library. Check the admin connection and try again.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <label className="inline-flex items-center gap-2 border border-steel px-3 py-2 cursor-pointer hover:border-kinetic transition-colors rounded-[6px]">
          <Upload size={14} className="text-fog/60" />
          <span className="mono-label text-fog/60 text-[0.65rem]">{uploading ? 'SAVING FONT…' : 'ADD FONT TO LIBRARY'}</span>
          <input type="file" accept=".ttf,.otf,.woff,.woff2" onChange={handle} className="hidden" disabled={uploading} />
        </label>
        {fontUrl && (
          <button type="button" onClick={() => onChange({ url: '', name: '' })}
            className="mono-label text-fog/40 hover:text-kinetic text-[0.65rem] transition-colors">
            USE DEFAULT FONT
          </button>
        )}
      </div>
      <select
        value={fontUrl || ''}
        onChange={(e) => {
          const selected = fontLibrary.find((font) => font.file_url === e.target.value);
          onChange(selected ? { url: selected.file_url, name: selected.name } : { url: '', name: '' });
        }}
        className="w-full bg-white text-black border border-steel rounded-[6px] px-3 py-2 text-xs focus:border-kinetic outline-none"
      >
        <option value="">Choose a saved custom font…</option>
        {fontUrl && !fontLibrary.some((font) => font.file_url === fontUrl) && (
          <option value={fontUrl}>Current font: {fontName}</option>
        )}
        {fontLibrary.map((font) => (
          <option key={font.id} value={font.file_url}>{font.name}</option>
        ))}
      </select>
    </div>
  );
}
