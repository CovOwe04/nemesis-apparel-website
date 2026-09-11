/**
 * Composites name/number text onto an artwork image using the native Canvas API.
 * Positioning formulas match IdentityNameOverlay's 300x400 SVG viewBox.
 * Returns a PNG blob, or throws if compositing fails (e.g. CORS taint).
 */
export async function compositeArtwork(artworkUrl, customName, customNumber, nameStyle, numberStyle, customFontUrl, customFontName) {
  // Load custom font if provided
  if (customFontUrl && customFontName) {
    const id = `fontface-canvas-${customFontName.replace(/\s+/g, '-')}`;
    if (!document.getElementById(id)) {
      const style = document.createElement('style');
      style.id = id;
      style.textContent = `@font-face { font-family: '${customFontName}'; src: url('${customFontUrl}') format('truetype'); }`;
      document.head.appendChild(style);
    }
  }

  // Load artwork image with CORS
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.src = artworkUrl;
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = () => reject(new Error('Failed to load artwork image'));
  });

  const w = img.naturalWidth || 1200;
  const h = img.naturalHeight || 1200;

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');

  // Draw artwork
  ctx.drawImage(img, 0, 0, w, h);

  // Scale from 300x400 SVG viewBox to actual dimensions
  const sx = w / 300;
  const sy = h / 400;

  const fontFam = customFontName
    ? `'${customFontName}', 'Archivo Black', sans-serif`
    : "'Archivo Black', sans-serif";

  // Draw name
  if (customName && nameStyle) {
    const displayName = customName.toUpperCase();
    const nameY = (112.5 + ((nameStyle.vert_pos ?? 50) - 50)) * sy;
    const nameX = (75 + ((nameStyle.horiz_pos ?? 50) / 100) * 150) * sx;
    const nameFontSize = (nameStyle.font_size ?? 8) * sx;

    try { await document.fonts.load(`${nameFontSize}px ${fontFam}`); } catch {}

    ctx.font = `${nameFontSize}px ${fontFam}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = nameStyle.color || '#F5F5F7';

    if (nameStyle.outline) {
      ctx.strokeStyle = nameStyle.outline_color || '#0A0A0A';
      ctx.lineWidth = (nameStyle.outline_thickness ?? 1.4) * sx;
      ctx.lineJoin = 'round';
      ctx.strokeText(displayName, nameX, nameY);
    }
    ctx.fillText(displayName, nameX, nameY);
  }

  // Draw number
  if (customNumber && numberStyle) {
    const numY = (250 + ((numberStyle.vert_pos ?? 50) - 50) * 2) * sy;
    const numX = (75 + ((numberStyle.horiz_pos ?? 50) / 100) * 150) * sx;
    const numFontSize = (numberStyle.font_size ?? 35) * sx;

    try { await document.fonts.load(`${numFontSize}px ${fontFam}`); } catch {}

    ctx.font = `${numFontSize}px ${fontFam}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = numberStyle.color || '#F5F5F7';

    if (numberStyle.outline) {
      ctx.strokeStyle = numberStyle.outline_color || '#0A0A0A';
      ctx.lineWidth = (numberStyle.outline_thickness ?? 1.4) * sx;
      ctx.lineJoin = 'round';
      ctx.strokeText(customNumber, numX, numY);
    }
    ctx.fillText(customNumber, numX, numY);
  }

  // Convert to blob (throws if canvas is tainted by CORS)
  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob((b) => {
      if (b) resolve(b);
      else reject(new Error('Failed to convert canvas to blob'));
    }, 'image/png');
  });

  return blob;
}