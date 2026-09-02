import { useState } from 'react';
import {
  REGIONS_BY_PATTERN,
  REGION_COLOR,
  DEFAULT_GEOMETRY,
  DEFAULT_PATTERN_COLOR,
  createCustomRegion,
  deleteVertexFromRegion,
  REGION_TO_PATTERN,
} from './geometry';

let pid = 0;
const makeId = () => `pl-${Date.now()}-${pid++}`;

// Encapsulates all per-side design state (colors, patterns, custom shapes,
// geometry, placements) and the logic that operates on it. The Design Lab
// instantiates this hook twice — one for the front, one for the back — so each
// side keeps its own design independently.
export function useDesignState() {
  const [primary, setPrimary] = useState('#FFFFFF');
  const [secondary, setSecondary] = useState('#FF1F3D');
  const [tertiary, setTertiary] = useState('#0A0A0A');
  const [selectedPatterns, setSelectedPatterns] = useState(['accent-sleeves']);
  const [patternColors, setPatternColors] = useState(DEFAULT_PATTERN_COLOR);
  const [customShapes, setCustomShapes] = useState([]);
  const [geometry, setGeometry] = useState(DEFAULT_GEOMETRY);
  const [placements, setPlacements] = useState([]);

  const addPlacement = (url, type) => {
    const id = makeId();
    setPlacements((p) => [...p, { id, url, type, x: 50, y: 45, scale: 1, rotation: 0 }]);
    return id;
  };

  const updatePlacement = (id, patch) =>
    setPlacements((p) => p.map((pl) => (pl.id === id ? { ...pl, ...patch } : pl)));

  const deletePlacement = (id) => setPlacements((p) => p.filter((pl) => pl.id !== id));

  const builtInRegions = selectedPatterns.flatMap((p) => REGIONS_BY_PATTERN[p] || []);
  const customIds = customShapes.map((c) => c.id);
  const activeRegionIds = [...builtInRegions, ...customIds];

  const fillFor = (id) => {
    const custom = customShapes.find((c) => c.id === id);
    if (custom) return custom.color === 'tertiary' ? tertiary : secondary;
    const pattern = REGION_TO_PATTERN[id];
    const accent = (pattern && patternColors[pattern]) || REGION_COLOR[id] || 'secondary';
    return accent === 'tertiary' ? tertiary : secondary;
  };

  const setPatternColor = (pId, color) =>
    setPatternColors((pc) => ({ ...pc, [pId]: color }));

  const regions = activeRegionIds.map((id) => ({ id, fill: fillFor(id) }));

  const togglePattern = (pId) =>
    setSelectedPatterns((prev) =>
      prev.includes(pId) ? prev.filter((p) => p !== pId) : [...prev, pId]
    );

  const updateGeometry = (rid, region) => setGeometry((g) => ({ ...g, [rid]: region }));

  const insertVertex = (rid, edgeIndex) =>
    setGeometry((g) => {
      const region = g[rid];
      const { anchors, handles } = region;
      const A = anchors[edgeIndex];
      const B = anchors[(edgeIndex + 1) % anchors.length];
      const C = handles[edgeIndex];
      const C1 = { x: (A.x + C.x) / 2, y: (A.y + C.y) / 2 };
      const C2 = { x: (B.x + C.x) / 2, y: (B.y + C.y) / 2 };
      const P = { x: (C1.x + C2.x) / 2, y: (C1.y + C2.y) / 2 };
      const newAnchors = [...anchors.slice(0, edgeIndex + 1), P, ...anchors.slice(edgeIndex + 1)];
      const newHandles = [...handles.slice(0, edgeIndex), C1, C2, ...handles.slice(edgeIndex + 1)];
      return { ...g, [rid]: { anchors: newAnchors, handles: newHandles } };
    });

  const deleteVertex = (rid, vertexIndex) =>
    setGeometry((g) => {
      const region = g[rid];
      if (!region) return g;
      return { ...g, [rid]: deleteVertexFromRegion(region, vertexIndex) };
    });

  const addCustomShape = () => {
    const id = `custom-${Date.now()}`;
    setGeometry((g) => ({ ...g, [id]: createCustomRegion() }));
    setCustomShapes((cs) => [...cs, { id, color: 'secondary' }]);
    return id;
  };

  const deleteRegion = (rid) => {
    setGeometry((g) => {
      const ng = { ...g };
      delete ng[rid];
      return ng;
    });
    setCustomShapes((cs) => cs.filter((c) => c.id !== rid));
  };

  const setCustomColor = (rid, color) =>
    setCustomShapes((cs) => cs.map((c) => (c.id === rid ? { ...c, color } : c)));

  const resetSelectedShape = (rid) => {
    if (!rid) return;
    setGeometry((g) => ({
      ...g,
      [rid]: DEFAULT_GEOMETRY[rid] || createCustomRegion(),
    }));
  };

  const applyPreset = (p) => {
    setPrimary(p.primary);
    setSecondary(p.secondary);
    setTertiary(p.tertiary);
    setSelectedPatterns(p.patterns);
    setCustomShapes([]);
    setGeometry(DEFAULT_GEOMETRY);
    setPatternColors(DEFAULT_PATTERN_COLOR);
  };

  return {
    primary, setPrimary,
    secondary, setSecondary,
    tertiary, setTertiary,
    selectedPatterns, setSelectedPatterns,
    patternColors, setPatternColor,
    customShapes, setCustomColor,
    geometry, updateGeometry, insertVertex, deleteVertex, resetSelectedShape,
    placements, addPlacement, updatePlacement, deletePlacement,
    activeRegionIds, regions,
    togglePattern, addCustomShape, deleteRegion, applyPreset,
  };
}