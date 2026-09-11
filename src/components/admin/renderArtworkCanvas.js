// Renders artwork image + SVG name/number overlay to a canvas blob.
// Uses native SVG serialization (not html2canvas) so textPath, stroke, and
// custom fonts render exactly as the browser displays them in the designer.

const GOOGLE_FONT_CSS_URLS = {
  'Archivo Black': 'https://fonts.googleapis.com/css2?family=Archivo+Black',
  'Anton': 'https://fonts.googleapis.com/css2?family=Anton',
  'Oswald': 'https://fonts.googleapis.com/css2?family=Oswald:wght@500',
  'Space Grotesk': 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500',
  'Inter': 'https://fonts.googleapis.com/css2?family=Inter:wght@400',
};

const fontCache = {};

async function fetchGoogleFontBase64(fontFamily) {
  if (fontCache[fontFamily]) return fontCache[fontFamily];
  const cssUrl = GOOGLE_FONT_CSS_URLS[fontFamily];
  if (!cssUrl) return null;
  try {
    const cssRes = await fetch(cssUrl);
    const css = await cssRes.text();
    const urlMatch = css.match(/src:\s*url\(([^)]+)\)/);
    if (!urlMatch) return null;
    const fontUrl = urlMatch[1].replace(/['"]/g, '');
    const fontRes = await fetch(fontUrl);
    const blob = await fontRes.blob();
    const base64 = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
    fontCache[fontFamily] = base64;
    return base64;
  } catch (err) {
    console.error(`Failed to fetch font ${fontFamily}:`, err);
    return null;
  }
}

async function fetchCustomFontBase64(url, name) {
  const cacheKey = `custom:${name}`;
  if (fontCache[cacheKey]) return fontCache[cacheKey];
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const base64 = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
    fontCache[cacheKey] = base64;
    return base64;
  } catch (err) {
    console.error(`Failed to fetch custom font ${name}:`, err);
    return null;
  }
}

export async function renderArtworkToBlob(container, artworkUrl, renderW, renderH, customFontUrl, customFontName, fontFam) {
  const scale = 2;
  const canvas = document.createElement('canvas');
  canvas.width = renderW * scale;
  canvas.height = renderH * scale;
  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);

  // 1. Draw artwork image
  const artworkImg = new Image();
  artworkImg.crossOrigin = 'anonymous';
  artworkImg.src = artworkUrl;
  await new Promise((resolve) => {
    artworkImg.onload = () => resolve();
    artworkImg.onerror = () => resolve();
    setTimeout(resolve, 5000);
  });
  ctx.drawImage(artworkImg, 0, 0, renderW, renderH);

  // 2. Get SVG from container
  const svg = container.querySelector('svg');
  if (!svg) {
    return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  }

  // 3. Clone SVG and set explicit dimensions
  const svgClone = svg.cloneNode(true);
  svgClone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  svgClone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
  svgClone.setAttribute('width', renderW);
  svgClone.setAttribute('height', renderH);

  // 4. Embed fonts so the SVG renders correctly in isolation
  const fontStyles = [];

  if (customFontUrl && customFontName) {
    const base64 = await fetchCustomFontBase64(customFontUrl, customFontName);
    if (base64) {
      const ext = customFontUrl.split('.').pop()?.toLowerCase();
      const format = ext === 'ttf' ? 'truetype' : ext === 'otf' ? 'opentype' : ext === 'woff2' ? 'woff2' : ext === 'woff' ? 'woff' : 'truetype';
      fontStyles.push(`@font-face { font-family: '${customFontName}'; font-weight: normal; src: url('${base64}') format('${format}'); }`);
    }
  }

  const builtInFontName = fontFam.match(/'([^']+)'/)?.[1];
  if (builtInFontName && builtInFontName !== customFontName && GOOGLE_FONT_CSS_URLS[builtInFontName]) {
    const base64 = await fetchGoogleFontBase64(builtInFontName);
    if (base64) {
      fontStyles.push(`@font-face { font-family: '${builtInFontName}'; font-weight: normal; src: url('${base64}') format('woff2'); }`);
    }
  }

  if (fontStyles.length > 0) {
    const styleEl = document.createElementNS('http://www.w3.org/2000/svg', 'style');
    styleEl.textContent = fontStyles.join('\n');
    svgClone.insertBefore(styleEl, svgClone.firstChild);
  }

  // 5. Serialize SVG to blob URL
  const svgString = new XMLSerializer().serializeToString(svgClone);
  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const svgUrl = URL.createObjectURL(svgBlob);

  // 6. Load SVG as image (browser renders it natively, including textPath & stroke)
  const svgImg = new Image();
  await new Promise((resolve) => {
    svgImg.onload = () => resolve();
    svgImg.onerror = () => resolve();
    setTimeout(resolve, 5000);
    svgImg.src = svgUrl;
  });

  // 7. Draw SVG overlay onto canvas
  ctx.drawImage(svgImg, 0, 0, renderW, renderH);
  URL.revokeObjectURL(svgUrl);

  // 8. Return PNG blob
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}