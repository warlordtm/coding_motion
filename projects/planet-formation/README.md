# A Planet Born From Particles

A particle planet assembled on a single `<canvas>` — thousands of drifting particles gather, orbit, settle into a sphere, gain a painted surface, glow, grow rings and spin. No libraries, no build step.

Part of **Coding Motion — by Godwin Bamisaye**.

## Run it
Open `zencode.html` in any modern browser. That's all.

## Files
| File | Purpose |
|---|---|
| `zencode.html` | Page with the full-screen canvas |
| `zencode.css` | Deep-space background and canvas layout |
| `planet-formation.js` | The whole simulation and renderer |

## How it works
Everything is a pure function of time, `render(t)`. Each stage switches on at a time stored in `EVENTS`:

1. **particles** – 7000 planet particles + a halo, each with a random start, a Fibonacci-sphere home, and its own delay/size/tint.
2. **flow** – particles drift in a swirling field.
3. **orbit** – they circle an axis, faster near the centre.
4. **sphere** – every particle eases to its home on a curved path.
5. **surface** – fractal noise is painted and lit per pixel.
6. **glow** – an atmosphere gradient wraps the planet.
7. **rings** – banded ring halves plus ring dust, tilted and drawn behind/in front.
8. **spin** – the planet rotates and the camera settles.

## Customize
- Stage timing: `EVENTS` at the top of `planet-formation.js`.
- Particle amount: `COUNT`, `HALO`, `RING_DUST`.
- Ring tilt: `TILT`. Colours: the `TINTS`, `stops`/`cols` arrays.
- Loop length: `LOOP_SECONDS`.

## GitHub
`coding_motion/projects/planet-formation/`
