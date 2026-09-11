import { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Upload, X, Loader2, Image as ImageIcon } from 'lucide-react';

const PIECES = [
  { key: 'artwork_front', label: 'FRONT' },
  { key: 'artwork_back', label: 'BACK' },
  { key: 'artwork_sleeve', label: 'SLEEVE' },
  { key: 'artwork_hood', label: 'HOOD' },
];

const PIECE_MAP = {
  artwork_front: 'front',
  artwork_back: 'back',
  artwork_sleeve: 'sleeve',
  artwork_hood: 'hood',
};

export default function ArtworkUploader({ artwork, onChange, compact = false, jerseyId, colorName }) {
  const [uploading, setUploading] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState('');
  const fileRefs = useRef({});

  const syncToMerchize = async (updatedArtwork) => {
    if (!jerseyId || !colorName) return;
    setSyncing(true);
    setSyncStatus('');
    try {
      const merchizeArtwork = {};
      for (const [k, v] of Object.entries(updatedArtwork)) {
        if (PIECE_MAP[k] && v) merchizeArtwork[PIECE_MAP[k]] = v;
      }
      const res = await base44.functions.invoke('upload-merchize-artwork', {
        jerseyId,
        color_name: colorName,
        artwork: merchizeArtwork,
      });
      if (res.data?.error) {
        setSyncStatus('error');
        console.error('Merchize artwork sync:', res.data.error);
      } else {
        setSyncStatus('done');
      }
    } catch (err) {
      setSyncStatus('error');
      console.error('Merchize artwork sync failed:', err);
    } finally {
      setSyncing(false);
    }
  };

  const handleUpload = async (key, file) => {
    if (!file) return;
    setUploading(key);
    try {
      const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });
      const updatedArtwork = { ...artwork, [key]: file_url };
      onChange(updatedArtwork);
      syncToMerchize(updatedArtwork);
    } catch (err) {
      console.error('Artwork upload failed:', err);
      alert('Upload failed: ' + (err?.message || 'unknown error'));
    } finally {
      setUploading(null);
      if (fileRefs.current[key]) fileRefs.current[key].value = '';
    }
  };

  const handleRemove = (key) => {
    const updatedArtwork = { ...artwork, [key]: '' };
    onChange(updatedArtwork);
    syncToMerchize(updatedArtwork);
  };

  return (
    <div>
      {!compact && (
        <>
          <label className="mono-label text-fog/50 block mb-2">FULFILLMENT ARTWORK</label>
          <p className="mono-label text-fog/30 text-[0.6rem] mb-3">
            Print-ready files sent to Merchize on Generate. Used for front, back, sleeve & hood printing.
          </p>
        </>
      )}
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
      {jerseyId && colorName && (
        <div className="mt-2">
          {syncing && (
            <span className="mono-label text-fog/50 text-[0.55rem] flex items-center gap-1">
              <Loader2 size={10} className="animate-spin" /> SYNCING TO MERCHIZE…
            </span>
          )}
          {!syncing && syncStatus === 'done' && (
            <span className="mono-label text-kinetic text-[0.55rem]">ARTWORK SYNCED TO MERCHIZE</span>
          )}
          {!syncing && syncStatus === 'error' && (
            <span className="mono-label text-red-500 text-[0.55rem]">MERCHIZE SYNC FAILED — CHECK CONSOLE</span>
          )}
        </div>
      )}
    </div>
  );
}