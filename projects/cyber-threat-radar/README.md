# Cyber Threat Radar

A cinematic cybersecurity threat-radar animation, built with plain HTML, CSS and JavaScript (Canvas 2D). No frameworks, no build step, no dependencies.

> **This is a visual simulation.** It is not connected to any network and does not detect real attacks. Every node, link and alert is generated from the data in `js/config.js`.

## What it does

A circular radar scans a small simulated network:

1. Concentric rings, radial grid lines and angular tick marks draw in.
2. A glowing sweep beam starts rotating.
3. Network nodes appear as the beam passes over them.
4. Thin links connect selected nodes, with signal packets travelling along them.
5. One node turns red. A target-lock reticle closes in on it.
6. A callout line extends to a glass report panel:
   `THREAT DETECTED · Suspicious Network Activity · HIGH · SIMULATED NODE 07`
7. The **ISOLATE NODE** button arms. When pressed (or after a few seconds automatically) the node's links are cut and a containment ring closes around it.
8. The panel settles on the final status:
   `THREAT DETECTED · NETWORK NODE ISOLATED · SYSTEM STATUS: PROTECTED`

The simulation loops every 18 seconds.

## Run it locally

No install needed.

**Option 1:** open `zencode.html` in any modern browser.

**Option 2:** serve the folder, for example:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

### Interaction

- Click the red node to lock onto it a little earlier than scheduled.
- Click **ISOLATE NODE** once it lights up to isolate the node yourself.

## Project structure

```
cyber-threat-radar/
├── zencode.html      Page structure: HUD header + <canvas>
├── css/
│   └── zencode.css   Background, technical grid, HUD styling
└── js/
    ├── config.js     Palette, nodes, links, and the event timeline
    ├── utils.js      Easing, colour mixing, polar maths, seeded random
    ├── radar.js      Canvas renderer (ThreatRadar class + drawing functions)
    └── main.js       Animation loop and click handling
```

Scripts are plain classic `<script>` tags (not ES modules), so the page also works straight from `file://`.

## Implementation notes

- **Time-driven rendering.** `ThreatRadar.render(t)` draws the scene as a pure function of time `t` (seconds). There is no hidden animation state, which makes the scene easy to reason about, pause, scrub or record.
- **Event timeline.** `DEFAULT_EVENTS` in `config.js` lists when each stage starts (`rings`, `grid`, `sweep`, `nodes`, `links`, `threat`, `lock`, `panel`, `status`, `isolate`, `protect`). A stage set to `null` has not started. Change the numbers to re-time the whole animation.
- **Drawing functions.** Each visual element is one small function in `radar.js` (`drawRings`, `drawGrid`, `drawSweep`, `drawNode`, `drawLink`, `drawAlert`, `drawCallout`, ...), wrapped in `// #region` markers so editors can fold them.
- **Sweep.** The trailing glow uses a canvas conic gradient (`createConicGradient`). Nodes are revealed the first time the beam passes their bearing and light up again on every pass.
- **Glass panel.** Drawn on the canvas with a translucent gradient, a thin accent border and a soft shadow, so it animates in sync with the radar.
- **Responsive layout.** `computeLayout()` places the radar and panel for both tall (phone) and wide (desktop) screens. The CSS variables `--safe-top` and `--safe-bottom` reserve room for phone UI.
- **Sharp on any display.** The canvas is scaled by `devicePixelRatio`.
- **Deterministic details.** Dust particles use a seeded random generator, so every run looks identical.
- **External clock (optional).** Opening `zencode.html?manual` skips the animation loop and exposes the renderer as `window.threatRadar`, so another page can drive time frame by frame. Normal use never needs this.

## Customising

- Colours: `C` in `js/config.js`.
- Nodes and links: `NODE_DEFS` and `EDGES`. Change `THREAT_ID` to pick a different suspicious node (the panel text lives in `reportRows` in `radar.js`).
- Speed: `SWEEP_PERIOD` (seconds per revolution) and the numbers in `DEFAULT_EVENTS`.

## Browser support

A recent version of Chrome, Edge, Safari or Firefox (the renderer uses Canvas 2D, `createConicGradient` and `ctx.letterSpacing`). Fonts fall back to system fonts; Inter and JetBrains Mono are used automatically if installed.
