// Shared style resolver — merges jersey-level defaults with per-color overrides.
// horiz_pos is always locked to 30 (horizontal position is not adjustable).

const DEFAULT_NAME_STYLE = {
  color: '#F5F5F7', outline: true, outline_color: '#0A0A0A', outline_thickness: 1.4,
  arch: 0, rise: 0, flag: 0, horiz_pos: 30, vert_pos: 40, font_size: 8,
};
const DEFAULT_NUMBER_STYLE = {
  color: '#F5F5F7', outline: true, outline_color: '#0A0A0A', outline_thickness: 1.4,
  arch: 0, rise: 0, flag: 0, horiz_pos: 30, vert_pos: 50, font_size: 35,
};

export const LOCKED_HORIZ_POS = 30;
export const LOCKED_HORIZ_OFFSET = 55;

export function resolveNameStyle(jersey, color) {
  return {
    ...DEFAULT_NAME_STYLE,
    ...(jersey?.name_style || {}),
    ...(color?.name_style || {}),
    horiz_pos: LOCKED_HORIZ_POS,
  };
}

export function resolveNumberStyle(jersey, color) {
  return {
    ...DEFAULT_NUMBER_STYLE,
    ...(jersey?.number_style || {}),
    ...(color?.number_style || {}),
    horiz_pos: LOCKED_HORIZ_POS,
  };
}