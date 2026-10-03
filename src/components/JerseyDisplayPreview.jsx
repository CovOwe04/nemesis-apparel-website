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

  useEffect(() => {
    let active = true;
    let objectUrl = '';

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
    })).then((blob) => {
      if (!blob) throw new Error('Could not render jersey preview.');
      if (!active) return;
      objectUrl = URL.createObjectURL(blob);
      setPrevUrl(previewUrl);
      setPreviewUrl(objectUrl);
    }).catch((error) => {
      if (active) console.error('Jersey preview render failed:', error);
    });

    return () => {
      active = false;
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
          className="absolute inset-0 block w-full h-full object-fill" />
      )}
      {previewUrl && (
        <img key={previewUrl} src={previewUrl} alt="Customized jersey preview"
          className="absolute inset-0 block w-full h-full object-fill animate-in fade-in duration-300" />
      )}
    </div>
  );
}