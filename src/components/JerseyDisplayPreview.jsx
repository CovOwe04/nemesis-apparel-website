import { useEffect, useState } from 'react';
import { renderJerseyDisplayToBlob } from '@/components/admin/canvasOverlayRenderer';

export default function JerseyDisplayPreview({
  imageUrl,
  jersey,
  color,
  customName = '',
  customNumber = '',
  fontId = 'block',
  letterSpacing = 0,
  enableName = true,
  enableNumber = true,
  showNamePlaceholder = false,
  showNumberPlaceholder = false,
  className = '',
}) {
  const [previewUrl, setPreviewUrl] = useState('');
  const [prevUrl, setPrevUrl] = useState('');
  const [rendering, setRendering] = useState(false);

  useEffect(() => {
    let active = true;
    let objectUrl = '';
    let timer;

    setRendering(true);
    timer = setTimeout(() => {
      Promise.resolve().then(() => renderJerseyDisplayToBlob({
        imageUrl,
        jersey,
        color,
        customName: customName || (showNamePlaceholder ? 'YOUR NAME' : ''),
        customNumber: customNumber || (showNumberPlaceholder ? '00' : ''),
        fontId,
        letterSpacing,
        enableName,
        enableNumber,
        preview: true,
      })).then((blob) => {
        if (!blob) throw new Error('Could not render jersey preview.');
        if (!active) return;
        objectUrl = URL.createObjectURL(blob);
        setPrevUrl(previewUrl);
        setPreviewUrl(objectUrl);
        setRendering(false);
      }).catch((error) => {
        if (active) {
          console.error('Jersey preview render failed:', error);
          setRendering(false);
        }
      });
    }, 180);

    return () => {
      active = false;
      clearTimeout(timer);
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    imageUrl,
    jersey,
    color,
    customName,
    customNumber,
    fontId,
    letterSpacing,
    enableName,
    enableNumber,
    showNamePlaceholder,
    showNumberPlaceholder,
  ]);

  return (
    <div className={`relative overflow-hidden bg-black ${className}`}>
      {prevUrl && (
        <img src={prevUrl} alt="" aria-hidden="true"
          className={`absolute inset-0 block w-full h-full object-fill transition-[filter,opacity] duration-300 ${rendering ? 'blur-[3px] opacity-80' : 'blur-0 opacity-100'}`} />
      )}
      {previewUrl && (
        <img key={previewUrl} src={previewUrl} alt="Customized jersey preview"
          className={`absolute inset-0 block w-full h-full object-fill transition-[filter,opacity] duration-300 ${rendering ? 'blur-[3px] opacity-80' : 'blur-0 opacity-100'} animate-in fade-in duration-300`} />
      )}
      {rendering && (
        <div className="absolute top-3 right-3 flex items-center gap-2 pointer-events-none">
          <div className="w-4 h-4 border border-white/30 border-t-white/80 rounded-full animate-spin" />
          <span className="mono-label text-white/60 text-[0.6rem]">Rendering</span>
        </div>
      )}
    </div>
  );
}