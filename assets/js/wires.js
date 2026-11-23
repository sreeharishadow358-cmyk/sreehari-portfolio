// "Wiring" section: a bundle of glossy cables with glowing tips hangs into frame (A),
// bursts into an arc of fibres as you scroll, then re-wires itself into an iris ring (B)
// whose quadrants are labelled AI · Web · Automation · Hardware.
import { THREE, makeRenderer, makeStudio, ss } from './robot.js';
import { current, onGrade } from './theme.js';

{
  const section = document.getElementById('wires');
  const canvas = document.getElementById('wiresCanvas');
  if (!section || !canvas) throw new Error('no wires section');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  let renderer;
  try { renderer = makeRenderer(canvas); } catch (e) { section.classList.add('no-3d'); throw e; }
  renderer.shadowMap.enabled = false;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  let G = current();
  const studio = makeStudio(renderer, scene, G);

  /* ---------- strands ---------- */
  const small = innerWidth < 760;
  const NS = small ? 90 : 170, SEG = 10, NP = SEG + 1;
  const segGeo = new THREE.CylinderGeometry(1, 1, 1, 7, 1, true);
  const cableMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.55, roughness: 0.28 });
  const cables = new THREE.InstancedMesh(segGeo, cableMat, NS * SEG);
  cables.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  scene.add(cables);
  const tipMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const tips = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 12, 10), tipMat, NS);
  tips.instanceMatrix.setUsage(THREE.DynamicDrawUsage); scene.add(tips);
  // soft bloom sprites at the tips
  const glowPos = new Float32Array(NS * 3);
  const glowGeo = new THREE.BufferGeometry(); glowGeo.setAttribute('position', new THREE.BufferAttribute(glowPos, 3));
  const dotTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.25, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
  const glowMat = new THREE.PointsMaterial({ size: 0.9, map: dotTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xffffff });
  scene.add(new THREE.Points(glowGeo, glowMat));

  let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const S = Array.from({ length: NS }, (_, i) => ({
    th: rnd() * Math.PI * 2, rr: Math.sqrt(rnd()) * 0.75, tipY: 0.2 + rnd() * 1.6, w: 0.028 + rnd() * 0.03,
    phiB: Math.PI * (0.06 + 0.88 * (i / NS)) + (rnd() - .5) * 0.08, rB: 3.0 + rnd() * 0.9, tilt: (rnd() - .5) * 0.5, zB: (rnd() - .5) * 1.2,
    phiC: (i / NS) * Math.PI * 2 + (rnd() - .5) * 0.03, rOut: 2.55 + rnd() * 0.55, rIn: 1.05 + rnd() * 0.18, zC: (rnd() - .5) * 0.5,
    d: rnd(), ph: rnd() * 6.28,
  }));

  const CEN = new THREE.Vector3(0, 2.4, 0);
  const pA = (st, s, t) => {
    const twist = st.th + s * 1.7 + Math.sin(t * .6 + st.ph) * 0.05;
    const flare = 1 + Math.pow(s, 3) * 2.2;
    const cx = 2.3 - s * 1.0 + Math.sin(t * .5 + s * 2) * 0.12 * s;
    return [cx + st.rr * flare * Math.cos(twist), 7.5 - s * (7.5 - st.tipY), st.rr * flare * Math.sin(twist)];
  };
  const pB = (st, s) => {
    const dx = Math.cos(st.phiB), dy = Math.sin(st.phiB), r = st.rB + 0.7 - s * 1.4;
    return [CEN.x + dx * r + st.tilt * (1 - s) * -dy, CEN.y - 0.6 + dy * r + st.tilt * (1 - s) * dx, st.zB * (1 - s * .5)];
  };
  const pC = (st, s, spin) => {
    const a = st.phiC + spin, r = st.rOut - s * (st.rOut - st.rIn);
    return [CEN.x + Math.cos(a) * r, CEN.y + Math.sin(a) * r, st.zC * (1 - s) + Math.sin(a * 3 + s) * 0.05];
  };

  // per-segment colour: dark cable that warms toward the glowing tip
  const colA = new THREE.Color(), colB = new THREE.Color(), tmpC = new THREE.Color();
  function recolour() {
    colA.setHex(G.light ? 0x2a1d12 : 0x15121f); colB.setHex(G.acc);
    for (let i = 0; i < NS; i++) for (let j = 0; j < SEG; j++) {
      const s = (j + .5) / SEG; tmpC.copy(colA).lerp(colB, Math.pow(s, 5) * .9 + (G.light ? .05 : .08));
      cables.setColorAt(i * SEG + j, tmpC);
    }
    cables.instanceColor.needsUpdate = true;
    tipMat.color.setHex(G.light ? 0xffd27a : 0xffffff).lerp(new THREE.Color(G.acc), .45);
    glowMat.color.setHex(G.acc); glowMat.opacity = G.light ? .75 : 1;
  }
  function applyGrade(g) { G = g; studio.grade(g); recolour(); }
  applyGrade(G); onGrade(applyGrade);

  /* ---------- layout ---------- */
  let narrow = false;
  function resize() {
    const W = canvas.clientWidth, H = canvas.clientHeight; if (!W || !H) return;
    renderer.setSize(W, H, false); narrow = W < 900;
    camera.aspect = W / H; camera.fov = narrow ? 52 : 40; camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(canvas); resize();
  let mx = 0, my = 0;
  addEventListener('pointermove', e => { mx = e.clientX / innerWidth - .5; my = e.clientY / innerHeight - .5; }, { passive: true });

  /* ---------- loop ---------- */
  const P = Array.from({ length: NP }, () => new THREE.Vector3());
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), dir = new THREE.Vector3(), mid = new THREE.Vector3(), sc = new THREE.Vector3();
  const stageA = section.querySelector('.wires__a'), stageB = section.querySelector('.wires__b'), tags = section.querySelector('.wires__tags');
  let pS = 0, running = false, last = performance.now();
  const start = () => { if (running) return; running = true; last = performance.now(); requestAnimationFrame(tick); };
  new IntersectionObserver(([e]) => { if (e.isIntersecting && !document.hidden) start(); else running = false; }).observe(section);
  document.addEventListener('visibilitychange', () => { if (document.hidden) running = false; else { const r = section.getBoundingClientRect(); if (r.top < innerHeight && r.bottom > 0) start(); } });
  const progress = () => Math.min(1, Math.max(0, -section.getBoundingClientRect().top / Math.max(1, section.offsetHeight - innerHeight)));

  function tick(now) {
    if (!running) return;
    const dt = Math.min((now - last) / 1000, 0.05); last = now;
    const t = reduce ? 0 : now / 1000;
    const pr = progress(); pS += (pr - pS) * Math.min(1, dt * 6); if (Math.abs(pr - pS) > .25 || reduce) pS = pr;
    const p = pS;
    const spin = t * 0.08 + p * 1.2;

    for (let i = 0; i < NS; i++) {
      const st = S[i];
      const kAB = ss(.12 + st.d * .14, .42 + st.d * .14, p);
      const kBC = ss(.5 + st.d * .12, .76 + st.d * .12, p);
      for (let j = 0; j < NP; j++) {
        const s = j / SEG;
        const a = pA(st, s, t), b = pB(st, s), c = pC(st, s, spin);
        const x = a[0] + (b[0] - a[0]) * kAB, y = a[1] + (b[1] - a[1]) * kAB, z = a[2] + (b[2] - a[2]) * kAB;
        P[j].set(x + (c[0] - x) * kBC, y + (c[1] - y) * kBC, z + (c[2] - z) * kBC);
      }
      // in the scattered phase the fibres are short: shrink toward the tip end
      const shrink = 1 - Math.sin(kAB * Math.PI) * 0.0;
      for (let j = 0; j < SEG; j++) {
        dir.subVectors(P[j + 1], P[j]); const L = dir.length() * shrink;
        mid.addVectors(P[j], P[j + 1]).multiplyScalar(.5);
        q.setFromUnitVectors(up, dir.normalize());
        const w = st.w * (1 - j / SEG * 0.25);
        m4.compose(mid, q, sc.set(w, L + 0.002, w));
        cables.setMatrixAt(i * SEG + j, m4);
      }
      const tip = P[SEG], tw = st.w * 1.7;
      m4.compose(tip, q.identity(), sc.set(tw, tw, tw)); tips.setMatrixAt(i, m4);
      glowPos[i * 3] = tip.x; glowPos[i * 3 + 1] = tip.y; glowPos[i * 3 + 2] = tip.z;
    }
    cables.instanceMatrix.needsUpdate = true; tips.instanceMatrix.needsUpdate = true; glowGeo.attributes.position.needsUpdate = true;

    // camera
    const kB = ss(.55, .85, p);
    const look = new THREE.Vector3(narrow ? 0 : -1.2 * (1 - kB) - 2.3 * kB, narrow ? 2.0 - 1.2 * kB : 2.4, 0);
    const dist = (narrow ? 13 : 11) + kB * (narrow ? 4 : 3.2);
    camera.position.set(look.x + mx * 1.2, look.y + 0.2 - my * 0.8, dist);
    camera.lookAt(look);

    // pin the quadrant labels to the ring on screen
    camera.updateMatrixWorld();
    const c0 = CEN.clone().project(camera), c1 = CEN.clone().add(new THREE.Vector3(3.35, 0, 0)).project(camera);
    const W = canvas.clientWidth, H = canvas.clientHeight;
    tags.style.setProperty('--cx', ((c0.x + 1) / 2 * W).toFixed(1) + 'px');
    tags.style.setProperty('--cy', ((1 - c0.y) / 2 * H).toFixed(1) + 'px');
    tags.style.setProperty('--r', (Math.abs(c1.x - c0.x) / 2 * W).toFixed(1) + 'px');
    stageA.classList.toggle('on', p < .3);
    stageB.classList.toggle('on', p > .72);
    tags.classList.toggle('on', p > .78);

    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }
}
