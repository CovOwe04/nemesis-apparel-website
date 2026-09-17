// Direct Canvas 2D renderer for jersey display images and artwork.
// Replicates the exact bezier-path math from IdentityNameOverlay,
// StaticNameOverlay, and ArtworkNameOverlay so Merchize renders
// match the designer preview pixel-for-pixel.
//
// No SVG serialization, no html2canvas, no textPath — text is drawn
// character-by-character along the cubic bezier using ctx.fillText.

const DEFAULT_NAME_STYLE = {
  color: '#F5F5F7', outline: true, outline_color: '#0A0A0A', outline_thickness: 1.4,
  arch: 0, rise: 0, flag: 0, horiz_pos: 100, vert_pos: 40, font_size: 8
};
const DEFAULT_NUMBER_STYLE = {
  color: '#F5F5F7', outline: true, outline_color: '#0A0A0A', outline_thickness: 1.4,
  arch: 0, rise: 0, flag: 0, horiz_pos: 100, vert_pos: 50, font_size: 35
};

const CHAR_FACTOR = 0.7;

// ===== Cubic Bezier math =====

function cubicBezier(t, p0, p1, p2, p3) {
  const mt = 1 - t;
  return {
    x: mt*mt*mt*p0.x + 3*mt*mt*t*p1.x + 3*mt*t*t*p2.x + t*t*t*p3.x,
    y: mt*mt*mt*p0.y + 3*mt*mt*t*p1.y + 3*mt*t*t*p2.y + t*t*t*p3.y,
  };
}

function cubicBezierDeriv(t, p0, p1, p2, p3) {
  const mt = 1 - t;
  return {
    x: 3*mt*mt*(p1.x-p0.x) + 6*mt*t*(p2.x-p1.x) + 3*t*t*(p3.x-p2.x),
    y: 3*mt*mt*(p1.y-p0.y) + 6*mt*t*(p2.y-p1.y) + 3*t*t*(p3.y-p2.y),
  };
}

function buildLengthTable(p0, p1, p2, p3, samples = 400) {
  const table = [{ t: 0, len: 0 }];
  let prev = p0;
  let totalLen = 0;
  for (let i = 1; i <= samples; i++) {
    const t = i / samples;
    const pt = cubicBezier(t, p0, p1, p2, p3);
    totalLen += Math.hypot(pt.x - prev.x, pt.y - prev.y);
    table.push({ t, len: totalLen });
    prev = pt;
  }
  return { table, totalLen };
}

function tAtLength(table, totalLen, targetLen) {
  if (targetLen <= 0) return 0;
  if (targetLen >= totalLen) return 1;
  let lo = 0, hi = table.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (table[mid].len <= targetLen) lo = mid;
    else hi = mid - 1;
  }
  const prev = table[lo];
  const curr = table[lo + 1] || table[lo];
  const ratio = (targetLen - prev.len) / ((curr.len - prev.len) || 1);
  return prev.t + (curr.t - prev.t) * ratio;
}

// ===== Path builder (matches SVG buildPath exactly) =====

function buildPath(cx, y, textWidth, archPct, flagPct, warpScale) {
  const w = Math.max(textWidth, 1);
  const halfW = w / 2;
  const archHeight = 50 * warpScale * archPct;
  const flagHeight = 35 * warpScale * flagPct;
  const startX = cx - halfW;
  const endX = cx + halfW;
  return {
    p0: { x: startX, y: y - flagHeight },
    p1: { x: startX + w / 3, y: y - flagHeight - archHeight },
    p2: { x: endX - w / 3, y: y + flagHeight - archHeight },
    p3: { x: endX, y: y + flagHeight },
  };
}

// ===== Text wrapping (matches SVG wrapping exactly) =====

function wrapText(displayName, fontSize, arcWidth, ls) {
  const words = displayName.split(' ').filter(Boolean);
  const longestWord = Math.max(...words.map((w) => w.length), 1);
  const fitForLongest = (arcWidth - Math.max(0, longestWord - 1) * ls) / (longestWord * CHAR_FACTOR);
  const actualFontSize = Math.min(fontSize, fitForLongest);
  const lineHeight = actualFontSize * 1.15;
  const textWidth = (t) => t.length * actualFontSize * CHAR_FACTOR + Math.max(0, t.length - 1) * ls;
  const lines = [];
  let cur = '';
  for (const w of words) {
    const trial = cur ? `${cur} ${w}` : w;
    if (textWidth(trial) <= arcWidth) cur = trial;
    else { if (cur) lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  return { lines, actualFontSize, lineHeight, textWidthFn: textWidth };
}

// ===== Draw text along bezier path on canvas =====

function drawTextOnPath(ctx, text, path, scale, fill, strokeColor, strokeWidth, ls) {
  if (!text) return;

  // Scale path from viewBox to canvas coordinates
  const sp = {
    p0: { x: path.p0.x * scale, y: path.p0.y * scale },
    p1: { x: path.p1.x * scale, y: path.p1.y * scale },
    p2: { x: path.p2.x * scale, y: path.p2.y * scale },
    p3: { x: path.p3.x * scale, y: path.p3.y * scale },
  };

  const { table, totalLen } = buildLengthTable(sp.p0, sp.p1, sp.p2, sp.p3);

  const chars = [...text];
  const charWidths = chars.map((c) => ctx.measureText(c).width);
  const lsCanvas = ls * scale;
  const totalTextWidth =
    charWidths.reduce((a, b) => a + b, 0) + lsCanvas * Math.max(0, chars.length - 1);

  // startOffset="50%" + textAnchor="middle": center text at 50% of path length
  const centerLen = totalLen / 2;
  let currentLen = centerLen - totalTextWidth / 2;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  for (let i = 0; i < chars.length; i++) {
    const cw = charWidths[i];
    const charCenterLen = currentLen + cw / 2;

    if (charCenterLen >= 0 && charCenterLen <= totalLen) {
      const t = tAtLength(table, totalLen, charCenterLen);
      const pt = cubicBezier(t, sp.p0, sp.p1, sp.p2, sp.p3);
      const d = cubicBezierDeriv(t, sp.p0, sp.p1, sp.p2, sp.p3);
      const angle = Math.atan2(d.y, d.x);

      ctx.save();
      ctx.translate(pt.x, pt.y);
      ctx.rotate(angle);

      // paintOrder="stroke fill" — stroke first, then fill
      if (strokeColor && strokeWidth > 0) {
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = strokeWidth * scale;
        ctx.lineJoin = 'round';
        ctx.miterLimit = 2;
        ctx.strokeText(chars[i], 0, 0);
      }
      ctx.fillStyle = fill;
      ctx.fillText(chars[i], 0, 0);

      ctx.restore();
    }

    currentLen += cw + lsCanvas;
  }
}

// ===== Image drawing =====

function drawImageCover(ctx, img, w, h) {
  if (!img.naturalWidth || !img.naturalHeight) {
    ctx.drawImage(img, 0, 0, w, h);
    return;
  }
  const imgRatio = img.naturalWidth / img.naturalHeight;
  const canvasRatio = w / h;
  let sx, sy, sw, sh;
  if (imgRatio > canvasRatio) {
    sh = img.naturalHeight;
    sw = sh * canvasRatio;
    sx = (img.naturalWidth - sw) / 2;
    sy = 0;
  } else {
    sw = img.naturalWidth;
    sh = sw / canvasRatio;
    sx = 0;
    sy = (img.naturalHeight - sh) / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
}

function drawImageContain(ctx, img, w, h) {
  if (!img.naturalWidth || !img.naturalHeight) {
    ctx.drawImage(img, 0, 0, w, h);
    return;
  }
  const imgRatio = img.naturalWidth / img.naturalHeight;
  const canvasRatio = w / h;
  let dw, dh, dx, dy;
  if (imgRatio > canvasRatio) {
    dw = w;
    dh = w / imgRatio;
    dx = 0;
    dy = (h - dh) / 2;
  } else {
    dh = h;
    dw = h * imgRatio;
    dy = 0;
    dx = (w - dw) / 2;
  }
  ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight, dx, dy, dw, dh);
}

// ===== Main render function =====

export async function renderOverlayToBlob({
  imageUrl,
  imageFit = 'cover',
  customName,
  customNumber = '',
  nameStyle = {},
  numberStyle = {},
  fontFam,
  customFontUrl = '',
  customFontName = '',
  letterSpacing = 0,
  enableName = true,
  enableNumber = true,
  staticDisplay = false,
  isArtwork = false,
  aspectRatio = 1,
  renderW,
  renderH,
}) {
  const SUPER = 2; // 2x supersampling for crisp output
  const canvas = document.createElement('canvas');
  canvas.width = renderW * SUPER;
  canvas.height = renderH * SUPER;
  const ctx = canvas.getContext('2d');
  ctx.scale(SUPER, SUPER);

  // 1. Fill background for static display (matches StaticNameOverlay bg-black)
  if (staticDisplay && !isArtwork) {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, renderW, renderH);
  }

  // 2. Load and draw image
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.src = imageUrl;
  await new Promise((resolve) => {
    img.onload = resolve;
    img.onerror = resolve;
    setTimeout(resolve, 5000);
  });

  if (imageFit === 'cover') {
    drawImageCover(ctx, img, renderW, renderH);
  } else {
    drawImageContain(ctx, img, renderW, renderH);
  }

  // 3. Inject custom font @font-face if needed (self-contained — no dependency
  //    on overlay components being rendered in the DOM)
  if (customFontUrl && customFontName) {
    const fontId = `fontface-render-${customFontName.replace(/\s+/g, '-')}`;
    if (!document.getElementById(fontId)) {
      const style = document.createElement('style');
      style.id = fontId;
      style.textContent = `@font-face { font-family: '${customFontName}'; src: url('${customFontUrl}') format('truetype'); }`;
      document.head.appendChild(style);
    }
  }

  // 4. Ensure fonts are loaded in the document
  try {
    await document.fonts.load(`100px ${fontFam}`);
    await document.fonts.ready;
  } catch {}

  // 4. Merge styles with defaults
  const ns = { ...DEFAULT_NAME_STYLE, ...nameStyle };
  const nus = { ...DEFAULT_NUMBER_STYLE, ...numberStyle };
  const ls = letterSpacing ? letterSpacing / 10 : 0;
  const displayName = enableName ? (customName || '').toUpperCase() : '';
  const displayNumber = enableNumber ? (customNumber || '') : '';

  // 5. Calculate case-specific parameters
  let viewBoxW, viewBoxH, fontScale, warpScale, arcWidth;
  let namePathCenterX, numPathCenterX, nameBaselineY, numBaselineY;
  let nameRiseCenterX, numRiseCenterX;

  if (isArtwork) {
    // Measure the actual artwork image so the viewBox maps 1:1 to its pixels.
    // This makes the design scale proportionally with the image's true size.
    const actualAspect = img.naturalWidth && img.naturalHeight
      ? img.naturalWidth / img.naturalHeight
      : aspectRatio;

    viewBoxH = 400;
    viewBoxW = Math.round(400 * actualAspect);

    // Scale font proportionally to the artwork width vs the 3D mockup (300 wide),
    // then adjust with a tunable constant so text isn't overly large (matches ArtworkNameOverlay).
    const ARTWORK_SCALE_ADJUSTMENT = 1.0;
    const RES_SCALE = viewBoxW / 300;
    const ARTWORK_FONT_SCALE = (staticDisplay ? 4 / 3 : 1) * RES_SCALE * ARTWORK_SCALE_ADJUSTMENT;

    fontScale = ARTWORK_FONT_SCALE;
    warpScale = ARTWORK_FONT_SCALE;
    arcWidth = 150 * ARTWORK_FONT_SCALE;

    const cx = viewBoxW / 2;

    nameBaselineY = (ns.vert_pos / 100) * viewBoxH;
    // Number position is independent of name position — each vert_pos controls
    // only its own element, so moving one never shifts the other.
    numBaselineY = (nus.vert_pos / 100) * viewBoxH;

    namePathCenterX = viewBoxW * (Math.min(95, Math.max(5, ns.horiz_pos)) / 100);
    numPathCenterX = viewBoxW * (Math.min(95, Math.max(5, nus.horiz_pos)) / 100);

    nameRiseCenterX = cx;
    numRiseCenterX = cx;
  } else if (staticDisplay) {
    const staticAspect = renderW / renderH || 1;
    viewBoxW = Math.round(400 * staticAspect);
    viewBoxH = 400;
    fontScale = 4 / 3;
    warpScale = 4 / 3;
    arcWidth = viewBoxW / 2;

    namePathCenterX = viewBoxW * (ns.horiz_pos / 100);
    numPathCenterX = viewBoxW * (nus.horiz_pos / 100);
    nameBaselineY = (ns.vert_pos / 100) * viewBoxH;
    numBaselineY = (nus.vert_pos / 100) * viewBoxH;
    nameRiseCenterX = viewBoxW / 2;
    numRiseCenterX = viewBoxW / 2;
  } else {
    // Identity (non-static display)
    viewBoxW = 300;
    viewBoxH = 400;
    fontScale = 1;
    warpScale = 1;
    arcWidth = 150;

    namePathCenterX = viewBoxW * (ns.horiz_pos / 100);
    numPathCenterX = viewBoxW * (nus.horiz_pos / 100);
    nameBaselineY = (ns.vert_pos / 100) * viewBoxH;
    numBaselineY = (nus.vert_pos / 100) * viewBoxH;
    nameRiseCenterX = viewBoxW / 2;
    numRiseCenterX = viewBoxW / 2;
  }

  const scale = renderW / viewBoxW; // viewBox → canvas scale

  // 6. Draw name
  if (displayName) {
    const { lines, actualFontSize, lineHeight, textWidthFn } = wrapText(
      displayName, ns.font_size * fontScale, arcWidth, ls
    );
    const numLines = Math.max(lines.length, 1);
    const startBase = nameBaselineY - ((numLines - 1) / 2) * lineHeight;

    ctx.save();
    if (ns.rise !== 0) {
      ctx.translate(nameRiseCenterX * scale, nameBaselineY * scale);
      ctx.rotate(-ns.rise * Math.PI / 180);
      ctx.translate(-nameRiseCenterX * scale, -nameBaselineY * scale);
    }

    ctx.font = `${actualFontSize * scale}px ${fontFam}`;

    for (let i = 0; i < lines.length; i++) {
      const tw = textWidthFn(lines[i]);
      const path = buildPath(
        namePathCenterX, startBase + i * lineHeight, tw,
        ns.arch / 100, ns.flag / 100, warpScale
      );
      drawTextOnPath(
        ctx, lines[i], path, scale,
        ns.color, ns.outline ? ns.outline_color : null,
        ns.outline ? ns.outline_thickness * fontScale : 0, ls
      );
    }
    ctx.restore();
  }

  // 7. Draw number
  if (displayNumber) {
    const numFontSize = nus.font_size * fontScale;
    const numTextWidth =
      displayNumber.length * numFontSize * CHAR_FACTOR +
      Math.max(0, displayNumber.length - 1) * ls;

    ctx.save();
    if (nus.rise !== 0) {
      ctx.translate(numRiseCenterX * scale, numBaselineY * scale);
      ctx.rotate(-nus.rise * Math.PI / 180);
      ctx.translate(-numRiseCenterX * scale, -numBaselineY * scale);
    }

    ctx.font = `${numFontSize * scale}px ${fontFam}`;

    const path = buildPath(
      numPathCenterX, numBaselineY, numTextWidth,
      nus.arch / 100, nus.flag / 100, warpScale
    );
    drawTextOnPath(
      ctx, displayNumber, path, scale,
      nus.color, nus.outline ? nus.outline_color : null,
      nus.outline ? nus.outline_thickness * fontScale : 0, ls
    );

    ctx.restore();
  }

  // 8. Return PNG blob
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}