// Editable pattern geometry. Each region is a closed shape defined by corner
// anchors plus one quadratic-bezier control handle per edge (edge i connects
// anchors[i] -> anchors[(i+1) % N], curved via handles[i]). All coordinates are
// in the jersey photo's native 1024x1024 space, so they align with the real
// seams. Drag anchors to move corners; drag handles to add/adjust curve; tap
// the + at an edge midpoint to insert a vertex (splitting the bezier cleanly).

export const REGIONS_BY_PATTERN = {
  solid: [],
  'accent-sleeves': ['sleeve-left', 'sleeve-right'],
  'chest-band': ['chest'],
  'shoulder-stripe': ['shoulder-left', 'shoulder-right'],
  'side-panels': ['side-left', 'side-right'],
};

export const REGION_COLOR = {
  'sleeve-left': 'secondary',
  'sleeve-right': 'secondary',
  chest: 'tertiary',
  'shoulder-left': 'tertiary',
  'shoulder-right': 'tertiary',
  'side-left': 'tertiary',
  'side-right': 'tertiary',
};

export const DEFAULT_GEOMETRY = {
  'sleeve-left': {
    anchors: [
      { x: 285, y: 204 },
      { x: 107, y: 319 },
      { x: 171, y: 444 },
      { x: 273, y: 408 },
    ],
    handles: [
      { x: 150, y: 255 },
      { x: 95, y: 380 },
      { x: 220, y: 430 },
      { x: 282, y: 300 },
    ],
  },
  'sleeve-right': {
    anchors: [
      { x: 725, y: 204 },
      { x: 893, y: 319 },
      { x: 829, y: 444 },
      { x: 727, y: 408 },
    ],
    handles: [
      { x: 874, y: 255 },
      { x: 929, y: 380 },
      { x: 804, y: 430 },
      { x: 718, y: 300 },
    ],
  },
  chest: {
    anchors: [
      { x: 0, y: 472 },
      { x: 1024, y: 472 },
      { x: 1024, y: 544 },
      { x: 0, y: 544 },
    ],
    handles: [
      { x: 512, y: 472 },
      { x: 1024, y: 508 },
      { x: 512, y: 544 },
      { x: 0, y: 508 },
    ],
  },
  'shoulder-left': {
    anchors: [
      { x: 427, y: 196 },
      { x: 285, y: 204 },
      { x: 273, y: 360 },
      { x: 427, y: 300 },
    ],
    handles: [
      { x: 356, y: 200 },
      { x: 279, y: 282 },
      { x: 350, y: 330 },
      { x: 427, y: 248 },
    ],
  },
  'shoulder-right': {
    anchors: [
      { x: 583, y: 196 },
      { x: 725, y: 204 },
      { x: 727, y: 360 },
      { x: 583, y: 300 },
    ],
    handles: [
      { x: 654, y: 200 },
      { x: 726, y: 282 },
      { x: 655, y: 330 },
      { x: 583, y: 248 },
    ],
  },
  'side-left': {
    anchors: [
      { x: 273, y: 408 },
      { x: 322, y: 408 },
      { x: 312, y: 834 },
      { x: 273, y: 834 },
    ],
    handles: [
      { x: 297, y: 408 },
      { x: 317, y: 621 },
      { x: 292, y: 834 },
      { x: 273, y: 621 },
    ],
  },
  'side-right': {
    anchors: [
      { x: 727, y: 408 },
      { x: 678, y: 408 },
      { x: 688, y: 834 },
      { x: 727, y: 834 },
    ],
    handles: [
      { x: 702, y: 408 },
      { x: 683, y: 621 },
      { x: 707, y: 834 },
      { x: 727, y: 621 },
    ],
  },
};

// Default custom shape: a centered rectangle on the chest, ready to drag out.
export function createCustomRegion() {
  return {
    anchors: [
      { x: 412, y: 474 },
      { x: 612, y: 474 },
      { x: 612, y: 594 },
      { x: 412, y: 594 },
    ],
    handles: [
      { x: 512, y: 474 },
      { x: 612, y: 534 },
      { x: 512, y: 594 },
      { x: 412, y: 534 },
    ],
  };
}

export function buildPath(region) {
  const { anchors, handles } = region;
  if (!anchors || anchors.length === 0) return '';
  let d = `M ${anchors[0].x} ${anchors[0].y}`;
  for (let i = 0; i < anchors.length; i++) {
    const next = anchors[(i + 1) % anchors.length];
    const ctrl = handles[i];
    if (ctrl) d += ` Q ${ctrl.x} ${ctrl.y} ${next.x} ${next.y}`;
    else d += ` L ${next.x} ${next.y}`;
  }
  return `${d} Z`;
}