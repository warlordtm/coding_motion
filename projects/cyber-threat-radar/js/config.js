/* Cyber Threat Radar: configuration.
   Everything on screen is a SIMULATION driven by the data below.
   It is not connected to any real network. */

// Palette as RGB triplets so any alpha can be applied while drawing.
const C = {
  cyan: [56, 224, 255],   // normal radar activity
  blue: [92, 146, 255],   // interface details
  red: [255, 66, 84],     // suspicious activity and warnings
  amber: [255, 178, 64],  // secondary indicators
  white: [236, 245, 255], // important text
};

const SWEEP_PERIOD = 2.4;  // seconds for one full radar revolution
const THREAT_ID = 7;       // the simulated suspicious node

// Node positions: deg = compass angle (0 = top, clockwise), k = distance
// from the centre as a fraction of the radar radius.
const NODE_DEFS = [
  { id: 1, deg: 10, k: 0.42 },
  { id: 2, deg: 33, k: 0.86 },
  { id: 3, deg: 71, k: 0.5 },
  { id: 4, deg: 96, k: 0.78 },
  { id: 5, deg: 122, k: 0.4 },
  { id: 6, deg: 148, k: 0.7 },
  { id: 7, deg: 52, k: 0.64 },
  { id: 8, deg: 176, k: 0.55 },
  { id: 9, deg: 201, k: 0.84 },
  { id: 10, deg: 226, k: 0.46 },
  { id: 11, deg: 250, k: 0.72 },
  { id: 12, deg: 278, k: 0.58 },
  { id: 13, deg: 304, k: 0.82 },
  { id: 14, deg: 336, k: 0.52 },
];

// Connections between nodes, by node id.
const EDGES = [
  [1, 14], [14, 13], [13, 12], [12, 11], [11, 10], [10, 9],
  [9, 8], [8, 6], [6, 4], [4, 3], [3, 1], [2, 7], [7, 3],
  [7, 4], [2, 14], [5, 10], [5, 1],
];

// When each stage of the animation starts, in seconds. A stage with
// the value null has not started yet.
const DEFAULT_EVENTS = {
  rings: 0.2,
  grid: 0.7,
  sweep: 1.2,
  nodes: 1.8,
  links: 4.4,
  threat: 6.5,
  lock: 7.5,
  panel: 8.0,
  status: 9.2,
  isolate: 12.0,
  protect: 13.2,
};

const LOOP_SECONDS = 18; // the demo restarts after this long
