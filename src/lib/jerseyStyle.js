// Shared style resolver — merges jersey-level defaults with per-color overrides.

const DEFAULT_NAME_STYLE = {
  color: '#F5F5F7', outline: true, outline_color: '#0A0A0A', outline_thickness: 1.4,
  arch: 0, rise: 0, flag: 0, horiz_pos: 85, vert_pos: 40, font_size: 8,
};
const DEFAULT_NUMBER_STYLE = {
  color: '#F5F5F7', outline: true, outline_color: '#0A0A0A', outline_thickness: 1.4,
  arch: 0, rise: 0, flag: 0, horiz_pos: 85, vert_pos: 50, font_size: 35,
};

export function resolveNameStyle(jersey, color) {
  return {
    ...DEFAULT_NAME_STYLE,
    ...(jersey?.name_style || {}),
    ...(color?.name_style || {}),
  };
}

export function resolveNumberStyle(jersey, color) {
  return {
    ...DEFAULT_NUMBER_STYLE,
    ...(jersey?.number_style || {}),
    ...(color?.number_style || {}),
  };
}