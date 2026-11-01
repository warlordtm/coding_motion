/* Cyber Threat Radar: entry point.
   Runs the simulation in a loop and handles the two clickable parts:
   the suspicious node (target lock) and the ISOLATE NODE button. */

(() => {
  const canvas = document.getElementById("radar");
  const hud = document.querySelector(".hud");
  const radar = new ThreatRadar(canvas, hud);

  window.addEventListener("resize", () => radar.resize());

  /* Pointer position in canvas CSS pixels. */
  function pointer(event) {
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  const inside = (p, r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;

  let clock = () => 0; // current simulation time in seconds (set below)

  canvas.addEventListener("pointerdown", (event) => {
    const p = pointer(event);
    const t = clock();
    const ev = radar.events;

    // ISOLATE NODE button: only usable once the status stage is armed.
    const armed = ev.status != null && t >= ev.status;
    const pending = ev.isolate == null || ev.isolate > t;
    if (armed && pending && inside(p, radar.buttonRect())) {
      isolateNode(radar, t);
      return;
    }

    // Clicking the red node locks onto it a little earlier than the schedule.
    const node = radar.nodePosition(THREAT_ID);
    const reach = 28 * node.u;
    const threatOn = ev.threat != null && t >= ev.threat;
    if (threatOn && (ev.lock == null || ev.lock > t) && Math.hypot(p.x - node.x, p.y - node.y) < reach) {
      ev.lock = t;
    }
  });

  // "?manual" hands the clock to the page that embeds the radar, which is
  // how the demo video is rendered frame by frame. Normal use never needs it.
  if (new URLSearchParams(location.search).has("manual")) {
    window.threatRadar = radar;
    return;
  }

  let loopStart = performance.now();
  clock = () => (performance.now() - loopStart) / 1000;

  function frame() {
    let t = clock();
    if (t > LOOP_SECONDS) {
      loopStart = performance.now();
      radar.reset();
      t = 0;
    }
    radar.render(t);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
