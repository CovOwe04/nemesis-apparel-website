import { FONTS } from '@/lib/fonts';

// Shared style resolver — merges jersey-level defaults with per-color overrides.

export const MOCKUP_NAME_HORIZ_POS = 30.2;
export const MOCKUP_NUMBER_HORIZ_POS = 30.2;

// Default 3D mockup crop covers the whole source image (no crop).
export const DEFAULT_MOCKUP_CROP = { x: 0, y: 0, w: 1, h: 1 };

// The Merchize product frame is square. The mockup crop is locked to this ratio
// so the generated product image fills the frame with no letterboxed bars.
export const MOCKUP_CROP_RATIO = 1;

// The source image the 3D mockup render is built from: the only image for
// static-display colors, otherwise the last uploaded image.
export function getMockupImageUrl(color) {
  const images = color?.images || [];
  if (images.length === 0) return '';
  const chosen = images.length <= 1 ? images[0] : images[images.length - 1];
  return chosen?.url || '';
}

// Normalize a saved crop rect (fractions of the source image) with safe fallbacks.
export function resolveMockupCrop(color) {
  const saved = color?.mockup_crop;
  if (!saved || typeof saved !== 'object') return DEFAULT_MOCKUP_CROP;
  const x = Number(saved.x);
  const y = Number(saved.y);
  const w = Number(saved.w);
  const h = Number(saved.h);
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return DEFAULT_MOCKUP_CROP;
  return {
    x: Number.isFinite(x) ? Math.min(Math.max(x, 0), 1) : 0,
    y: Number.isFinite(y) ? Math.min(Math.max(y, 0), 1) : 0,
    w: Math.min(w, 1),
    h: Math.min(h, 1),
  };
}

const DEFAULT_NAME_STYLE = {
  color: '#F5F5F7', outline: true, outline_color: '#0A0A0A', outline_thickness: 1.4,
  arch: 0, rise: 0, flag: 0, horiz_pos: MOCKUP_NAME_HORIZ_POS, vert_pos: 40, font_size: 8,
};
const DEFAULT_NUMBER_STYLE = {
  color: '#F5F5F7', outline: true, outline_color: '#0A0A0A', outline_thickness: 1.4,
  arch: 0, rise: 0, flag: 0, horiz_pos: MOCKUP_NUMBER_HORIZ_POS, vert_pos: 50, font_size: 35,
};

// Flat print artwork has its own horizontal layout. Keep these separate from
// the jersey mockup styles so changing artwork placement never moves 3D text.
export const ARTWORK_NAME_HORIZ_POS = 52.5;
export const ARTWORK_NUMBER_HORIZ_POS = ARTWORK_NAME_HORIZ_POS;
export const ARTWORK_NAME_VERT_POS = 32;
// The number is larger than the name, so its baseline needs more room below it.
export const ARTWORK_NUMBER_VERT_POS = 52;
// The flat print artwork includes more of the garment than the 3D mockup, so
// use a smaller artwork-only scale to keep name and number visually matched.
export const ARTWORK_TEXT_SCALE_ADJUSTMENT = 0.6;

export function resolveArtworkNameStyle(jersey, color) {
  const jerseyStyle = resolveNameStyle(jersey);
  return {
    ...resolveNameStyle(jersey, color),
    // Artwork has no per-color size control. Match the global 3D designer size.
    font_size: jerseyStyle.font_size,
    horiz_pos: ARTWORK_NAME_HORIZ_POS,
    vert_pos: color?.artwork_name_vert_pos ?? color?.name_style?.vert_pos ?? ARTWORK_NAME_VERT_POS,
  };
}

export function resolveArtworkNumberStyle(jersey, color) {
  const jerseyStyle = resolveNumberStyle(jersey);
  return {
    ...resolveNumberStyle(jersey, color),
    // Artwork has no per-color size control. Match the global 3D designer size.
    font_size: jerseyStyle.font_size,
    horiz_pos: ARTWORK_NUMBER_HORIZ_POS,
    vert_pos: color?.artwork_number_vert_pos ?? color?.number_style?.vert_pos ?? ARTWORK_NUMBER_VERT_POS,
  };
}

export function resolveNameStyle(jersey, color) {
  const merged = {
    ...DEFAULT_NAME_STYLE,
    ...(jersey?.name_style || {}),
    ...(color?.name_style || {}),
  };
  return {
    ...merged,
    // horiz_pos is a hardcoded global layout constant — any stale saved value
    // must not override the current MOCKUP_NAME_HORIZ_POS.
    horiz_pos: MOCKUP_NAME_HORIZ_POS,
    // Per-color artwork position controls must not shift 3D/mockup text.
    vert_pos: jersey?.name_style?.vert_pos ?? DEFAULT_NAME_STYLE.vert_pos,
  };
}

export function resolveNumberStyle(jersey, color) {
  const merged = {
    ...DEFAULT_NUMBER_STYLE,
    ...(jersey?.number_style || {}),
    ...(color?.number_style || {}),
  };
  return {
    ...merged,
    horiz_pos: MOCKUP_NUMBER_HORIZ_POS,
    // Per-color artwork position controls must not shift 3D/mockup text.
    vert_pos: jersey?.number_style?.vert_pos ?? DEFAULT_NUMBER_STYLE.vert_pos,
  };
}

// Resolve font for a single text element (name or number). Per-style font
// fields override the jersey-level fallback so the admin can set a different
// font for the name vs the number.
export function resolveFont(style, fallbackFontId, fallbackCustomFontUrl, fallbackCustomFontName) {
  const fontId = style?.font_id || fallbackFontId || 'block';
  const customFontUrl = style?.custom_font_url || fallbackCustomFontUrl || '';
  const customFontName = style?.custom_font_name || fallbackCustomFontName || '';
  const font = FONTS.find((f) => f.id === fontId) || FONTS[0];
  const fontFam = customFontName ? `'${customFontName}', ${font.family}` : font.family;
  return { fontId, customFontUrl, customFontName, fontFam };
}