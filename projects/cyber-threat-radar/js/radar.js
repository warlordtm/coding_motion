/* Cyber Threat Radar: canvas renderer.

   The whole scene is a pure function of time: render(t) draws exactly
   what the radar looks like t seconds into the simulation. Which parts are
   visible is decided by `events`, a table of start times (see config.js).
   All data shown is simulated. */

// #region setup
const TAU = Math.PI * 2;
const RINGS = 5;
// #endregion

const FONT_SANS = '"Inter", "Segoe UI", system-ui, sans-serif';
const FONT_MONO = '"JetBrains Mono", ui-monospace, Menlo, Consolas, monospace';

/* ------------------------------------------------------------------ */
/* Drawing primitives. Each one draws a single visual element.         */
/* g = radar geometry { cx, cy, r, u }, u = overall scale factor.      */
/* a = seconds since the element's stage started.                      */
/* ------------------------------------------------------------------ */

// #region rings
function drawRings(ctx, g, a) {
  ctx.shadowColor = tone(C.cyan, 0.7);
  for (let i = 1; i <= RINGS; i++) {
    const k = ease(a * 1.4 - i * 0.1);
    const r = (g.r * i * k) / RINGS;
    ctx.beginPath();
    ctx.arc(g.cx, g.cy, r, 0, TAU);
    ctx.lineWidth = i === RINGS ? 2.5 * g.u : g.u;
    ctx.shadowBlur = i === RINGS ? 16 * g.u : 0;
    ctx.strokeStyle = tone(C.cyan, 0.12 + 0.04 * i);
    ctx.stroke();
  }
  ctx.shadowBlur = 0;
}
// #endregion

// #region grid
function drawGrid(ctx, g, a) {
  const k = ease(a * 1.2);
  ctx.lineWidth = g.u;
  for (let deg = 0; deg < 360; deg += 5) {
    const major = deg % 30 === 0;
    const from = major ? 0 : 0.965;
    const [x1, y1] = polar(g, deg, from * k);
    const [x2, y2] = polar(g, deg, k);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    const alpha = major ? 0.2 : 0.4;
    ctx.strokeStyle = tone(C.blue, alpha);
    ctx.stroke();
  }
}
// #endregion

// #region sweep
function drawSweep(ctx, g, deg, a) {
  const rad = ((deg - 90) * Math.PI) / 180;
  const trail = 1.1 * ease(a);
  const edge = trail / TAU;
  const start = rad - trail;
  const grad = ctx.createConicGradient(
    start, g.cx, g.cy);
  grad.addColorStop(0, tone(C.cyan, 0));
  grad.addColorStop(edge, tone(C.cyan, 0.34));
  grad.addColorStop(edge + 0.001, tone(C.cyan, 0));
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(g.cx, g.cy);
  ctx.arc(g.cx, g.cy, g.r, start, rad);
  ctx.fill();
  drawBeam(ctx, g, deg);
}

function drawBeam(ctx, g, deg) {
  const [x, y] = polar(g, deg, 1);
  ctx.shadowColor = tone(C.cyan, 1);
  ctx.shadowBlur = 16 * g.u;
  ctx.strokeStyle = tone(C.cyan, 0.95);
  ctx.lineWidth = 2 * g.u;
  ctx.beginPath();
  ctx.moveTo(g.cx, g.cy);
  ctx.lineTo(x, y);
  ctx.stroke();
  ctx.shadowBlur = 0;
}
// #endregion

// #region nodes
function drawNode(ctx, p, rgb, a, glow) {
  const s = ease(a * 3);
  ctx.shadowColor = tone(rgb, 0.9);
  ctx.shadowBlur = (10 + 22 * glow) * p.u;
  ctx.fillStyle = tone(rgb, 1);
  ctx.beginPath();
  ctx.arc(p.x, p.y, 4.5 * s * p.u, 0, TAU);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = tone(rgb, 0.5 * (1 - ease(a)));
  const r = (6 + 30 * ease(a)) * p.u;
  ctx.beginPath();
  ctx.arc(p.x, p.y, r, 0, TAU);
  ctx.stroke();
}
// #endregion

// #region links
function drawLink(ctx, a, b, k, rgb) {
  const x = lerp(a.x, b.x, k);
  const y = lerp(a.y, b.y, k);
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(x, y);
  ctx.strokeStyle = tone(rgb, 0.38);
  ctx.stroke();
}

function drawPacket(ctx, a, b, k, rgb) {
  ctx.fillStyle = tone(rgb, 0.95);
  const x = lerp(a.x, b.x, k);
  const y = lerp(a.y, b.y, k);
  ctx.beginPath();
  ctx.arc(x, y, 2.6 * a.u, 0, TAU);
  ctx.fill();
}
// #endregion

// #region threat
function nodeColor(a) {
  const k = a < 0 ? 0 : ease(a * 4);
  return mix(C.cyan, C.red, k);
}

function drawAlert(ctx, p, a) {
  for (let i = 0; i < 3; i++) {
    const k = clamp(a * 0.8 - i * 0.2);
    ctx.beginPath();
    ctx.arc(p.x, p.y, (12 + 110 * k) * p.u, 0, TAU);
    ctx.strokeStyle = tone(C.red, 0.7 * (1 - k));
    ctx.stroke();
  }
}
// #endregion

// #region panel
const reportRows = (isolated) => [
  ["THREAT TYPE", "Suspicious Network Activity"],
  ["RISK LEVEL", "HIGH"],
  ["STATUS", isolated ? "ISOLATED" : "ACTIVE"],
  ["SOURCE", "SIMULATED NODE 07"],
];

function drawCallout(ctx, from, to, a) {
  const k = ease(a * 2);
  const x = lerp(from.x, to.x, k);
  const y = lerp(from.y, to.y, k);
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(x, y);
  ctx.strokeStyle = tone(C.red, 0.8);
  ctx.stroke();
}
// #endregion

// #region status
const FINAL_STATUS = [
  "THREAT DETECTED",
  "NETWORK NODE ISOLATED",
  "SYSTEM STATUS: PROTECTED",
];

function isolateNode(radar, t) {
  radar.events.isolate = t;
  radar.events.protect = t + 1.2;
}
// #endregion

/* Brackets that close in on the suspicious node ("target locked"). */
function drawReticle(ctx, p, a) {
  const k = ease(a * 2.2);
  const s = (22 + 42 * (1 - k)) * p.u;
  const len = 9 * p.u;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate((1 - k) * 1.2);
  ctx.strokeStyle = tone(C.red, 0.95 * k);
  ctx.shadowColor = tone(C.red, 0.9);
  ctx.shadowBlur = 8 * p.u;
  ctx.lineWidth = 2 * p.u;
  for (let i = 0; i < 4; i++) {
    ctx.rotate(Math.PI / 2);
    ctx.beginPath();
    ctx.moveTo(-s, -s + len);
    ctx.lineTo(-s, -s);
    ctx.lineTo(-s + len, -s);
    ctx.stroke();
  }
  ctx.restore();
}

/* Radar background disc, drifting dust and the dashed outer halo. */
function makeDust(count) {
  const rand = seeded(11);
  return Array.from({ length: count }, () => ({
    deg: rand() * 360,
    k: Math.sqrt(rand()) * 1.05,
    speed: (rand() - 0.5) * 5,
    size: 0.8 + rand() * 1.6,
    phase: rand() * TAU,
  }));
}

/* ------------------------------------------------------------------ */
/* Layout: where the radar and the report panel sit on the canvas.    */
/* ------------------------------------------------------------------ */

const PANEL_HEIGHT = 246; // design units, scaled by u

function computeLayout(w, h, top, bottom) {
  const wide = w / h > 1.35;
  const u = wide ? Math.min(w / 1500, h / 940) : w / 1080;
  const margin = 36 * u;
  const dw = wide ? 800 : 1008;
  const pw = dw * u;
  const ph = PANEL_HEIGHT * u;
  let panel, area;
  if (wide) {
    const px = w - margin - pw;
    const cy = top + (h - top - bottom) / 2;
    panel = { x: px, y: cy - ph / 2, w: pw, h: ph, dw, u };
    area = { x: margin, y: top, w: px - 2 * margin, h: h - top - bottom };
  } else {
    const py = h - bottom - ph - 24 * u;
    panel = { x: margin, y: py, w: pw, h: ph, dw, u };
    area = { x: 0, y: top, w, h: py - 16 * u - top };
  }
  const r = Math.min(area.w * 0.42, area.h / 2 / 1.14);
  return { w, h, u, wide, panel, area, cx: area.x + area.w / 2, cy: area.y + area.h / 2, r };
}

/* ------------------------------------------------------------------ */

class ThreatRadar {
  constructor(canvas, hud) {
    this.canvas = canvas;
    this.hud = hud;
    this.ctx = canvas.getContext("2d");
    this.events = { ...DEFAULT_EVENTS };
    this.nodes = NODE_DEFS.map((n) => ({ ...n }));
    this.byId = Object.fromEntries(this.nodes.map((n) => [n.id, n]));
    this.dust = makeDust(56);
    this.resize();
  }

  reset() {
    this.events = { ...DEFAULT_EVENTS };
  }

  /* Match the canvas to its CSS size and recompute the layout. */
  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.dpr = dpr;
    this.w = Math.max(1, Math.round(rect.width));
    this.h = Math.max(1, Math.round(rect.height));
    this.canvas.width = Math.round(this.w * dpr);
    this.canvas.height = Math.round(this.h * dpr);
    const style = getComputedStyle(this.canvas.parentElement);
    const bottom = parseFloat(style.getPropertyValue("--safe-bottom")) || 0;
    const top = this.hud ? Math.max(0, this.hud.getBoundingClientRect().bottom - rect.top) : 0;
    this.layout = computeLayout(this.w, this.h, top, bottom);
  }

  geo() {
    const L = this.layout;
    return { cx: L.cx, cy: L.cy, r: L.r, u: L.u };
  }

  pos(node) {
    const g = this.geo();
    const [x, y] = polar(g, node.deg, node.k);
    return { x, y, u: g.u };
  }

  nodePosition(id) {
    return this.pos(this.byId[id]);
  }

  /* Rectangle of the "isolate" button, in canvas CSS pixels. */
  buttonRect() {
    const P = this.layout.panel;
    return { x: P.x + (P.dw - 32 - 250) * P.u, y: P.y + 11 * P.u, w: 250 * P.u, h: 52 * P.u };
  }

  /* ---------- timing helpers ---------- */

  sweepDeg(t) {
    const d = ((t - (this.events.sweep ?? 0)) / SWEEP_PERIOD) * 360;
    return ((d % 360) + 360) % 360;
  }

  /* The moment the beam first passes over a node after nodes start. */
  revealAt(node) {
    const ev = this.events;
    if (ev.nodes == null) return Infinity;
    if (ev.sweep == null) return ev.nodes;
    const delta = (((node.deg - this.sweepDeg(ev.nodes)) % 360) + 360) % 360;
    return ev.nodes + (delta / 360) * SWEEP_PERIOD;
  }

  linkStart(j) {
    const ev = this.events;
    if (ev.links == null) return Infinity;
    const [ia, ib] = EDGES[j];
    return Math.max(
      ev.links + j * 0.12,
      this.revealAt(this.byId[ia]) + 0.15,
      this.revealAt(this.byId[ib]) + 0.15
    );
  }

  /* ---------- main entry point ---------- */

  render(t) {
    const { ctx, w, h, dpr } = this;
    const ev = this.events;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.lineCap = "round";
    const L = this.layout;
    const g = this.geo();
    const since = (name) => (ev[name] == null ? -1 : t - ev[name]);

    if (since("rings") >= 0) {
      this.drawDisc(g, since("rings"));
      this.drawDust(g, t, since("rings"));
      drawRings(ctx, g, since("rings"));
    }
    if (since("grid") >= 0) {
      drawGrid(ctx, g, since("grid"));
      this.drawLabels(g, since("grid"));
    }
    if (since("sweep") >= 0) drawSweep(ctx, g, this.sweepDeg(t), since("sweep"));
    if (since("links") >= 0) this.drawLinks(g, t);
    if (since("nodes") >= 0) {
      this.drawSignals(g, t);
      this.drawNodes(g, t);
    }
    this.drawThreatLayer(g, t);
    this.drawProtectWave(g, t);
    this.drawPanel(L, t);
    this.drawReadouts(L, t);
  }

  /* ---------- background pieces ---------- */

  drawDisc(g, a) {
    const ctx = this.ctx;
    const k = ease(a * 1.6);
    const fill = ctx.createRadialGradient(g.cx, g.cy, 0, g.cx, g.cy, g.r);
    fill.addColorStop(0, tone(C.cyan, 0.09 * k));
    fill.addColorStop(0.7, tone(C.blue, 0.045 * k));
    fill.addColorStop(1, tone(C.blue, 0));
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.arc(g.cx, g.cy, g.r, 0, TAU);
    ctx.fill();
    ctx.save();
    ctx.setLineDash([2 * g.u, 9 * g.u]);
    ctx.lineDashOffset = -a * 14 * g.u;
    ctx.strokeStyle = tone(C.blue, 0.4 * k);
    ctx.lineWidth = 1.5 * g.u;
    ctx.beginPath();
    ctx.arc(g.cx, g.cy, g.r * 1.045, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }

  drawDust(g, t, a) {
    const ctx = this.ctx;
    const fade = ease(a - 0.4);
    for (const d of this.dust) {
      const [x, y] = polar(g, d.deg + d.speed * t, d.k);
      const twinkle = 0.5 + 0.5 * Math.sin(t * 1.3 + d.phase);
      ctx.fillStyle = tone(C.white, (0.1 + 0.3 * twinkle) * fade);
      ctx.beginPath();
      ctx.arc(x, y, d.size * g.u, 0, TAU);
      ctx.fill();
    }
  }

  /* Degree labels around the rim: 000, 030, 060 ... */
  drawLabels(g, a) {
    const ctx = this.ctx;
    ctx.save();
    ctx.font = `500 ${16 * g.u}px ${FONT_MONO}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = tone(C.cyan, 0.6 * ease(a * 1.2));
    for (let deg = 0; deg < 360; deg += 30) {
      const [x, y] = polar(g, deg, 1.085);
      ctx.fillText(String(deg).padStart(3, "0"), x, y);
    }
    ctx.restore();
  }

  /* A few amber markers drifting along the rings (secondary indicators). */
  drawSignals(g, t) {
    const ctx = this.ctx;
    const marks = [[0.35, 11, 0], [0.62, -8, 140], [0.9, 6, 250]];
    for (const [k, speed, phase] of marks) {
      const deg = (t * speed + phase) % 360;
      ctx.beginPath();
      for (let i = 0; i <= 12; i++) {
        const [x, y] = polar(g, deg - Math.sign(speed) * i * 1.6, k);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = tone(C.amber, 0.3);
      ctx.lineWidth = 1.5 * g.u;
      ctx.stroke();
      const [x, y] = polar(g, deg, k);
      const s = 4.5 * g.u;
      ctx.fillStyle = tone(C.amber, 0.95);
      ctx.beginPath();
      ctx.moveTo(x, y - s);
      ctx.lineTo(x + s, y);
      ctx.lineTo(x, y + s);
      ctx.lineTo(x - s, y);
      ctx.closePath();
      ctx.fill();
    }
  }

  /* ---------- network: links and nodes ---------- */

  drawLinks(g, t) {
    const ctx = this.ctx;
    const ev = this.events;
    const ta = ev.threat == null ? -1 : t - ev.threat;
    const iso = ev.isolate != null && t >= ev.isolate ? t - ev.isolate : -1;
    ctx.lineWidth = 1.2 * g.u;
    EDGES.forEach(([ia, ib], j) => {
      const a0 = t - this.linkStart(j);
      if (a0 < 0) return;
      const touches = ia === THREAT_ID || ib === THREAT_ID;
      let A = this.byId[ia];
      let B = this.byId[ib];
      if (ia === THREAT_ID) [A, B] = [B, A]; // always draw towards the threat node
      const pa = this.pos(A);
      const pb = this.pos(B);
      let k = ease(a0 * 2);
      if (touches && iso >= 0) k *= 1 - ease(iso / 0.7); // isolation cuts the link
      if (k < 0.001) return;
      const rgb = touches ? mix(C.cyan, C.red, ease(ta * 3)) : C.cyan;
      drawLink(ctx, pa, pb, k, rgb);
      if (k > 0.999 && j % 2 === 0) {
        drawPacket(ctx, pa, pb, (t * 0.34 + j * 0.37) % 1, rgb);
      }
    });
  }

  drawNodes(g, t) {
    const ctx = this.ctx;
    const ev = this.events;
    const sweepOn = ev.sweep != null;
    const sd = this.sweepDeg(t);
    const ta = ev.threat == null ? -1 : t - ev.threat;
    const pulse = 0.5 + 0.5 * Math.sin(t * 6);
    ctx.lineWidth = g.u;
    for (const n of this.nodes) {
      const a = t - this.revealAt(n);
      if (a < 0) continue;
      const since = ((((sd - n.deg) % 360) + 360) % 360 / 360) * SWEEP_PERIOD;
      let glow = sweepOn ? Math.exp(-since * 1.8) : 0.4;
      const isThreat = n.id === THREAT_ID;
      if (isThreat && ta >= 0) glow = 0.55 + 0.45 * pulse;
      drawNode(ctx, this.pos(n), isThreat ? nodeColor(ta) : C.cyan, a, glow);
    }
  }

  /* ---------- threat: alert, reticle, callout, isolation ---------- */

  drawThreatLayer(g, t) {
    const ctx = this.ctx;
    const ev = this.events;
    const u = g.u;
    const a = ev.threat == null ? -1 : t - ev.threat;
    if (a < 0) return;
    const p = this.pos(this.byId[THREAT_ID]);
    const iso = ev.isolate != null && t >= ev.isolate ? t - ev.isolate : -1;
    const pro = ev.protect != null && t >= ev.protect ? t - ev.protect : -1;
    const live = iso < 0 ? 1 : 1 - ease(iso / 0.8); // how alarming the scene still is

    ctx.lineWidth = 1.5 * u;
    drawAlert(ctx, p, a);

    if (iso < 0) {
      // a steady warning pulse around the node
      const k = (t * 0.9) % 1;
      ctx.beginPath();
      ctx.arc(p.x, p.y, (14 + 26 * k) * u, 0, TAU);
      ctx.strokeStyle = tone(C.red, 0.55 * (1 - k));
      ctx.stroke();
    }

    if (live > 0) {
      // a faint red glow breathing around the edges of the screen
      const pulse = 0.5 + 0.5 * Math.sin(t * 5.2);
      const m = Math.min(this.w, this.h);
      const vg = ctx.createRadialGradient(this.w / 2, this.h / 2, m * 0.35, this.w / 2, this.h / 2, Math.max(this.w, this.h) * 0.75);
      vg.addColorStop(0, tone(C.red, 0));
      vg.addColorStop(1, tone(C.red, (0.05 + 0.08 * pulse) * ease(a * 2) * live));
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, this.w, this.h);
    }

    if (ev.lock != null && t >= ev.lock) {
      ctx.globalAlpha = live;
      drawReticle(ctx, p, t - ev.lock);
      ctx.globalAlpha = 1;
    }

    if (ev.panel != null && t >= ev.panel) {
      const P = this.layout.panel;
      const slide = (1 - ease((t - ev.panel - 0.15) * 2.4)) * 28 * u;
      const to = { x: clamp(p.x, P.x + 60 * u, P.x + P.w - 60 * u), y: P.y + slide };
      ctx.globalAlpha = pro < 0 ? 1 : 1 - ease(pro / 0.6);
      ctx.lineWidth = 1.5 * u;
      drawCallout(ctx, p, to, t - ev.panel);
      ctx.globalAlpha = 1;
    }

    if (iso >= 0) this.drawContainment(p, iso, t);

    ctx.save();
    ctx.font = `600 ${15 * u}px ${FONT_MONO}`;
    ctx.letterSpacing = `${1.5 * u}px`;
    ctx.fillStyle = tone(iso < 0 ? C.red : C.cyan, 0.95 * ease(a * 3));
    ctx.fillText("NODE 07", p.x + 18 * u, p.y - 18 * u);
    ctx.restore();
  }

  /* Cyan rings and a dashed cage close around the isolated node. */
  drawContainment(p, iso, t) {
    const ctx = this.ctx;
    const u = p.u;
    for (let i = 0; i < 3; i++) {
      const k = clamp(iso * 0.9 - i * 0.22);
      ctx.beginPath();
      ctx.arc(p.x, p.y, (16 + 100 * k) * u, 0, TAU);
      ctx.strokeStyle = tone(C.cyan, 0.8 * (1 - k));
      ctx.lineWidth = 2 * u;
      ctx.stroke();
    }
    const k = ease(iso * 2.5);
    ctx.save();
    ctx.setLineDash([5 * u, 5 * u]);
    ctx.lineDashOffset = -t * 14 * u;
    ctx.strokeStyle = tone(C.cyan, 0.95 * k);
    ctx.lineWidth = 2 * u;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 22 * u, 0, TAU);
    ctx.stroke();
    ctx.restore();
    const s = 7 * u * k;
    ctx.strokeStyle = tone(C.white, 0.9 * k);
    ctx.lineWidth = 2 * u;
    ctx.beginPath();
    ctx.moveTo(p.x - s, p.y - s);
    ctx.lineTo(p.x + s, p.y + s);
    ctx.moveTo(p.x + s, p.y - s);
    ctx.lineTo(p.x - s, p.y + s);
    ctx.stroke();
  }

  /* One calm cyan wave across the whole radar once the system is protected. */
  drawProtectWave(g, t) {
    const ev = this.events;
    if (ev.protect == null || t < ev.protect) return;
    const k = clamp((t - ev.protect) / 1.3);
    if (k >= 1) return;
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.arc(g.cx, g.cy, g.r * 1.1 * ease(k), 0, TAU);
    ctx.strokeStyle = tone(C.cyan, 0.7 * (1 - k));
    ctx.lineWidth = 3 * g.u;
    ctx.shadowColor = tone(C.cyan, 0.9);
    ctx.shadowBlur = 20 * g.u;
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  /* ---------- report panel ---------- */

  drawPanel(L, t) {
    const ctx = this.ctx;
    const ev = this.events;
    const P = L.panel;
    if (ev.panel == null) return;
    const a = t - ev.panel - 0.15;
    if (a < 0) return;
    const k = ease(a * 2.4);
    const iso = ev.isolate != null && t >= ev.isolate ? t - ev.isolate : -1;
    const pro = ev.protect != null && t >= ev.protect ? t - ev.protect : -1;
    const fin = pro < 0 ? 0 : ease(pro * 2.2);
    const armed = ev.status != null && t >= ev.status;
    const pulse = 0.5 + 0.5 * Math.sin(t * 5.2);
    const accent = mix(C.red, C.cyan, iso < 0 ? 0 : ease(iso * 1.5));
    const W = P.dw;
    const H = PANEL_HEIGHT;

    const text = (s, x, y, font, color, align = "left", spacing = 0) => {
      ctx.font = font;
      ctx.fillStyle = color;
      ctx.textAlign = align;
      ctx.letterSpacing = `${spacing}px`;
      ctx.fillText(s, x, y);
    };

    ctx.save();
    ctx.translate(P.x, P.y + (1 - k) * 28 * P.u);
    ctx.scale(P.u, P.u);

    // glass body
    ctx.globalAlpha = k;
    roundRect(ctx, 0, 0, W, H, 22);
    const body = ctx.createLinearGradient(0, 0, 0, H);
    body.addColorStop(0, "rgba(24, 40, 66, 0.80)");
    body.addColorStop(1, "rgba(8, 14, 26, 0.86)");
    ctx.shadowColor = tone(accent, 0.3 + 0.12 * pulse * (1 - fin));
    ctx.shadowBlur = 44;
    ctx.fillStyle = body;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = tone(accent, 0.55);
    ctx.stroke();
    const rim = ctx.createLinearGradient(0, 0, W, 0);
    rim.addColorStop(0, tone(accent, 0));
    rim.addColorStop(0.5, tone(accent, 0.9));
    rim.addColorStop(1, tone(accent, 0));
    ctx.fillStyle = rim;
    ctx.fillRect(28, 0, W - 56, 2);

    // report view: header, button and the four fields
    ctx.globalAlpha = k * (1 - fin);
    if (ctx.globalAlpha > 0.01) {
      const dot = 7 + 3 * pulse * (iso < 0 ? 1 : 0);
      ctx.fillStyle = tone(iso < 0 ? C.red : C.cyan, 0.25);
      ctx.beginPath();
      ctx.arc(46, 38, dot + 6, 0, TAU);
      ctx.fill();
      ctx.fillStyle = tone(iso < 0 ? C.red : C.cyan, 1);
      ctx.beginPath();
      ctx.arc(46, 38, 7, 0, TAU);
      ctx.fill();
      text(FINAL_STATUS[0], 68, 49, `700 31px ${FONT_SANS}`, tone(C.white), "left", 3);
      this.drawButton(ctx, W, a, iso, armed, pulse, text);
      ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
      ctx.fillRect(32, 76, W - 64, 1);

      const right = W > 900 ? 585 : 502;
      const SLOT = {
        "THREAT TYPE": [32, 106],
        "RISK LEVEL": [right, 106],
        SOURCE: [32, 182],
        STATUS: [right, 182],
      };
      reportRows(iso >= 0.25).forEach(([label, value], i) => {
        const [x, y] = SLOT[label];
        ctx.globalAlpha = k * (1 - fin) * ease((a - 0.12 * i) * 3.5);
        text(label, x, y, `600 16px ${FONT_MONO}`, tone(C.blue, 0.85), "left", 2.5);
        const vy = y + 36;
        if (label === "RISK LEVEL") {
          roundRect(ctx, x, vy - 31, 116, 44, 22);
          ctx.fillStyle = tone(C.red, 0.16);
          ctx.fill();
          ctx.strokeStyle = tone(C.red, 0.85);
          ctx.lineWidth = 1.5;
          ctx.stroke();
          text(value, x + 58, vy - 1, `700 23px ${FONT_SANS}`, tone(mix(C.red, C.white, 0.2)), "center", 3);
        } else if (label === "STATUS") {
          const done = value === "ISOLATED";
          const col = done ? C.cyan : mix(C.red, C.white, 0.2);
          if (done) {
            ctx.strokeStyle = tone(C.cyan, 1);
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(x + 13, vy - 10, 13, 0, TAU);
            ctx.moveTo(x + 7, vy - 10);
            ctx.lineTo(x + 12, vy - 5);
            ctx.lineTo(x + 20, vy - 15);
            ctx.stroke();
          } else {
            ctx.fillStyle = tone(C.red, 0.4 + 0.6 * pulse);
            ctx.beginPath();
            ctx.arc(x + 11, vy - 10, 8, 0, TAU);
            ctx.fill();
          }
          text(value, x + 36, vy, `700 28px ${FONT_SANS}`, tone(col), "left", 1);
        } else {
          text(value, x, vy, `600 28px ${FONT_SANS}`, tone(C.white));
        }
      });
    }

    // final status view
    ctx.globalAlpha = k * fin;
    if (ctx.globalAlpha > 0.01) {
      const big = W > 900 ? 48 : 40;
      text(FINAL_STATUS[0], 36, 66, `700 22px ${FONT_SANS}`, tone(C.red, 0.9), "left", 4);
      text(FINAL_STATUS[1], 36, 134, `700 ${big}px ${FONT_SANS}`, tone(C.white), "left", 1);
      this.drawShield(ctx, 36, 160, 40, fin);
      text(FINAL_STATUS[2], 90, 196, `600 30px ${FONT_SANS}`, tone(C.cyan), "left", 2);
    }
    ctx.restore();
  }

  drawButton(ctx, W, a, iso, armed, pulse, text) {
    const x = W - 32 - 250;
    const y = 11;
    const pressed = iso >= 0 && iso < 0.2 ? 0.95 : 1;
    ctx.save();
    ctx.translate(x + 125, y + 26);
    ctx.scale(pressed, pressed);
    ctx.translate(-125, -26);
    roundRect(ctx, 0, 0, 250, 52, 26);
    if (iso >= 0) {
      ctx.fillStyle = tone(C.cyan, iso < 0.25 ? 0.55 - iso : 0.16);
      ctx.fill();
      ctx.strokeStyle = tone(C.cyan, 0.85);
    } else if (armed) {
      ctx.shadowColor = tone(C.cyan, 0.8);
      ctx.shadowBlur = 14 + 10 * pulse;
      ctx.fillStyle = tone(C.cyan, 0.12 + 0.06 * pulse);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = tone(C.cyan, 0.95);
    } else {
      ctx.fillStyle = "rgba(255, 255, 255, 0.04)";
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
    }
    ctx.lineWidth = 1.5;
    ctx.stroke();
    const label = iso >= 0 ? "NODE ISOLATED" : "ISOLATE NODE";
    const colour = iso >= 0 || armed ? tone(C.white) : tone(C.white, 0.4);
    text(label, 125, 33, `700 19px ${FONT_SANS}`, colour, "center", 2);
    ctx.restore();
  }

  drawShield(ctx, x, y, s, k) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s / 40, s / 40);
    ctx.beginPath();
    ctx.moveTo(20, 2);
    ctx.lineTo(36, 8);
    ctx.lineTo(35, 22);
    ctx.quadraticCurveTo(33, 33, 20, 39);
    ctx.quadraticCurveTo(7, 33, 5, 22);
    ctx.lineTo(4, 8);
    ctx.closePath();
    ctx.fillStyle = tone(C.cyan, 0.16);
    ctx.fill();
    ctx.strokeStyle = tone(C.cyan, 1);
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(12, 20);
    ctx.lineTo(18, 26);
    ctx.lineTo(29, 14);
    ctx.stroke();
    ctx.restore();
  }

  /* ---------- corner read-outs (appear with the "status" stage) ---------- */

  drawReadouts(L, t) {
    const ctx = this.ctx;
    const ev = this.events;
    if (ev.status == null || t < ev.status) return;
    const a = t - ev.status;
    const u = L.u;
    const iso = ev.isolate != null && t >= ev.isolate ? t - ev.isolate : -1;
    const pro = ev.protect != null && t >= ev.protect ? t - ev.protect : -1;
    const alerting = ev.threat != null && t >= ev.threat && !(iso >= 0.6);
    const nodes = this.nodes.filter((n) => t >= this.revealAt(n)).length;
    const links = EDGES.filter((_, j) => t - this.linkStart(j) >= 0.5).length;
    const system = pro >= 0 ? "PROTECTED" : alerting ? "ALERT" : "MONITORING";
    const left = [
      ["NODES", String(nodes), C.cyan],
      ["LINKS", String(links), C.cyan],
    ];
    const right = [
      ["THREATS", alerting ? "1" : "0", alerting ? C.red : C.cyan],
      ["SYSTEM", system, alerting ? C.red : C.cyan],
    ];
    const draw = (rows, x, align) => {
      rows.forEach(([label, value, rgb], i) => {
        const y = L.area.y + 16 * u + i * 66 * u;
        ctx.save();
        ctx.globalAlpha = ease((a - i * 0.15) * 3);
        ctx.textAlign = align;
        ctx.letterSpacing = `${2 * u}px`;
        ctx.font = `500 ${15 * u}px ${FONT_MONO}`;
        ctx.fillStyle = tone(C.blue, 0.85);
        ctx.fillText(label, x, y + 14 * u);
        ctx.font = `600 ${26 * u}px ${FONT_MONO}`;
        ctx.fillStyle = tone(rgb, 1);
        ctx.fillText(value, x, y + 46 * u);
        ctx.restore();
      });
    };
    draw(left, 36 * u, "left");
    draw(right, L.w - 36 * u, "right");
  }
}
