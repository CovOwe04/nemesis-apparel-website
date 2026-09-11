// Canvas-based utility to composite name/number text onto print-ready artwork files.
// Uses the same positioning formulas as IdentityNameOverlay/StaticNameOverlay
// so the artwork matches the display photo preview.

const DEFAULT_NAME_STYLE = {
  color: '#F5F5F7', outline: true, outline_color: '#0A0A0A', outline_thickness: 1.4,
  arch: 0, rise: 0, flag: 0, horiz_pos: 12, vert_pos: 99, font_size: 8,
};
const DEFAULT_NUMBER_STYLE = {
  color: '#F5F5F7', outline: true, outline_color: '#0A0A0A', outline_thickness: 1.4,
  arch: 0, rise: 0, flag: 0, horiz_pos: 12, vert_pos: 23, font_size: 35,
};

function ensureFontLoaded(customFontUrl, customFontName) {
  if (!customFontUrl || !customFontName) return;
  const id = `fontface-${customFontName.replace(/\s+/g, '-')}`;
  if (document.getElementById(id)) return;
  const style = document.createElement('style');
  style.id = id;
  style.textContent = `@font-face { font-family: '${customFontName}'; src: url('${customFontUrl}') format('truetype'); }`;
  document.head.appendChild(style);
}

function loadImage(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
    setTimeout(() => resolve(img), 5000);
  });
}

/**
 * Composites name and number text onto an artwork image using canvas.
 * Returns a PNG Blob, or null if the image could not be loaded.
 *
 * Positioning mirrors the SVG overlay (viewBox 300x400):
 *   Name X:  (25 + horiz_pos/2) % of width
 *   Name Y:  (62.5 + vert_pos) / 400 * height
 *   Number X: (25 + horiz_pos/2) % of width
 *   Number Y: (150 + 2*vert_pos) / 400 * height
 *   Font size: (font_size / 300) * width
 */
export async function compositeArtworkWithName(artworkUrl, {
  name,
  number,
  nameStyle = {},
  numberStyle = {},
  customFontUrl = '',
  customFontName = '',
}) {
  ensureFontLoaded(customFontUrl, customFontName);

  const fontFam = customFontName
    ? `'${customFontName}', 'Archivo Black', sans-serif`
    : "'Archivo Black', sans-serif";

  // Ensure fonts are ready before drawing
  try {
    await document.fonts.load(`1px ${fontFam}`);
    await document.fonts.ready;
  } catch (e) {
    // continue even if font loading fails
  }

  const img = await loadImage(artworkUrl);
  if (!img || !img.naturalWidth) return null;

  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);

  const w = canvas.width;
  const h = canvas.height;

  // Draw name
  if (name) {
    const ns = { ...DEFAULT_NAME_STYLE, ...nameStyle };
    const nameX = (25 + ns.horiz_pos / 2) / 100 * w;
    const nameY = (62.5 + ns.vert_pos) / 400 * h;
    const nameFontSize = (ns.font_size / 300) * w;

    ctx.font = `${nameFontSize}px ${fontFam}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (ns.outline) {
      ctx.strokeStyle = ns.outline_color;
      ctx.lineWidth = (ns.outline_thickness / 300) * w * 2;
      ctx.lineJoin = 'round';
      ctx.strokeText(name.toUpperCase(), nameX, nameY);
    }
    ctx.fillStyle = ns.color;
    ctx.fillText(name.toUpperCase(), nameX, nameY);
  }

  // Draw number
  if (number) {
    const nus = { ...DEFAULT_NUMBER_STYLE, ...numberStyle };
    const numX = (25 + nus.horiz_pos / 2) / 100 * w;
    const numY = (150 + 2 * nus.vert_pos) / 400 * h;
    const numFontSize = (nus.font_size / 300) * w;

    ctx.font = `${numFontSize}px ${fontFam}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (nus.outline) {
      ctx.strokeStyle = nus.outline_color;
      ctx.lineWidth = (nus.outline_thickness / 300) * w * 2;
      ctx.lineJoin = 'round';
      ctx.strokeText(number, numX, numY);
    }
    ctx.fillStyle = nus.color;
    ctx.fillText(number, numX, numY);
  }

  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}