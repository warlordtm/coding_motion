/* Zen Code: Black Hole Formation.
   Every frame is a pure function of time: render(t). */
'use strict';

const TAU = Math.PI * 2;
const canvas = document.getElementById('space');
const ctx = canvas.getContext('2d');
let W = 1080, H = 960, cx = 540, cy = 480, S = 135;

// #region config
const EVENTS = {
  stars: 2.4, core: 6, spiral: 9,
  disk: 12.5, detail: 16, lensing: 20,
  final: 25,
};
const SHADOW = 0.125;
const DISK_IN = 1.55;
const DISK_OUT = 3.9;
const TILT = 0.2;
const GAS = 8000;
const STARS = 2400;
// #endregion
const LOOP_SECONDS = 40;

/* ---------- helpers ---------- */
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, k) => a + (b - a) * k;
const smooth = (k) => { k = clamp(k); return k * k * (3 - 2 * k); };
const ease = (k) => 1 - Math.pow(1 - clamp(k), 3);
const ramp = (x, d) => smooth(x / d);
function seeded(a) {
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = seeded(20261103);

const prog = {};
function progress(t) {
  prog.core = ease((t - EVENTS.core) / 3.5);
  prog.spiral = ramp(t - EVENTS.spiral, 5);
  prog.disk = ease((t - EVENTS.disk) / 5);
  prog.detail = ramp(t - EVENTS.detail, 5);
  prog.lens = ease((t - EVENTS.lensing) / 5);
  prog.final = ease((t - EVENTS.final) / 6);
}

// #region stars
const stars = Array.from({ length: STARS }, () => ({
  x: rand() * 2 - 1,
  y: rand() * 2 - 1,
  size: 1 + rand() * 1.9,
  born: rand() * 5,
  tint: rand(),
  blink: rand() * TAU,
}));

function drawStars(t, lens) {
  ctx.globalCompositeOperation = 'lighter';
  for (const s of stars) {
    const a = ramp(t - EVENTS.stars - s.born, 1.5);
    if (a <= 0) continue;
    const p = bend(s.x * W * 0.58,
                   s.y * H * 0.58, lens);
    const tw = 0.7 + 0.3 * Math.sin(t * 2 + s.blink);
    ctx.fillStyle = s.tint < 0.2 ? '#ffd9b0'
      : s.tint < 0.6 ? '#ffffff' : '#a9c4ff';
    ctx.globalAlpha = a * tw * (0.55 + s.size / 3);
    ctx.fillRect(cx + p.x, cy + p.y, s.size, s.size);
  }
  ctx.globalAlpha = 1;
}
// #endregion

// #region core
function drawCore(t) {
  const k = prog.core;
  if (k <= 0) return;
  const r = S * k;
  const halo = ctx.createRadialGradient(
    cx, cy, r * 0.8, cx, cy, r * 3.4);
  halo.addColorStop(0, `rgba(120,80,255,${0.4 * k})`);
  halo.addColorStop(1, 'rgba(20, 10, 80, 0)');
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, W, H);
  ripples(t, k * (1 - 0.85 * prog.disk));
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, TAU);
  ctx.fill();
}

function ripples(t, k) {
  for (let i = 0; i < 4; i++) {
    const u = ((t - EVENTS.core) / 4 + i / 4) % 1;
    ctx.strokeStyle =
      `rgba(150, 130, 255, ${0.3 * (1 - u) * k})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, S * (1.2 + u * 3.2), 0, TAU);
    ctx.stroke();
  }
}
// #endregion

// #region spiral
const gas = Array.from({ length: GAS }, () => {
  const span = DISK_OUT - DISK_IN;
  const r = DISK_IN + Math.pow(rand(), 1.5) * span;
  return {
    r, far: r * 1.3 + 0.6 + rand() * 2.5,
    phi: rand() * TAU,
    lift: (rand() - 0.5) * 0.1 * r,
    tilt: (rand() - 0.5) * 2.4,
    yaw: rand() * TAU,
    delay: rand() * 3,
    size: 1.1 + rand() * 1.5,
    blob: rand() < 0.4,
  };
}).sort((a, b) => a.r - b.r);

const v = { x: 0, y: 0, z: 0, r: 0 };
function orbit(g, t, pitch) {
  const dt = t - EVENTS.spiral - g.delay;
  const r = lerp(g.far, g.r, ease(dt / 5));
  const w = 2.6 / Math.pow(r, 1.5);
  const a = g.phi + (t - EVENTS.core) * w;
  const f = 1 - settle(g, t);
  const x0 = r * Math.cos(a), z0 = r * Math.sin(a);
  const ct = Math.cos(g.tilt * f);
  const st = Math.sin(g.tilt * f);
  const y1 = g.lift * ct - z0 * st;
  const z1 = g.lift * st + z0 * ct;
  const cw = Math.cos(g.yaw * f);
  const sw = Math.sin(g.yaw * f);
  const x2 = x0 * cw + z1 * sw;
  const z2 = z1 * cw - x0 * sw;
  v.x = x2;
  v.y = y1 * Math.cos(pitch) - z2 * Math.sin(pitch);
  v.z = y1 * Math.sin(pitch) + z2 * Math.cos(pitch);
  v.r = r;
  return v;
}
// #endregion

// #region disk
function settle(g, t) {
  return ease((t - EVENTS.disk - g.delay) / 4);
}

function doppler(x, r) {
  return 0.55 + 0.45 * (1 - clamp(x / r, -1, 1));
}

function drawHaze(k, pitch) {
  if (k <= 0) return;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(1, Math.max(0.2, Math.sin(pitch)));
  const g = ctx.createRadialGradient(
    0, 0, S * DISK_IN * 0.8, 0, 0, S * DISK_OUT);
  g.addColorStop(0, `rgba(255,170,100,${0.22 * k})`);
  g.addColorStop(0.4, `rgba(255,100,55,${0.08 * k})`);
  g.addColorStop(1, 'rgba(70, 40, 190, 0)');
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, S * DISK_OUT, 0, TAU);
  ctx.fill();
  ctx.restore();
}
// #endregion

/* heat palette: cool violet at the rim, white-hot inside */
const HEAT = [
  [88, 70, 214], [140, 78, 206], [204, 88, 156],
  [255, 118, 70], [255, 166, 72], [255, 208, 136],
  [255, 240, 212],
];
const NB = 24;
const COLS = Array.from({ length: NB }, (_, i) => {
  const f = (i / (NB - 1)) * (HEAT.length - 1);
  const j = Math.min(HEAT.length - 2, f | 0), m = f - j;
  return HEAT[j].map((c, n) => Math.round(lerp(c, HEAT[j + 1][n], m)));
});
const FILL = COLS.map((c) => `rgb(${c})`);
const BLOBS = COLS.map((c) => {
  const s = document.createElement('canvas');
  s.width = s.height = 64;
  const b = s.getContext('2d');
  const g = b.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, `rgba(${c}, 1)`);
  g.addColorStop(1, `rgba(${c}, 0)`);
  b.fillStyle = g;
  b.fillRect(0, 0, 64, 64);
  return s;
});

// #region detail
function clump(g, t) {
  const n = Math.sin(g.phi * 3 + g.r * 5 - t * 0.7);
  const m = Math.sin(g.phi * 7 - g.r * 9 + t * 1.3);
  return 0.55 + 0.45 * n * m;
}

const dust = Array.from({ length: 220 }, () => ({
  x: rand(), y: rand(), z: 0.3 + rand() * 0.7,
  s: 1 + rand() * 3, p: rand() * TAU,
}));

function drawDust(t, k) {
  if (k <= 0) return;
  ctx.globalCompositeOperation = 'lighter';
  for (const d of dust) {
    const x = ((d.x + t * 0.006 * d.z) % 1) * W;
    const bob = Math.sin(t * 0.2 + d.p) * 0.01;
    const y = ((d.y + bob) % 1) * H;
    ctx.globalAlpha = 0.18 * k * d.z;
    ctx.fillStyle = '#b9a6ff';
    ctx.beginPath();
    ctx.arc(x, y, d.s * d.z, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}
// #endregion

// #region lensing
const dir = { x: 0, y: 0, stretch: 1 };
function bend(x, y, lens) {
  const b = Math.hypot(x, y) + 0.001;
  const E = lens * S * 1.3;
  const th = (b + Math.hypot(b, 2 * E)) / 2;
  dir.x = (x / b) * th;
  dir.y = (y / b) * th;
  dir.stretch = th / b;
  return dir;
}

const hit = { x: 0, y: 0, under: 0, lift: 0 };
function lensed(x, y, r, depth, lens) {
  const zn = clamp(depth / r);
  const far = smooth(zn * 4) * lens;
  hit.lift = S * (1.1 + (r - DISK_IN) * 0.2);
  hit.x = x;
  const up = -hit.lift * Math.pow(zn, 0.85);
  hit.y = lerp(y, up, far);
  hit.under = far * Math.pow(zn, 0.85);
  return hit;
}

function drawRing(lens) {
  if (lens <= 0) return;
  const x0 = cx - S, x1 = cx + S;
  const g = ctx.createLinearGradient(x0, 0, x1, 0);
  g.addColorStop(0, `rgba(255,236,200,${lens})`);
  g.addColorStop(1, `rgba(255,150,80,${lens / 3})`);
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = g;
  const rings = [[16, 1.07], [7, 1.03], [2.4, 1.01]];
  for (const [w, r] of rings) {
    ctx.globalAlpha = w > 10 ? 0.14 : w > 5 ? 0.3 : 1;
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.arc(cx, cy, S * r, 0, TAU);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}
// #endregion

// #region final
const nebula = [
  [0.2, 0.3, 0.7, '90, 50, 200'],
  [0.85, 0.7, 0.8, '40, 70, 190'],
  [0.5, 0.95, 0.6, '150, 60, 170'],
  [0.7, 0.1, 0.6, '60, 40, 150'],
];

function drawNebula(t, k) {
  if (k <= 0) return;
  ctx.globalCompositeOperation = 'lighter';
  nebula.forEach(([x, y, r, c], i) => {
    const dx = 0.02 * Math.sin(t * 0.1 + i);
    const dy = 0.02 * Math.cos(t * 0.13 + i);
    const px = W * (x + dx), py = H * (y + dy);
    const g = ctx.createRadialGradient(
      px, py, 0, px, py, W * r);
    g.addColorStop(0, `rgba(${c}, ${0.055 * k})`);
    g.addColorStop(1, `rgba(${c}, 0)`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  });
}

function drawFinish(k) {
  if (k <= 0) return;
  const sw = small.canvas.width;
  const sh = small.canvas.height;
  small.drawImage(canvas, 0, 0, sw, sh);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.18 * k;
  ctx.drawImage(small.canvas, 0, 0, W, H);
  ctx.globalAlpha = 1;
  const v = ctx.createRadialGradient(
    cx, cy, H * 0.35, cx, cy, W * 0.85);
  v.addColorStop(0, 'rgba(0, 0, 0, 0)');
  v.addColorStop(1, `rgba(0,0,0,${0.6 * k})`);
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
}
// #endregion
const small = document.createElement('canvas').getContext('2d');

/* ---------- gas: projection + drawing ---------- */
const GX = new Float32Array(GAS), GY = new Float32Array(GAS);
const GA = new Float32Array(GAS), GB = new Uint8Array(GAS);
const GF = new Uint8Array(GAS), GU = new Float32Array(GAS);
const GL = new Float32Array(GAS), GS = new Float32Array(GAS);

function project(t, pitch) {
  for (let i = 0; i < GAS; i++) {
    const g = gas[i];
    const o = orbit(g, t, pitch);
    const sc = 1 / (1 + o.z * 0.05);
    const h = lensed(o.x * S * sc, o.y * S * sc, o.r, o.z, prog.lens);
    const T = 1 - (g.r - DISK_IN) / (DISK_OUT - DISK_IN);
    const hot = lerp(0.2, Math.pow(T, 1.35), prog.disk);
    GB[i] = Math.round(clamp(hot) * (NB - 1));
    const born = ramp(t - EVENTS.spiral - g.delay, 1.2);
    const dop = lerp(1, doppler(o.x, o.r), prog.disk);
    const base = lerp(0.4, 0.4, prog.detail) * (0.5 + 0.8 * T);
    const turb = lerp(1, clump(g, t), prog.detail);
    GA[i] = base * born * dop * turb * Math.min(1.4, sc * 1.1)
      * (1 + 0.6 * h.under);
    GX[i] = cx + h.x;
    GY[i] = cy + h.y;
    GS[i] = g.size * (1 + 0.5 * prog.detail) * sc;
    GF[i] = o.z > 0 ? 1 : 0;
    GU[i] = h.under;
    GL[i] = h.lift;
  }
}

function drawGas(far) {
  ctx.globalCompositeOperation = 'lighter';
  for (let b = 0; b < NB; b++) {
    ctx.fillStyle = FILL[b];
    for (let i = 0; i < GAS; i++) {
      if (GB[i] !== b || GF[i] !== far || GA[i] < 0.02) continue;
      ctx.globalAlpha = Math.min(1, GA[i]);
      ctx.fillRect(GX[i], GY[i], GS[i], GS[i]);
      if (far && GU[i] > 0.05) {
        ctx.globalAlpha = Math.min(1, GA[i] * 0.45 * GU[i]);
        ctx.fillRect(GX[i], cy + (cy - GY[i]) * 0.8, GS[i], GS[i]);
      }
    }
  }
  const k = prog.detail;
  if (k > 0) {
    for (let i = 0; i < GAS; i++) {
      const g = gas[i];
      if (!g.blob || GF[i] !== far || GA[i] < 0.05) continue;
      const s = 16 + g.size * 16;
      ctx.globalAlpha = Math.min(0.5, GA[i] * 0.08 * k);
      ctx.drawImage(BLOBS[GB[i]], GX[i] - s / 2, GY[i] - s / 2, s, s);
    }
  }
  ctx.globalAlpha = 1;
}

/* ---------- opening title ---------- */
const title = document.createElement('canvas');
const tctx = title.getContext('2d', { willReadFrequently: true });
const LINES = ["LET'S BUILD", 'A BLACK', 'HOLE.'];
function drawTitle(t) {
  const fade = 1 - smooth((t - 3.0) / 1.4);
  if (fade <= 0) return;
  title.width = W; title.height = H;
  tctx.clearRect(0, 0, W, H);
  const font = (px) => `700 ${px}px Inter, Helvetica, Arial, sans-serif`;
  tctx.font = font(100);
  const fs = Math.min(128, 100 * (W * 0.84) / tctx.measureText(LINES[0]).width);
  tctx.font = font(fs);
  tctx.textBaseline = 'middle';
  tctx.fillStyle = '#fff';
  const lh = fs * 1.12;
  const y0 = cy - lh;
  let ox = 0, oy = 0;
  let idx = 0;
  LINES.forEach((line, li) => {
    const sp = fs * 0.03;
    let width = 0;
    for (const ch of line) width += tctx.measureText(ch).width + sp;
    width -= sp;
    let x = cx - width / 2;
    const y = y0 + li * lh;
    for (const ch of line) {
      const w = tctx.measureText(ch).width;
      const a = ease((t - 0.25 - idx * 0.07) / 0.6);
      tctx.globalAlpha = a;
      tctx.save();
      tctx.translate(x + w / 2, y + (1 - a) * fs * 0.25);
      tctx.shadowColor = 'rgba(140,110,255,0.8)';
      tctx.shadowBlur = 24 * a;
      tctx.textAlign = 'center';
      tctx.fillText(ch, 0, 0);
      tctx.restore();
      if (li === 2 && ch === 'O') { ox = x + w / 2; oy = y; }
      x += w + sp;
      idx++;
    }
  });
  tctx.globalAlpha = 1;
  const k = smooth((t - 1.5) / 2.2);
  if (k > 0) warpTitle(ox, oy, fs, k);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = fade;
  ctx.drawImage(title, 0, 0);
  if (k > 0) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = `rgba(255, 190, 120, ${0.9 * k})`;
    ctx.lineWidth = 3;
    ctx.shadowColor = '#ff9a4a';
    ctx.shadowBlur = 24;
    ctx.beginPath();
    ctx.arc(ox, oy, fs * 0.16, 0, TAU);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
}

function warpTitle(ox, oy, fs, k) {
  const R = Math.round(fs * 1.5);
  const x0 = Math.round(ox - R), y0 = Math.round(oy - R);
  const src = tctx.getImageData(x0, y0, R * 2, R * 2);
  const dst = tctx.createImageData(R * 2, R * 2);
  const E = fs * 0.2 * k;
  for (let j = 0; j < R * 2; j++) {
    for (let i = 0; i < R * 2; i++) {
      const dx = i - R, dy = j - R;
      const r = Math.hypot(dx, dy) + 0.001;
      const fall = 1 - smooth(r / (fs * 0.8));
      const rs = r + (E * E / (r + E * 0.3)) * fall * 1.2;
      const sx = Math.round(R + (dx / r) * rs);
      const sy = Math.round(R + (dy / r) * rs);
      const o = (j * R * 2 + i) * 4;
      if (r < fs * 0.12 * k) { dst.data[o + 3] = 0; continue; }
      if (sx < 0 || sy < 0 || sx >= R * 2 || sy >= R * 2) continue;
      const q = (sy * R * 2 + sx) * 4;
      dst.data[o] = src.data[q]; dst.data[o + 1] = src.data[q + 1];
      dst.data[o + 2] = src.data[q + 2]; dst.data[o + 3] = src.data[q + 3];
    }
  }
  tctx.clearRect(x0, y0, R * 2, R * 2);
  tctx.putImageData(dst, x0, y0);
}

/* ---------- frame ---------- */
function render(t) {
  progress(t);
  const pitch = lerp(0.62, TILT, prog.lens);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#02030a');
  bg.addColorStop(0.5, '#05061a');
  bg.addColorStop(1, '#010208');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  const zoom = 1 + 0.1 * prog.final;
  ctx.translate(cx, cy);
  ctx.scale(zoom, zoom);
  ctx.translate(-cx, -cy);
  drawNebula(t, prog.final);
  drawStars(t, prog.lens);
  drawDust(t, 0.3 + prog.detail * 0.7);
  drawHaze(prog.disk * (0.4 + 0.6 * prog.detail), pitch);
  project(t, pitch);
  drawGas(1);
  drawCore(t);
  drawRing(prog.lens);
  drawGas(0);
  ctx.restore();
  drawFinish(prog.final);
  drawTitle(t);
}

function resize() {
  W = canvas.width = Math.max(2, Math.round(canvas.clientWidth));
  H = canvas.height = Math.max(2, Math.round(canvas.clientHeight));
  cx = W / 2; cy = H / 2; S = W * SHADOW;
  small.canvas.width = Math.round(W / 6);
  small.canvas.height = Math.round(H / 6);
}
window.addEventListener('resize', resize);
resize();

if (location.search.includes('manual')) {
  window.PF = { EVENTS, render, resize };
} else {
  const t0 = performance.now();
  const loop = (now) => {
    render(((now - t0) / 1000) % LOOP_SECONDS);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}
