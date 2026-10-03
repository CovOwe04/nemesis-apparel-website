import { useEffect, useRef, useState } from 'react';
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
  const [rendering, setRendering] = useState(false);
  const currentUrlRef = useRef('');

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
        // Revoke the previous URL only after the new one is ready,
        // so the backing image never swaps to a dead URL.
        if (currentUrlRef.current) URL.revokeObjectURL(currentUrlRef.current);
        objectUrl = URL.createObjectURL(blob);
        currentUrlRef.current = objectUrl;
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
      // If this run never produced a URL, nothing to revoke yet.
      // The current backing URL is revoked on the next successful render.
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

  // Revoke the last URL on unmount.
  useEffect(() => {
    return () => {
      if (currentUrlRef.current) URL.revokeObjectURL(currentUrlRef.current);
    };
  }, []);

  return (
    <div className={`relative overflow-hidden bg-black ${className}`}>
      {previewUrl && (
        <img
          key={previewUrl}
          src={previewUrl}
          alt="Customized jersey preview"
          className={`absolute inset-0 block w-full h-full object-fill transition-[filter,opacity] duration-300 ${rendering ? 'blur-[3px] opacity-80' : 'blur-0 opacity-100'} animate-in fade-in duration-300`}
        />
      )}
      {rendering && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-6 h-6 border-2 border-white/20 border-t-white/80 rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}