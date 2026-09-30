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

  useEffect(() => {
    let active = true;
    let objectUrl = '';
    setPreviewUrl('');

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
      setPreviewUrl(objectUrl);
    }).catch((error) => {
      if (active) console.error('Jersey preview render failed:', error);
    });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
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
      {previewUrl && <img src={previewUrl} alt="Customized jersey preview" className="block w-full h-full object-fill" />}
    </div>
  );
}