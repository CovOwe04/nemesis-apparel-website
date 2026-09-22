// Shared style resolver — merges jersey-level defaults with per-color overrides.

export const MOCKUP_NAME_HORIZ_POS = 30.8;
export const MOCKUP_NUMBER_HORIZ_POS = 30.8;

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
    // Per-color artwork position controls must not shift 3D/mockup text.
    vert_pos: jersey?.number_style?.vert_pos ?? DEFAULT_NUMBER_STYLE.vert_pos,
  };
}
