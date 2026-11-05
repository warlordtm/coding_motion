# Black Hole Formation: Born From Gravity

A cinematic black hole assembled on a single `<canvas>`: a title whose "O" bends under gravity, a star field, a gravitational core, spiralling gas, a luminous accretion disk, gravitational lensing and a final cinematic reveal. Plain HTML, CSS and JavaScript. No libraries and no build step.

Part of **ZEN CODE**.

## Run it
Open `zencode.html` in any modern browser.

## Files
| File | Purpose |
|---|---|
| `zencode.html` | Page with the full-screen canvas |
| `zencode.css` | Deep-space page styling |
| `black-hole.js` | The whole animation |

## How it works
Every frame is a pure function of time, `render(t)`. Stage start times live in `EVENTS`:

1. **title** – `LET'S BUILD A BLACK HOLE.` is drawn to an offscreen canvas; the "O" is pixel-warped by an inverse lens mapping and becomes a tiny glowing horizon.
2. **stars** – 2,400 stars fade in at random moments.
3. **core** – the event horizon grows from nothing with a violet halo and expanding gravity ripples.
4. **spiral** – 8,000 gas particles fall inward on randomly tilted orbits (Keplerian speed, so the inner gas is faster).
5. **disk** – orbit planes settle into one disk; colour is a heat ramp from violet at the rim to white-hot inside, with a Doppler brightness bias.
6. **detail** – turbulent clumps, soft plasma sprites and drifting dust.
7. **lensing** – stars are remapped with the point-mass lens equation, and the far half of the disk is lifted over the horizon into the classic arch, with a faint underside image and a photon ring.
8. **final** – nebula, bloom, vignette and a slow camera push.

## Customize
- Stage timing: `EVENTS`.
- Size and look: `SHADOW`, `DISK_IN`, `DISK_OUT`, `TILT`.
- Density: `GAS`, `STARS`.
- Colours: the `HEAT` palette.
- Loop length: `LOOP_SECONDS`.

## GitHub
`zen_code/projects/black-hole/`
