/* Small math and drawing helpers shared by the renderer. */

const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
const lerp = (a, b, k) => a + (b - a) * k;

// Easing curves. All of them clamp their input to 0..1.
const ease = (k) => 1 - Math.pow(1 - clamp(k), 3);
const easeInOut = (k) => {
  const x = clamp(k);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
};
const easeBack = (k) => {
  const x = clamp(k);
  return 1 + 2.70158 * Math.pow(x - 1, 3) + 1.70158 * Math.pow(x - 1, 2);
};

// rgb triplet + alpha -> CSS colour, and a linear blend of two triplets.
const tone = (rgb, alpha = 1) => `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
const mix = (a, b, k) => a.map((v, i) => Math.round(lerp(v, b[i], k)));

// Point on the radar: compass degrees (0 = top, clockwise), k = radius fraction.
function polar(g, deg, k) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return [g.cx + Math.cos(rad) * g.r * k, g.cy + Math.sin(rad) * g.r * k];
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Tiny deterministic random generator (mulberry32) so the scene always
// looks the same: particles and similar details never change between runs.
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
