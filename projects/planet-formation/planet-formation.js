/* Planet Formation

   A planet is born from thousands of particles. Dust drifts in the dark,
   starts to swirl, falls into orbit, gathers into a sphere, gains a shaded
   surface and an atmosphere, and finally grows rings.

   The whole scene is a pure function of time: render(t) draws exactly what
   the scene looks like t seconds into the animation. EVENTS says when each
   stage begins, so changing a number re-times the whole story.

   Sections wrapped in "#region" comments are the heart of each stage:
   particles, flow, orbit, sphere, surface, glow, rings and spin. */

/* ------------------------------------------------------------------ */
/* Timeline                                                            */
/* ------------------------------------------------------------------ */

// Seconds at which each stage starts.
const EVENTS = {
  particles: 0.5,
  flow: 3.5,
  orbit: 6.5,
  sphere: 9.5,
  surface: 15,
  glow: 17,
  rings: 19,
  spin: 23.5,
};
const LOOP_SECONDS = 40; // the animation restarts after this long

/* ------------------------------------------------------------------ */
/* Small maths helpers                                                 */
/* ------------------------------------------------------------------ */

const TAU = Math.PI * 2;
const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
const lerp = (a, b, k) => a + (b - a) * k;
const ease = (k) => 1 - Math.pow(1 - clamp(k), 3);
const smooth = (a, b, v) => {
  const k = clamp((v - a) / (b - a));
  return k * k * (3 - 2 * k);
};

const UP = [0, 1, 0];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = (p) => Math.hypot(p[0], p[1], p[2]);
const unit = (p) => {
  const n = norm(p) || 1;
  return [p[0] / n, p[1] / n, p[2] / n];
};
const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const lerp3 = (a, b, k) => [
  lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k),
];

function rotateY(p, a) {
  const c = Math.cos(a), s = Math.sin(a);
  return [p[0] * c + p[2] * s, p[1], -p[0] * s + p[2] * c];
}

function rotateX(p, a) {
  const c = Math.cos(a), s = Math.sin(a);
  return [p[0], p[1] * c - p[2] * s, p[1] * s + p[2] * c];
}

function rotateZ(p, a) {
  const c = Math.cos(a), s = Math.sin(a);
  return [p[0] * c - p[1] * s, p[0] * s + p[1] * c, p[2]];
}

// Rotate p around a unit axis by angle a (Rodrigues' formula).
function rotateAxis(p, axis, a) {
  const c = Math.cos(a), s = Math.sin(a), d = dot(axis, p) * (1 - c);
  const x = cross(axis, p);
  return [
    p[0] * c + x[0] * s + axis[0] * d,
    p[1] * c + x[1] * s + axis[1] * d,
    p[2] * c + x[2] * s + axis[2] * d,
  ];
}

// Seeded random numbers so the scene looks identical on every run.
function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// The integral of a smooth 0 -> 1 speed-up that starts at t0 and takes dur
// seconds. It turns "speed" into "distance travelled" without any state.
function gain(t, t0, dur) {
  const s = t - t0;
  if (s <= 0) return 0;
  const x = Math.min(s / dur, 1);
  return dur * (x * x * x - (x * x * x * x) / 2) + Math.max(0, s - dur);
}

/* ------------------------------------------------------------------ */
/* Palette and particle helpers                                        */
/* ------------------------------------------------------------------ */

// Soft white, ice blue, electric blue, violet, magenta, pale cyan.
const TINTS = [
  [235, 240, 255], [170, 200, 255], [80, 140, 255],
  [150, 105, 255], [225, 95, 225], [130, 230, 255],
];
const LEVELS = [0.22, 0.42, 0.68, 0.95]; // brightness steps

// Orbit axes: particles circle the centre in several tilted planes.
const AXES = [
  [0, 1, 0], [0.35, 0.92, 0.2], [-0.4, 0.88, -0.25],
  [0.18, 0.95, -0.4], [-0.25, 0.9, 0.35],
].map(unit);

// A random point on a sphere of radius dist.
function scatter(rand, dist) {
  const y = rand() * 2 - 1;
  const a = rand() * TAU;
  const r = Math.sqrt(1 - y * y);
  return [Math.cos(a) * r * dist, y * dist, Math.sin(a) * r * dist];
}

const choose = (rand, list) => list[Math.floor(rand() * list.length)];

// Evenly spread point i of n on the unit sphere.
function fibonacci(i, n) {
  const y = 1 - (2 * (i + 0.5)) / n;
  const r = Math.sqrt(1 - y * y);
  const a = i * 2.399963229728653;
  return [Math.cos(a) * r, y, Math.sin(a) * r];
}

/* ------------------------------------------------------------------ */
/* 1. Particle generation                                              */
/* ------------------------------------------------------------------ */

// #region particles
const COUNT = 7000;
const HALO = 450;
const TOTAL = COUNT + HALO;

function makeParticles(rand) {
  return Array.from({ length: TOTAL }, (_, i) => {
    const dist = 1.5 + 2.8 * rand();
    return {
      bound: i < COUNT,
      start: scatter(rand, dist),
      home: fibonacci(i, COUNT),
      grain: scatter(rand, 0.02),
      axis: AXES[i % AXES.length],
      delay: rand() * 1.6,
      size: 0.7 + rand() * 1.5,
      tint: Math.floor(rand() * TINTS.length),
      seed: rand() * TAU,
    };
  });
}
// #endregion

/* ------------------------------------------------------------------ */
/* 2. Flow: coordinated swirling                                       */
/* ------------------------------------------------------------------ */

// #region flow
function flow(p, t) {
  const r = Math.hypot(p[0], p[2]);
  const spin = gain(t, EVENTS.flow, 2.5);
  return rotateY(p, (spin * 0.5) / (0.6 + r));
}
// #endregion

/* ------------------------------------------------------------------ */
/* 3. Orbital behaviour                                                */
/* ------------------------------------------------------------------ */

// #region orbit
function orbit(p, axis, t) {
  const spin = gain(t, EVENTS.orbit, 2.5);
  const speed = 0.45 / Math.sqrt(norm(p));
  return rotateAxis(p, axis, spin * speed);
}
// #endregion

/* ------------------------------------------------------------------ */
/* 4. Spherical formation                                              */
/* ------------------------------------------------------------------ */

// #region sphere
function gather(p, home, delay, t) {
  const k = ease((t - EVENTS.sphere - delay) / 3.2);
  const arc = Math.sin(Math.PI * k) * 0.7;
  const side = unit(cross(UP, p));
  return p.map((v, i) => {
    return lerp(v, home[i], k) + side[i] * arc;
  });
}
// #endregion

/* ------------------------------------------------------------------ */
/* Surface texture and lighting tables (computed once)                 */
/* ------------------------------------------------------------------ */

function hash3(x, y, z) {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(z, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1103515245);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function noise3(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const fx = smooth(0, 1, x - xi), fy = smooth(0, 1, y - yi), fz = smooth(0, 1, z - zi);
  const c = (dx, dy, dz) => hash3(xi + dx, yi + dy, zi + dz);
  return lerp(
    lerp(lerp(c(0, 0, 0), c(1, 0, 0), fx), lerp(c(0, 1, 0), c(1, 1, 0), fx), fy),
    lerp(lerp(c(0, 0, 1), c(1, 0, 1), fx), lerp(c(0, 1, 1), c(1, 1, 1), fx), fy),
    fz
  );
}

function fbm(x, y, z, octaves) {
  let sum = 0, amp = 0.5, f = 1;
  for (let o = 0; o < octaves; o++) {
    sum += amp * noise3(x * f, y * f, z * f);
    amp *= 0.5;
    f *= 2.03;
  }
  return sum / (1 - Math.pow(0.5, octaves));
}

// Colour ramp for the planet: midnight -> blue -> violet -> magenta -> pale.
const RAMP = [
  [0.0, [10, 14, 52]], [0.28, [28, 44, 128]], [0.5, [64, 112, 255]],
  [0.68, [136, 92, 244]], [0.86, [214, 84, 206]], [1.0, [238, 214, 255]],
];

function ramp(v) {
  for (let i = 1; i < RAMP.length; i++) {
    if (v <= RAMP[i][0]) {
      const [a, ca] = RAMP[i - 1];
      const [b, cb] = RAMP[i];
      const k = (v - a) / (b - a);
      return ca.map((c, j) => lerp(c, cb[j], k));
    }
  }
  return RAMP[RAMP.length - 1][1];
}

const TEX_W = 512, TEX_H = 256;

// A wrap-around map of banded storm clouds, painted once at start-up.
function makeTexture() {
  const data = new Float32Array(TEX_W * TEX_H * 3);
  for (let y = 0; y < TEX_H; y++) {
    const lat = (0.5 - (y + 0.5) / TEX_H) * Math.PI;
    for (let x = 0; x < TEX_W; x++) {
      const lon = ((x + 0.5) / TEX_W - 0.5) * TAU;
      const px = Math.cos(lat) * Math.sin(lon);
      const py = Math.sin(lat);
      const pz = Math.cos(lat) * Math.cos(lon);
      const warp = fbm(px * 2.2 + 9, py * 2.2, pz * 2.2, 4);
      const band = Math.sin(py * 8 + warp * 6) * 0.5 + 0.5;
      const swirl = fbm(px * 5 + warp * 2, py * 12, pz * 5 + warp * 2, 4);
      const v = clamp(0.5 * band + 0.62 * swirl - 0.04);
      const detail = 0.86 + 0.28 * fbm(px * 14, py * 14, pz * 14, 3);
      const [r, g, b] = ramp(v);
      const i = (y * TEX_W + x) * 3;
      data[i] = r * detail;
      data[i + 1] = g * detail;
      data[i + 2] = b * detail;
    }
  }
  return data;
}

const SURF = 440; // surface image size in pixels
const LIGHT_DIR = unit([-0.55, 0.5, 0.68]);

function makeShading() {
  const n = SURF * SURF;
  const t = {
    x: new Float32Array(n), y: new Float32Array(n), z: new Float32Array(n),
    light: new Float32Array(n), spec: new Float32Array(n),
    rim: new Float32Array(n), alpha: new Uint8ClampedArray(n),
  };
  const half = unit(add(LIGHT_DIR, [0, 0, 1]));
  for (let j = 0; j < SURF; j++) {
    for (let i = 0; i < SURF; i++) {
      const k = j * SURF + i;
      const x = ((i + 0.5) / SURF) * 2 - 1;
      const y = 1 - ((j + 0.5) / SURF) * 2;
      const rr = x * x + y * y;
      const z = Math.sqrt(Math.max(0, 1 - rr));
      const n3 = [x, y, z];
      const lit = dot(n3, LIGHT_DIR);
      t.x[k] = x; t.y[k] = y; t.z[k] = z;
      t.light[k] = 0.1 + 1.08 * Math.pow(smooth(-0.18, 0.9, lit), 1.1);
      t.spec[k] = Math.pow(Math.max(0, dot(n3, half)), 52) * 0.5;
      t.rim[k] = Math.pow(1 - z, 2.6) * (0.3 + 0.7 * smooth(-0.5, 0.6, lit));
      t.alpha[k] = clamp((1 - Math.sqrt(rr)) * SURF * 0.5) * 255;
    }
  }
  return t;
}

/* ------------------------------------------------------------------ */
/* 5. Surface rendering                                                */
/* ------------------------------------------------------------------ */

// #region surface
function paintSurface(px, m, atmo) {
  for (let k = 0; k < SURF * SURF; k++) {
    const a = SHADE.alpha[k];
    if (!a) continue;
    const [lon, lat] = angles(normalAt(m, k));
    const [r, g, b] = texel(lon, lat);
    const lit = SHADE.light[k];
    const gl = SHADE.rim[k] * atmo;
    const sp = SHADE.spec[k] * 235;
    px[k * 4] = r * lit + sp + gl * 90;
    px[k * 4 + 1] = g * lit + sp + gl * 150;
    px[k * 4 + 2] = b * lit + sp + gl * 255;
    px[k * 4 + 3] = a;
  }
}
// #endregion

// The surface normal of pixel k, turned into the planet's own frame.
function normalAt(m, k) {
  const x = SHADE.x[k], y = SHADE.y[k], z = SHADE.z[k];
  return [
    m[0] * x + m[1] * y + m[2] * z,
    m[3] * x + m[4] * y + m[5] * z,
    m[6] * x + m[7] * y + m[8] * z,
  ];
}

// Longitude and latitude of a unit normal.
const angles = (n) => [Math.atan2(n[0], n[2]), Math.asin(clamp(n[1], -1, 1))];

// Colour of the texture at longitude/latitude (bilinear, wraps around).
function texel(lon, lat) {
  const u = (lon / TAU + 0.5) * TEX_W - 0.5;
  const v = clamp((0.5 - lat / Math.PI) * TEX_H - 0.5, 0, TEX_H - 1.001);
  const x0 = Math.floor(u), y0 = Math.floor(v);
  const fx = u - x0, fy = v - y0;
  const xa = ((x0 % TEX_W) + TEX_W) % TEX_W, xb = (xa + 1) % TEX_W;
  const out = [0, 0, 0];
  for (let c = 0; c < 3; c++) {
    const a = lerp(TEX[(y0 * TEX_W + xa) * 3 + c], TEX[(y0 * TEX_W + xb) * 3 + c], fx);
    const b = lerp(TEX[((y0 + 1) * TEX_W + xa) * 3 + c], TEX[((y0 + 1) * TEX_W + xb) * 3 + c], fx);
    out[c] = lerp(a, b, fy);
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* 6. Atmospheric lighting                                             */
/* ------------------------------------------------------------------ */

// #region glow
function drawGlow(ctx, cx, cy, radius, k) {
  const r0 = radius * 0.9;
  const r1 = radius * 1.6;
  const g = ctx.createRadialGradient(
    cx, cy, r0, cx, cy, r1);
  const stops = [[0, 0.55], [0.4, 0.22], [1, 0]];
  const cols = [
    "120, 150, 255", "140, 90, 255", "80, 60, 255",
  ];
  stops.forEach(([at, a], i) => {
    const c = cols[i];
    g.addColorStop(at, `rgba(${c}, ${a * k})`);
  });
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, r1, 0, TAU);
  ctx.fill();
}
// #endregion

/* ------------------------------------------------------------------ */
/* 7. Orbital rings                                                    */
/* ------------------------------------------------------------------ */

// #region rings
const TILT = 0.38;
const RING_DUST = 4200;

function makeRing(rand) {
  return Array.from({ length: RING_DUST }, () => {
    const band = choose(rand, RING_BANDS);
    return {
      r: lerp(band[0], band[1], rand()),
      angle: rand() * TAU,
      start: scatter(rand, 2.4 + rand() * 2),
      delay: rand() * 2,
      size: 0.6 + rand() * 1.1,
    };
  });
}

function ringPoint(r, a) {
  const x = Math.cos(a) * r;
  const z = Math.sin(a) * r;
  const c = Math.cos(TILT), s = Math.sin(TILT);
  return [x * c, x * s, z];
}

function ringDust(q, t) {
  const k = ease((t - EVENTS.rings - q.delay) / 3);
  const speed = 0.35 / Math.pow(q.r, 1.5);
  const a = q.angle + speed * t;
  return lerp3(q.start, ringPoint(q.r, a), k);
}
// #endregion

/* ------------------------------------------------------------------ */
/* 8. Final rotation and camera                                        */
/* ------------------------------------------------------------------ */

// #region spin
function spinAngle(t) {
  const final = 0.3 * gain(t, EVENTS.spin, 3);
  return 0.05 * t + final;
}

function camera(t) {
  const at = (e, s) => ease((t - EVENTS[e]) / s);
  const far = 0.6 + 0.17 * at("sphere", 5);
  const near = 0.14 * at("rings", 5);
  const last = 0.09 * at("spin", 4);
  return { zoom: far + near + last, pitch: 0.45 };
}
// #endregion

/* ------------------------------------------------------------------ */
/* Scene data                                                          */
/* ------------------------------------------------------------------ */

const RING_BANDS = [[1.38, 1.52], [1.62, 1.8], [1.86, 1.93]];
const rand = seeded(2026);
const PARTICLES = makeParticles(rand);
const RING = makeRing(rand);
const STARS = Array.from({ length: 240 }, () => ({
  x: rand(), y: rand(), r: 0.4 + rand() * 0.9, ph: rand() * TAU,
}));
const TEX = makeTexture();
const SHADE = makeShading();
const STYLES = [], STYLES_SOFT = [];
TINTS.forEach((c) => LEVELS.forEach((a) => {
  STYLES.push(`rgba(${c[0]}, ${c[1]}, ${c[2]}, ${a})`);
  STYLES_SOFT.push(`rgba(${c[0]}, ${c[1]}, ${c[2]}, ${a * 0.16})`);
}));

/* ------------------------------------------------------------------ */
/* Rendering                                                           */
/* ------------------------------------------------------------------ */

const canvas = document.getElementById("space");
const ctx = canvas.getContext("2d");
const surfaceCanvas = document.createElement("canvas");
surfaceCanvas.width = surfaceCanvas.height = SURF;
const surfaceCtx = surfaceCanvas.getContext("2d");
const surfaceImage = surfaceCtx.createImageData(SURF, SURF);

let width = 0, height = 0, dpr = 1;

function resize() {
  dpr = window.devicePixelRatio || 1;
  width = canvas.clientWidth;
  height = canvas.clientHeight;
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
}

// Where a particle is in the world at time t (planet radius = 1).
function bodyAt(q, t, angle) {
  const wobble = [Math.sin(t * 0.7 + q.seed), Math.sin(t * 0.9 + q.seed * 1.7), Math.sin(t * 0.6 + q.seed * 2.3)];
  let p = add(q.start, wobble.map((v) => v * 0.05));
  p = flow(p, t);
  p = orbit(p, q.axis, t);
  if (q.bound) {
    const home = rotateZ(rotateY(add(q.home, q.grain), angle), TILT);
    p = gather(p, home, q.delay, t);
  }
  return p;
}

// Camera view: tip the world towards the viewer, then project.
function toScreen(p, cam, s, cx, cy) {
  const v = rotateX(p, cam.pitch);
  const persp = 1 / (1 - 0.03 * v[2]);
  return { x: cx + v[0] * s * persp, y: cy - v[1] * s * persp, z: v[2], u: v[0], w: v[1], persp };
}

function addToBucket(lists, b, x, y, r) {
  const list = lists[b];
  list.push(x, y, r);
}

function drawBuckets(lists, grow, styles) {
  for (let b = 0; b < lists.length; b++) {
    const list = lists[b];
    if (!list.length) continue;
    ctx.fillStyle = styles[b];
    ctx.beginPath();
    for (let i = 0; i < list.length; i += 3) {
      const r = list[i + 2] * grow;
      ctx.moveTo(list[i] + r, list[i + 1]);
      ctx.arc(list[i], list[i + 1], r, 0, TAU);
    }
    ctx.fill();
  }
}

const newLists = () => Array.from({ length: STYLES.length }, () => []);

function drawStars(t) {
  for (const st of STARS) {
    const a = 0.25 + 0.35 * (0.5 + 0.5 * Math.sin(t * 0.8 + st.ph));
    ctx.fillStyle = `rgba(210, 225, 255, ${a})`;
    ctx.beginPath();
    ctx.arc(st.x * width, st.y * height, st.r, 0, TAU);
    ctx.fill();
  }
}

// One half of the ring (front or back) as a smooth, banded disc of light.
function drawRingHalf(cam, s, cx, cy, front, alpha) {
  const u = rotateX([Math.cos(TILT), Math.sin(TILT), 0], cam.pitch);
  const v = rotateX([0, 0, 1], cam.pitch);
  const phase = Math.atan2(u[2], v[2]);
  const from = -phase + (front ? 0 : Math.PI);
  ctx.save();
  ctx.transform(u[0] * s, -u[1] * s, v[0] * s, -v[1] * s, cx, cy);
  const g = ctx.createRadialGradient(0, 0, 1.35, 0, 0, 1.95);
  const stops = [
    [0, 0], [0.06, 0.2], [0.14, 0.34], [0.24, 0.1], [0.3, 0.06],
    [0.4, 0.3], [0.5, 0.42], [0.62, 0.3], [0.7, 0.12], [0.78, 0.24],
    [0.88, 0.36], [1, 0],
  ];
  const cols = [[130, 230, 255], [150, 105, 255], [225, 95, 225], [150, 105, 255]];
  stops.forEach(([p, a]) => {
    const c = cols[Math.floor((p * 3.99))];
    g.addColorStop(p, `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${a * alpha})`);
  });
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, 1.95, from, from + Math.PI);
  ctx.arc(0, 0, 1.35, from + Math.PI, from, true);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// Planet rotation matrix: view space -> planet space.
function planetMatrix(cam, angle) {
  const cols = [[1, 0, 0], [0, 1, 0], [0, 0, 1]].map((e) => {
    const w = rotateX(e, -cam.pitch);          // view -> world
    return rotateY(rotateZ(w, -TILT), -angle); // world -> planet
  });
  return [
    cols[0][0], cols[1][0], cols[2][0],
    cols[0][1], cols[1][1], cols[2][1],
    cols[0][2], cols[1][2], cols[2][2],
  ];
}

function render(t) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);
  const cam = camera(t);
  const s = Math.min(width, height * 1.1) * 0.27 * cam.zoom;
  const cx = width / 2;
  const cy = height / 2;
  const angle = spinAngle(t);
  drawStars(t);

  const back = newLists();
  const front = newLists();
  const dustIn = ease((t - EVENTS.particles) / 1.5);
  const formed = ease((t - EVENTS.sphere - 3) / 3);
  const skin = ease((t - EVENTS.surface) / 2.5);

  if (t >= EVENTS.particles) {
    for (const q of PARTICLES) {
      const p = bodyAt(q, t, angle);
      const o = toScreen(p, cam, s, cx, cy);
      const rho2 = o.u * o.u + o.w * o.w;
      const hidden = rho2 < 1 && o.z < Math.sqrt(1 - rho2);
      const lit = Math.max(0, dot(unit([o.u, o.w, o.z]), LIGHT_DIR));
      const twinkle = 0.5 + 0.5 * Math.sin(t * 2 + q.seed * 5);
      const level = q.bound && formed > 0
        ? Math.min(3, Math.floor(lerp(twinkle * 3, 0.5 + lit * 3.4, formed)))
        : Math.min(3, Math.floor(1 + twinkle * 2.4));
      const b = q.tint * LEVELS.length + level;
      const calm = q.bound ? 1 - 0.5 * skin : 1;
      const radius = q.size * calm * (0.75 + 0.35 * o.persp) * Math.sqrt(cam.zoom) * dustIn;
      addToBucket(hidden ? back : front, b, o.x, o.y, radius);
    }
  }

  if (t >= EVENTS.rings) {
    const fade = ease((t - EVENTS.rings) / 1.2);
    for (const q of RING) {
      const o = toScreen(ringDust(q, t, angle), cam, s, cx, cy);
      const b = (q.r < 1.6 ? 5 : q.r < 1.84 ? 3 : 4) * LEVELS.length + (q.delay > 1 ? 2 : 1);
      addToBucket(o.z < 0 ? back : front, b, o.x, o.y, q.size * Math.sqrt(cam.zoom) * fade);
    }
  }

  ctx.globalCompositeOperation = "lighter";
  drawBuckets(back, 2.6, STYLES_SOFT);
  drawBuckets(back, 1, STYLES);
  if (t >= EVENTS.rings) drawRingHalf(cam, s, cx, cy, false, ease((t - EVENTS.rings - 1) / 3));
  if (t >= EVENTS.glow) drawGlow(ctx, cx, cy, s, ease((t - EVENTS.glow) / 2.5));
  ctx.globalCompositeOperation = "source-over";

  if (t >= EVENTS.surface) {
    const atmo = ease((t - EVENTS.glow) / 2.5);
    paintSurface(surfaceImage.data, planetMatrix(cam, angle), atmo);
    surfaceCtx.putImageData(surfaceImage, 0, 0);
    ctx.globalAlpha = ease((t - EVENTS.surface) / 2.5);
    ctx.drawImage(surfaceCanvas, cx - s, cy - s, s * 2, s * 2);
    ctx.globalAlpha = 1;
  }

  ctx.globalCompositeOperation = "lighter";
  if (t >= EVENTS.rings) drawRingHalf(cam, s, cx, cy, true, ease((t - EVENTS.rings - 1) / 3));
  drawBuckets(front, 2.6, STYLES_SOFT);
  drawBuckets(front, 1, STYLES);
  ctx.globalCompositeOperation = "source-over";
}

/* ------------------------------------------------------------------ */
/* Start-up                                                            */
/* ------------------------------------------------------------------ */

resize();
window.addEventListener("resize", resize);

// "?manual" hands the clock to a page that embeds this one (used to render
// the demo video frame by frame). Normal use never needs it.
if (new URLSearchParams(location.search).has("manual")) {
  window.PF = { EVENTS, render, resize, PARTICLES, RING };
} else {
  const started = performance.now();
  const frame = (now) => {
    render(((now - started) / 1000) % LOOP_SECONDS);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
