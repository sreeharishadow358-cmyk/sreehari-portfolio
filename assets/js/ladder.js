// Smart Ladder section: a contained 3D ladder-logic model.
// The START / STOP / E-STOP panel next to it energises the rungs.
import * as THREE from './three.min.js';
import { current, onGrade } from './theme.js';

{
  const canvas = document.getElementById('ladder');
  const stage = canvas.parentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  } catch (e) {
    stage.classList.add('no-3d');
    throw e;
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setClearColor(0x0a0f1a, 1);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0a0f1a, 0.018);
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 200);
  camera.position.set(0, 1, 24);

  /* ---------- palette ---------- */
  const C = {
    y: new THREE.Color(0x4de1ff), g: new THREE.Color(0x5cf2b0), r: new THREE.Color(0xff6b6b),
    a: new THREE.Color(0xffc061), dim: new THREE.Color(0x10233a), off: new THREE.Color(0x15171a),
  };

  function applyGrade(g) {
    renderer.setClearColor(g.light ? 0xf1f1f4 : g.bg2, 1); scene.fog.color.setHex(g.light ? 0xf1f1f4 : g.bg2);
    C.y.setHex(g.acc); C.dim.setHex(g.light ? 0xd9d2c0 : 0x1c1430); C.off.setHex(g.light ? 0xcfcfd6 : 0x15171a);
  }
  applyGrade(current()); onGrade(applyGrade);

  /* ---------- lights ---------- */
  scene.add(new THREE.AmbientLight(0xffffff, 0.35));
  const key = new THREE.DirectionalLight(0xffffff, 1.1); key.position.set(6, 10, 12); scene.add(key);
  const glow = new THREE.PointLight(0x4de1ff, 30, 26, 2); glow.position.set(6, 3, 4); scene.add(glow);

  /* ---------- ladder ---------- */
  const RUNGS = 9, GAP = 3.4, HALF = 5.2;
  const LEN = RUNGS * GAP + 6;
  const ladder = new THREE.Group();
  scene.add(ladder);

  const railMat = new THREE.MeshStandardMaterial({ color: 0x2d3238, emissive: C.y.clone(), emissiveIntensity: 0.35, metalness: .6, roughness: .35 });
  const railGeo = new THREE.BoxGeometry(0.16, LEN, 0.16);
  for (const x of [-HALF, HALF]) {
    const rail = new THREE.Mesh(railGeo, railMat);
    rail.position.set(x, -LEN / 2 + 3, 0);
    ladder.add(rail);
  }

  // label sprites drawn on canvas
  function label(text, color = '#4de1ff', size = 0.9) {
    const c = document.createElement('canvas'); c.width = 256; c.height = 64;
    const g = c.getContext('2d');
    g.font = '600 40px "JetBrains Mono", ui-monospace, monospace';
    g.fillStyle = color; g.textBaseline = 'middle'; g.fillText(text, 6, 34);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(size * 4, size), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, fog: true }));
    return m;
  }

  const rungs = [];
  const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  const plateGeo = box(0.09, 0.95, 0.42);
  const coilGeo = new THREE.TorusGeometry(0.5, 0.075, 10, 40);
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

  for (let i = 0; i < RUNGS; i++) {
    const y = -i * GAP;
    const mat = new THREE.MeshStandardMaterial({ color: 0x23272d, emissive: C.dim.clone(), emissiveIntensity: 1, metalness: .4, roughness: .4 });
    const coilMat = new THREE.MeshStandardMaterial({ color: 0x23272d, emissive: C.dim.clone(), emissiveIntensity: 1, metalness: .3, roughness: .3 });
    const grp = new THREE.Group(); grp.position.y = y; ladder.add(grp);

    // contacts: 1-3 along the rung, the rest wire
    const n = 1 + Math.floor(rnd() * 3);
    const xs = [];
    for (let k = 0; k < n; k++) xs.push(-HALF + 1.6 + k * 2.4 + rnd() * 0.4);
    const coilX = HALF - 1.4;
    let cursor = -HALF;
    xs.forEach((cx, k) => {
      const seg = cx - 0.32 - cursor;
      const w = new THREE.Mesh(box(seg, 0.08, 0.08), mat); w.position.x = cursor + seg / 2; grp.add(w);
      for (const dx of [-0.28, 0.28]) { const p = new THREE.Mesh(plateGeo, mat); p.position.x = cx + dx; grp.add(p); }
      if (rnd() > 0.5 && k > 0) { // normally-closed slash
        const s = new THREE.Mesh(box(0.08, 1.0, 0.08), mat); s.position.x = cx; s.rotation.z = -0.75; grp.add(s);
      }
      const lab = label((k === 0 ? 'X' : 'X') + (i * 3 + k).toString(8), '#4de1ff', 0.55);
      lab.position.set(cx + 0.95, 0.9, 0); grp.add(lab);
      cursor = cx + 0.32;
    });
    const seg = coilX - 0.58 - cursor;
    const w = new THREE.Mesh(box(seg, 0.08, 0.08), mat); w.position.x = cursor + seg / 2; grp.add(w);
    const coil = new THREE.Mesh(coilGeo, coilMat); coil.position.x = coilX; grp.add(coil);
    const tail = new THREE.Mesh(box(HALF - coilX - 0.58, 0.08, 0.08), mat); tail.position.x = (coilX + 0.58 + HALF) / 2; grp.add(tail);
    const yl = label('Y' + i.toString(8), '#9aa1aa', 0.55); yl.position.set(coilX + 1.25, 0.95, 0); grp.add(yl);
    const rl = label('RUNG ' + String(i).padStart(4, '0'), '#5b626c', 0.5); rl.position.set(-HALF - 3.1, 0.05, 0); grp.add(rl);

    // parallel seal-in branch on some rungs
    if (i % 3 === 0) {
      const bx0 = -HALF + 0.9, bx1 = xs[0] + 0.9, by = -1.15;
      for (const bx of [bx0, bx1]) { const v = new THREE.Mesh(box(0.08, 1.15, 0.08), mat); v.position.set(bx, by / 2, 0); grp.add(v); }
      const mid = (bx0 + bx1) / 2;
      const l1 = new THREE.Mesh(box(mid - 0.32 - bx0, 0.08, 0.08), mat); l1.position.set((bx0 + mid - 0.32) / 2, by, 0); grp.add(l1);
      const l2 = new THREE.Mesh(box(bx1 - mid - 0.32, 0.08, 0.08), mat); l2.position.set((mid + 0.32 + bx1) / 2, by, 0); grp.add(l2);
      for (const dx of [-0.28, 0.28]) { const p = new THREE.Mesh(plateGeo, mat); p.scale.y = .8; p.position.set(mid + dx, by, 0); grp.add(p); }
    }
    rungs.push({ y, mat, coilMat, coil, e: 0 });
  }

  /* ---------- power pulses ---------- */
  const isSmall = innerWidth < 760;
  const P = isSmall ? 70 : 140;
  const pPos = new Float32Array(P * 3), pData = [];
  for (let i = 0; i < P; i++) pData.push({ r: Math.floor(Math.random() * RUNGS), t: Math.random(), s: 0.25 + Math.random() * 0.35 });
  const pGeo = new THREE.BufferGeometry(); pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  const dotTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.3, 'rgba(255,255,255,.6)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c);
  })();
  const pMat = new THREE.PointsMaterial({ size: 0.55, map: dotTex, color: C.g, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  const pulses = new THREE.Points(pGeo, pMat); ladder.add(pulses);

  /* ---------- dust ---------- */
  const D = isSmall ? 120 : 260, dPos = new Float32Array(D * 3);
  for (let i = 0; i < D; i++) { dPos[i * 3] = (Math.random() - .5) * 70; dPos[i * 3 + 1] = 10 - Math.random() * (LEN + 20); dPos[i * 3 + 2] = (Math.random() - .5) * 40 - 6; }
  const dGeo = new THREE.BufferGeometry(); dGeo.setAttribute('position', new THREE.BufferAttribute(dPos, 3));
  const dust = new THREE.Points(dGeo, new THREE.PointsMaterial({ size: 0.12, map: dotTex, color: 0xffe9a8, transparent: true, opacity: .45, depthWrite: false, blending: THREE.AdditiveBlending }));
  scene.add(dust);

  /* ---------- back grid ---------- */
  const grid = new THREE.GridHelper(160, 80, 0x1c2025, 0x15181c);
  grid.rotation.x = Math.PI / 2; grid.position.set(0, -LEN / 2, -14); scene.add(grid);

  /* ---------- tower light ---------- */
  const tower = new THREE.Group();
  const lampGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.9, 32);
  const lamps = [C.r, C.a, C.g].map((col, k) => {
    const m = new THREE.MeshStandardMaterial({ color: col.clone().multiplyScalar(.25), emissive: col.clone(), emissiveIntensity: 0.05, transparent: true, opacity: .92, roughness: .2 });
    const mesh = new THREE.Mesh(lampGeo, m); mesh.position.y = 2.1 - k * 0.95; tower.add(mesh); return m;
  });
  const capMat = new THREE.MeshStandardMaterial({ color: 0x30353c, metalness: .7, roughness: .3 });
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.25, 32), capMat); cap.position.y = 2.68; tower.add(cap);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.7, 0.4, 32), capMat); base.position.y = -0.6; tower.add(base);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 3, 16), capMat); pole.position.y = -2.2; tower.add(pole);
  tower.position.set(HALF + 3.2, 2.2, 0.5);
  ladder.add(tower);

  /* ---------- state ---------- */
  let motor = false, estop = false, runSince = 0;
  addEventListener('plc', e => {
    if (e.detail.motor && !motor) runSince = performance.now();
    motor = e.detail.motor; estop = e.detail.estop;
  });

  /* ---------- layout ---------- */
  let baseX = 0, baseRotY = -0.68, scaleK = 1;
  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    scaleK = w < 520 ? .62 : w < 760 ? .78 : .92;
    baseX = w < 520 ? -1.4 : -1.6;
    ladder.scale.setScalar(scaleK);
  }
  new ResizeObserver(resize).observe(canvas); resize();

  let mx = 0, my = 0;
  stage.addEventListener('pointermove', e => { const r = stage.getBoundingClientRect(); mx = (e.clientX - r.left) / r.width - .5; my = (e.clientY - r.top) / r.height - .5; }, { passive: true });
  stage.addEventListener('pointerleave', () => { mx = 0; my = 0; });

  /* ---------- loop ---------- */
  const tmp = new THREE.Color();
  let camY = 2, last = performance.now(), running = false;
  const start = () => { if (running) return; running = true; last = performance.now(); requestAnimationFrame(tick); };
  new IntersectionObserver(([e]) => { if (e.isIntersecting && !document.hidden) start(); else running = false; }, { rootMargin: '100px' }).observe(stage);
  document.addEventListener('visibilitychange', () => { if (document.hidden) running = false; else if (stage.getBoundingClientRect().top < innerHeight) start(); });

  function tick(now) {
    if (!running) return;
    const dt = Math.min((now - last) / 1000, 0.05); last = now;
    const t = now / 1000;

    const rect = stage.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, (innerHeight - rect.top) / (innerHeight + rect.height)));

    // camera travels down the ladder with scroll
    const targetY = 2.2 - p * (RUNGS - 3.5) * GAP * scaleK;
    camY += (targetY - camY) * (reduce ? 1 : 0.08);
    camera.position.y = camY - my * 1.2;
    camera.position.x += ((mx * 3) - camera.position.x) * 0.06;
    camera.lookAt(0, camY - 1.5, 0);

    ladder.position.x = baseX;
    ladder.rotation.y = baseRotY + (p - .5) * 0.5 + (reduce ? 0 : Math.sin(t * .3) * 0.05);
    ladder.rotation.x = 0.06;

    // rung energy: wave down when running, local glow near the camera when idle
    const wave = motor ? (now - runSince) / 1000 * 9 : 0;
    const camLocal = (camY - 1.5) / scaleK;
    for (let i = 0; i < rungs.length; i++) {
      const R = rungs[i];
      let target;
      if (estop) target = 0;
      else if (motor) target = wave > i ? 1 : 0;
      else target = Math.max(0.12, 0.55 - Math.abs(R.y - camLocal) * 0.12);
      R.e += (target - R.e) * Math.min(1, dt * 6);
      if (motor) tmp.copy(C.dim).lerp(C.g, R.e); else if (estop) tmp.copy(C.off); else tmp.copy(C.off).lerp(C.y, R.e * .55);
      R.mat.emissive.copy(tmp); R.mat.emissiveIntensity = motor ? 0.4 + R.e * 0.9 : 0.6;
      R.coilMat.emissive.copy(motor ? C.off.clone().lerp(C.y, R.e) : tmp);
      R.coilMat.emissiveIntensity = motor ? 0.4 + R.e * 1.6 : 0.6;
      if (!reduce) R.coil.rotation.y = motor ? t * 2 * R.e : R.coil.rotation.y * 0.95;
    }

    // rails + glow
    const flash = estop ? (Math.sin(t * 12) > 0 ? 1 : 0.15) : 1;
    railMat.emissive.copy(estop ? C.r : motor ? C.g : C.y);
    railMat.emissiveIntensity = estop ? 0.6 * flash : motor ? 0.75 : 0.32;
    glow.color.copy(estop ? C.r : motor ? C.g : C.y);
    glow.intensity = estop ? 40 * flash : motor ? 55 : 22;
    glow.position.y = camY;

    // tower light
    lamps[0].emissiveIntensity = estop ? 3 * flash : 0.05;
    lamps[1].emissiveIntensity = !estop && !motor ? 2.2 : 0.05;
    lamps[2].emissiveIntensity = motor ? 2.6 : 0.05;

    // pulses
    pMat.opacity += ((motor ? 1 : 0) - pMat.opacity) * Math.min(1, dt * 4);
    if (pMat.opacity > 0.01 && !reduce) {
      for (let i = 0; i < P; i++) {
        const d = pData[i];
        d.t += dt * d.s;
        if (d.t > 1) { d.t = 0; d.r = Math.floor(Math.random() * RUNGS); }
        const on = rungs[d.r].e > 0.5;
        pPos[i * 3] = -HALF + d.t * HALF * 2;
        pPos[i * 3 + 1] = on ? rungs[d.r].y : 9999;
        pPos[i * 3 + 2] = 0.12;
      }
      pGeo.attributes.position.needsUpdate = true;
    }

    // dust drift
    if (!reduce) dust.rotation.y = t * 0.01;

    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }

  renderer.render(scene, camera);
}
