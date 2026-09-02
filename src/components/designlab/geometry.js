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

// Reverse lookup: region id -> pattern id.
export const REGION_TO_PATTERN = Object.fromEntries(
  Object.entries(REGIONS_BY_PATTERN).flatMap(([p, regions]) =>
    regions.map((r) => [r, p])
  )
);

// Default accent assignment per pattern (derived from REGION_COLOR).
export const DEFAULT_PATTERN_COLOR = Object.fromEntries(
  Object.keys(REGIONS_BY_PATTERN)
    .filter((p) => p !== 'solid')
    .map((p) => [p, REGIONS_BY_PATTERN[p][0] ? REGION_COLOR[REGIONS_BY_PATTERN[p][0]] : 'secondary'])
);

export const DEFAULT_GEOMETRY = {
  'sleeve-left': {
    anchors: [
      { x: 282.82, y: 186.5 },
      { x: 80.3, y: 317.34 },
      { x: 182.81, y: 489.85 },
      { x: 266.98, y: 454.01 },
    ],
    handles: [
      { x: 150, y: 255 },
      { x: 95, y: 380 },
      { x: 223.65, y: 479.85 },
      { x: 361.16, y: 344.84 },
    ],
  },
  'sleeve-right': {
    anchors: [
      { x: 731.62, y: 180.17 },
      { x: 927.97, y: 322.55 },
      { x: 846.08, y: 477.03 },
      { x: 753.02, y: 448.18 },
    ],
    handles: [
      { x: 874, y: 255 },
      { x: 929, y: 380 },
      { x: 813.51, y: 471.45 },
      { x: 675.78, y: 343.96 },
    ],
  },
  chest: {
    anchors: [
      { x: 194.52, y: 476.07 },
      { x: 779.93, y: 470.57 },
      { x: 780.02, y: 535.81 },
      { x: 194.52, y: 540.3 },
    ],
    handles: [
      { x: 512, y: 472 },
      { x: 779.93, y: 514.61 },
      { x: 513.65, y: 535.84 },
      { x: 194.52, y: 507.27 },
    ],
  },
  'shoulder-left': {
    anchors: [
      { x: 420.27, y: 141.96 },
      { x: 269.41, y: 160.41 },
      { x: 316.12, y: 348.81 },
      { x: 421.62, y: 302.16 },
    ],
    handles: [
      { x: 351.22, y: 137.58 },
      { x: 325.39, y: 253.44 },
      { x: 370.25, y: 319.28 },
      { x: 420.27, y: 238.89 },
    ],
  },
  'shoulder-right': {
    anchors: [
      { x: 603.63, y: 145.85 },
      { x: 740.64, y: 156.98 },
      { x: 711.49, y: 349.32 },
      { x: 604.48, y: 305.13 },
    ],
    handles: [
      { x: 667.07, y: 139.48 },
      { x: 702.11, y: 268.31 },
      { x: 657.55, y: 321.18 },
      { x: 602.77, y: 251.18 },
    ],
  },
  'side-left': {
    anchors: [
      { x: 268.18, y: 448.3 },
      { x: 317.15, y: 344.17 },
      { x: 314.71, y: 868.54 },
      { x: 269.18, y: 872.05 },
    ],
    handles: [
      { x: 305.81, y: 406.54 },
      { x: 311.47, y: 640.65 },
      { x: 291.37, y: 868.54 },
      { x: 272.94, y: 644.76 },
    ],
  },
  'side-right': {
    anchors: [
      { x: 756.21, y: 436.63 },
      { x: 710.98, y: 348.29 },
      { x: 714.24, y: 861.86 },
      { x: 757.82, y: 867.19 },
    ],
    handles: [
      { x: 733.14, y: 434.89 },
      { x: 713.82, y: 654.19 },
      { x: 737.82, y: 867.19 },
      { x: 757.82, y: 654.19 },
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

// Remove vertex `index` from a region. The two edges that met at that vertex
// merge into one; its control handle becomes the straight midpoint between the
// surviving neighbours. A region always keeps at least 3 vertices.
export function deleteVertexFromRegion(region, index) {
  const { anchors, handles } = region;
  const n = anchors.length;
  if (n <= 3) return region;
  const k = ((index % n) + n) % n;
  const newAnchors = [];
  const newHandles = [];
  for (let i = 0; i < n; i++) {
    if (i === k) continue; // drop the deleted vertex + its outgoing handle
    newAnchors.push(anchors[i]);
    const nextI = (i + 1) % n;
    let h;
    if (nextI === k) {
      // This edge crossed the deleted vertex — merge to the neighbour beyond it.
      const skipNext = (k + 1) % n;
      h = {
        x: (anchors[i].x + anchors[skipNext].x) / 2,
        y: (anchors[i].y + anchors[skipNext].y) / 2,
      };
    } else {
      h = handles[i];
    }
    newHandles.push(h);
  }
  return { anchors: newAnchors, handles: newHandles };
}