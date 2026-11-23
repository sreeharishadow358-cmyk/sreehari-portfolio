// Hero showreel. On load the arm picks Sree Hari's photo card and presents it next to the intro.
// Scrolling then drives five more picks: each card is carried, spun, placed on a lit stand and
// zoomed into while its story appears. Finished cards fly to a wall behind the robot.
import { THREE, COL, MAT, makeRenderer, makeStudio, makeRobot, makeFloor, shadowy, ss, V, lerpV } from './robot.js';
import { current, onGrade } from './theme.js';

{
  const section = document.getElementById('hero');
  const stage = section.querySelector('.show__stage');
  const canvas = document.getElementById('arm');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const chapEls = [...section.querySelectorAll('.chap')];
  const N = chapEls.length; // 6 cards; card 0 is the intro (photo)
  const hudN = document.getElementById('pickN'), hudS = document.getElementById('pickState'), hudBar = document.getElementById('pickBar');

  let renderer;
  try { renderer = makeRenderer(canvas); } catch (e) { section.classList.add('no-3d'); throw e; }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(COL.bg, 20, 42);
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
  let G = current();
  const studio = makeStudio(renderer, scene, G);
  const flo = makeFloor(scene);
  const R = makeRobot(); scene.add(R.robot);

  /* ---------- rack, stand, wall ---------- */
  const { dark, steel } = MAT;
  const accentMat = new THREE.MeshBasicMaterial({ color: COL.cyan });
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x0c1424, roughness: .9 });
  const CW = 2.4, CH = 1.5;
  const RACK = V(-3.5, 0.25, 2.3), RACK_STEP = 0.24;
  const STAND = V(2.0, 0.55, 3.1);
  const rackBase = shadowy(new THREE.Mesh(new THREE.BoxGeometry(CW + 0.5, 0.25, N * RACK_STEP + 0.5), dark));
  rackBase.position.set(RACK.x, 0.125, RACK.z - (N - 1) * RACK_STEP / 2); scene.add(rackBase);
  for (const dx of [-1, 1]) { const rail = shadowy(new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.6, N * RACK_STEP + 0.5), steel)); rail.position.set(RACK.x + dx * (CW / 2 + 0.2), 0.45, rackBase.position.z); scene.add(rail); }
  const stand = shadowy(new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.15, 0.55, 48), dark)); stand.position.set(STAND.x, 0.275, STAND.z); scene.add(stand);
  const standRing = new THREE.Mesh(new THREE.TorusGeometry(1.02, 0.03, 8, 64), accentMat); standRing.rotation.x = Math.PI / 2; standRing.position.set(STAND.x, 0.56, STAND.z); scene.add(standRing);
  const standLight = new THREE.SpotLight(0xffffff, 0, 14, 0.42, 0.5, 1.5); standLight.position.set(STAND.x + 1, 6, STAND.z + 3); standLight.target.position.set(STAND.x, 1.2, STAND.z); scene.add(standLight, standLight.target);
  const WALL = [[-3.3, 4.6], [0, 4.6], [3.3, 4.6], [-1.65, 2.75], [1.65, 2.75]].map(([x, y]) => V(x, y, -4.2));
  const wallPanel = new THREE.Mesh(new THREE.PlaneGeometry(13, 6.4), wallMat);
  wallPanel.position.set(0, 3.6, -4.35); wallPanel.receiveShadow = true; scene.add(wallPanel);
  const wallGlow = new THREE.Mesh(new THREE.PlaneGeometry(13, 0.04), accentMat); wallGlow.position.set(0, 6.78, -4.33); scene.add(wallGlow);

  /* ---------- cards ---------- */
  const DATA = chapEls.map(el => ({ tag: el.dataset.tag, title: el.dataset.title, img: el.dataset.img || '', vid: el.dataset.vid || '', draw: el.dataset.draw || '' }));
  const cards = DATA.map(d => {
    const c = document.createElement('canvas'); c.width = 1280; c.height = 800;
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 16; tex.generateMipmaps = false; tex.minFilter = THREE.LinearFilter;
    const g = new THREE.Group();
    g.add(shadowy(new THREE.Mesh(new THREE.BoxGeometry(CW + 0.12, CH + 0.12, 0.07), dark)));
    const face = new THREE.Mesh(new THREE.PlaneGeometry(CW, CH), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
    face.position.z = 0.04; g.add(face);
    const edge = new THREE.Mesh(new THREE.BoxGeometry(CW + 0.14, 0.04, 0.08), accentMat); edge.position.y = CH / 2 + 0.06; g.add(edge);
    scene.add(g);
    const card = { g, c, tex, d, src: null, video: null };
    if (d.img) { const im = new Image(); im.onload = () => { card.src = im; paint(card); }; im.onerror = () => paint(card); im.src = d.img; }
    if (d.vid) { const v = document.createElement('video'); v.src = d.vid; v.muted = true; v.loop = true; v.playsInline = true; v.preload = 'auto'; card.video = v; v.addEventListener('loadeddata', () => paint(card)); }
    return card;
  });

  function cover(g, src, w, h, focusY = .5) {
    const sw = src.videoWidth || src.naturalWidth || src.width, sh = src.videoHeight || src.naturalHeight || src.height;
    if (!sw || !sh) return;
    const s = Math.max(w / sw, h / sh), dw = sw * s, dh = sh * s;
    g.drawImage(src, (w - dw) / 2, (h - dh) * focusY, dw, dh);
  }
  function paint(card) {
    const { c, d } = card, g = c.getContext('2d'), W = c.width, H = c.height;
    const P = G.css; g.fillStyle = P.card; g.fillRect(0, 0, W, H);
    const src = (card.video && card.video.readyState >= 2) ? card.video : card.src;
    if (src) {
      if (d.draw === 'me') { const rg = g.createRadialGradient(W * .55, H * .35, 20, W * .55, H * .35, W * .7); rg.addColorStop(0, P.acc + '66'); rg.addColorStop(1, P.card); g.fillStyle = rg; g.fillRect(0, 0, W, H);
        g.strokeStyle = P.acc + '22'; g.lineWidth = 1; for (let x = 0; x < W; x += 32) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); } for (let y = 0; y < H; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); } }
      g.filter = card.video ? 'contrast(1.12) saturate(1.15) brightness(1.04)' : 'none';
      cover(g, src, W, H, d.draw === 'me' ? .22 : .5);
      g.filter = 'none';
      g.fillStyle = P.acc; g.globalAlpha = card.video ? .05 : .16; g.globalCompositeOperation = 'soft-light'; g.fillRect(0, 0, W, H); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; // colour grade
    }
    else { g.save(); g.scale(W / 1024, H / 640); if (d.draw === 'flow') drawFlow(g, 1024, 640); else if (d.draw === 'impact') drawImpact(g, 1024, 640); else if (d.draw === 'me') drawMonogram(g, 1024, 640); g.restore(); }
    const gr = g.createLinearGradient(0, H * (card.video ? .62 : .45), 0, H); gr.addColorStop(0, P.bg + '00'); gr.addColorStop(1, P.bg + 'f0');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.font = '600 30px "JetBrains Mono", ui-monospace, monospace';
    const tw = g.measureText(d.tag).width;
    g.fillStyle = P.acc; g.beginPath(); g.roundRect(44, 42, tw + 34, 54, 27); g.fill();
    g.fillStyle = P.accInk; g.textBaseline = 'middle'; g.fillText(d.tag, 61, 70);
    g.font = '700 104px Sora, system-ui, sans-serif'; g.fillStyle = P.text; g.textBaseline = 'alphabetic';
    g.fillText(d.title, 50, H - 62);
    card.tex.needsUpdate = true;
  }
  function drawMonogram(g, W, H) {
    const gr = g.createRadialGradient(W * .7, H * .3, 20, W * .7, H * .3, W * .8); gr.addColorStop(0, G.css.acc + '55'); gr.addColorStop(1, G.css.card);
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    const lg = g.createLinearGradient(0, 0, W, 0); lg.addColorStop(0, G.css.acc); lg.addColorStop(1, G.css.acc2);
    g.font = '800 250px Sora, sans-serif'; g.fillStyle = lg; g.textBaseline = 'middle'; g.fillText('SREE', W * .1, H * .42);
  }
  function drawFlow(g, W, H) {
    g.fillStyle = G.css.card; g.fillRect(0, 0, W, H);
    g.fillStyle = G.light ? 'rgba(0,0,0,.08)' : 'rgba(255,255,255,.06)'; for (let x = 16; x < W; x += 32) for (let y = 16; y < H; y += 32) g.fillRect(x, y, 2, 2);
    const A1 = G.css.acc, A2 = G.css.acc2;
    const nodes = [['Sensor', 120, 180, '#5cf2b0'], ['Webhook', 360, 130, A1], ['AI agent', 600, 200, A2], ['Sheet', 840, 120, A1], ['Alert', 840, 300, '#ff6b6b']];
    g.lineWidth = 5; g.strokeStyle = A1;
    [[0, 1], [1, 2], [2, 3], [2, 4]].forEach(([a, b]) => { const A = nodes[a], B = nodes[b]; g.beginPath(); g.moveTo(A[1] + 70, A[2]); g.bezierCurveTo(A[1] + 160, A[2], B[1] - 160, B[2], B[1] - 70, B[2]); g.stroke(); });
    g.font = '600 24px "JetBrains Mono", monospace'; g.textBaseline = 'middle';
    nodes.forEach(([t, x, y, col]) => {
      g.fillStyle = G.light ? '#ffffff' : '#00000055'; g.strokeStyle = col; g.lineWidth = 3;
      g.beginPath(); g.roundRect(x - 70, y - 36, 140, 72, 14); g.fill(); g.stroke();
      g.fillStyle = G.css.text; const tw = g.measureText(t).width; g.fillText(t, x - tw / 2, y);
    });
  }
  function drawImpact(g, W, H) {
    const gr = g.createLinearGradient(0, 0, W, H); gr.addColorStop(0, G.css.acc + '40'); gr.addColorStop(1, G.css.card); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    for (let r = 0; r < 6; r++) for (let k = 0; k < 16; k++) {
      const x = 70 + k * 60, y = 90 + r * 62, lit = (k * 7 + r * 3) % 5 === 0;
      g.fillStyle = lit ? (k % 2 ? G.css.acc : G.css.acc2) : (G.light ? 'rgba(0,0,0,.1)' : 'rgba(255,255,255,.1)');
      g.beginPath(); g.arc(x, y - 12, 10, 0, Math.PI * 2); g.fill(); g.beginPath(); g.roundRect(x - 14, y + 2, 28, 22, 10); g.fill();
    }
  }
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => cards.forEach(paint));

  function applyGrade(g) {
    G = g; studio.grade(g); flo.grade(g); R.grade(g);
    accentMat.color.setHex(g.acc); wallMat.color.setHex(g.light ? 0xd8d8de : g.bg2);

    cards.forEach(paint);
  }
  applyGrade(G); onGrade(applyGrade);

  /* ---------- layout ---------- */
  let narrow = false;
  function resize() {
    const W = canvas.clientWidth, H = canvas.clientHeight; if (!W || !H) return;
    renderer.setSize(W, H, false);
    narrow = W < 900;
    camera.aspect = W / H; camera.fov = narrow ? 44 : 34; camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(canvas); resize();

  let px = 0, py = 0;
  addEventListener('pointermove', e => { px = e.clientX / innerWidth - .5; py = e.clientY / innerHeight - .5; }, { passive: true });

  /* ---------- choreography ---------- */
  const rackTop = i => V(RACK.x, RACK.y + CH + 0.02, RACK.z - i * RACK_STEP);
  const standTop = V(STAND.x, STAND.y + CH + 0.02, STAND.z);
  const HOME = V(-1.8, 5.0, -2.0);
  const INTRO_END = 0.03;

  function armPath(i, u) {
    const P = rackTop(i), A1 = P.clone().add(V(0, 1.1, 0)), L = V(P.x + 0.4, 4.0, P.z);
    const B1 = standTop.clone().add(V(0, 1.1, 0)), B = standTop;
    if (u < .12) return lerpV(HOME, A1, ss(0, .12, u));
    if (u < .20) return lerpV(A1, P, ss(.12, .20, u));
    if (u < .26) return P.clone();
    if (u < .34) return lerpV(P, L, ss(.26, .34, u));
    if (u < .50) { const t = ss(.34, .50, u); const q = lerpV(L, B1, t); q.y += Math.sin(t * Math.PI) * 0.6; return q; }
    if (u < .57) return lerpV(B1, B, ss(.50, .57, u));
    if (u < .62) return B.clone();
    return lerpV(B, HOME, ss(.62, .74, u));
  }
  const gripAt = u => (u >= .20 && u < .60) ? Math.min(1, (u - .20) / .04) * (u < .57 ? 1 : 1 - (u - .57) / .03) : 0;
  const phaseName = u => u < .12 ? 'APPROACH' : u < .26 ? 'GRIPPING' : u < .50 ? 'TRANSFER' : u < .62 ? 'PLACING' : u < .74 ? 'RETRACT' : 'PRESENTING';
  const onRack = i => ({ p: V(RACK.x, RACK.y + CH / 2, RACK.z - i * RACK_STEP), yaw: 0, s: 1 });
  const onStand = () => ({ p: V(STAND.x, STAND.y + CH / 2, STAND.z), yaw: 0, s: 1 });
  const onWall = k => ({ p: WALL[k].clone(), yaw: 0, s: .78 });

  /* ---------- loop ---------- */
  const gp = new THREE.Vector3();
  const camPos = V(9, 8, 16), camLook = V(-3, 2, 0.4), wantPos = new THREE.Vector3(), wantLook = new THREE.Vector3();
  let pS = 0, running = false, last = performance.now(), activeVideo = null, lastChap = -2, introStart = null;

  const start = () => { if (running) return; running = true; last = performance.now(); requestAnimationFrame(tick); };
  new IntersectionObserver(([e]) => { if (e.isIntersecting && !document.hidden) start(); else running = false; }).observe(section);
  document.addEventListener('visibilitychange', () => { if (document.hidden) running = false; else if (section.getBoundingClientRect().bottom > 0) start(); });
  const progress = () => Math.min(1, Math.max(0, -section.getBoundingClientRect().top / Math.max(1, section.offsetHeight - innerHeight)));

  function tick(now) {
    if (!running) return;
    const dt = Math.min((now - last) / 1000, 0.05); last = now;
    const t = now / 1000;
    if (introStart === null && document.body.classList.contains('ready')) introStart = now + 250;
    const pRaw = progress();
    pS += (pRaw - pS) * Math.min(1, dt * 7); if (Math.abs(pRaw - pS) > 0.2 || reduce) pS = pRaw;
    const p = pS;

    // chapter 0 plays on a clock (the intro); chapters 1..5 follow the scroll
    let ci, u;
    if (p < INTRO_END) { ci = 0; u = reduce ? 1 : introStart === null ? 0 : Math.min(1, Math.max(0, (now - introStart) / 5200)); }
    else { const x = (p - INTRO_END) / (1 - INTRO_END) * (N - 1); const k = Math.min(N - 2, Math.floor(x)); ci = 1 + k; u = Math.min(1, x - k); }

    R.pose(armPath(ci, u), u > .2 && u < .6 ? -ss(.30, .52, u) * Math.PI * 2 : 0, gripAt(u));
    const spin = ss(.30, .52, u) * Math.PI * 2;
    R.robot.updateMatrixWorld(true);
    R.gripPt.getWorldPosition(gp);

    cards.forEach((c, i) => {
      let st;
      if (ci < i || (ci === i && u < .23)) st = onRack(i);
      else if (ci === i && u < .59) st = { p: gp.clone().add(V(0, -CH / 2 + 0.12, 0)), yaw: spin, s: 1 };
      else if (ci === i || (ci === i + 1 && u < .04)) st = onStand();
      else if (ci === i + 1 && u < .34) {
        const k = ss(.04, .34, u), a = onStand(), b = onWall(i);
        const pp = lerpV(a.p, b.p, k); pp.y += Math.sin(k * Math.PI) * 1.4;
        st = { p: pp, yaw: Math.sin(k * Math.PI) * 0.5, s: 1 + (b.s - 1) * k };
      } else st = onWall(Math.min(i, WALL.length - 1));
      c.g.position.copy(st.p); c.g.rotation.set(0, st.yaw, 0); c.g.scale.setScalar(st.s);
    });

    const presenting = u > .6;
    standLight.intensity += ((presenting ? 130 : 0) - standLight.intensity) * Math.min(1, dt * 4);
    const vc = presenting ? cards[ci] : null;
    if (activeVideo && (!vc || vc.video !== activeVideo)) { activeVideo.pause(); activeVideo = null; }
    if (vc && vc.video) { if (activeVideo !== vc.video) { activeVideo = vc.video; activeVideo.play().catch(() => {}); } if (vc.video.readyState >= 2) paint(vc); }

    // camera
    const ang = 0.55 + (reduce ? 0 : Math.sin(t * .12) * .04) + px * 0.04;
    const wd = narrow ? 23 : 19.5;
    const wide = { pos: V(Math.sin(ang) * wd, 8.2 - py * .4, Math.cos(ang) * wd), look: V(narrow ? -0.4 : -2.2, narrow ? 0.6 : 1.9, 0.4) };
    if (!narrow && ci === 0) wide.look.x = -3.6;
    const cardC = V(STAND.x, STAND.y + CH / 2, STAND.z);
    const close = narrow
      ? { pos: cardC.clone().add(V(0, 0.9, 8.6)), look: cardC.clone().add(V(0, -1.8, 0)) }
      : { pos: cardC.clone().add(V(-1.2 + px * .5, 0.5 - py * .3, 6.9)), look: cardC.clone().add(V(-2.05, 0.1, 0)) };
    let z = ss(.62, .82, u);
    if (ci > 0 && u < .12) z = Math.max(z, 1 - ss(0, .12, u));
    wantPos.copy(wide.pos).lerp(close.pos, z); wantLook.copy(wide.look).lerp(close.look, z);
    camPos.lerp(wantPos, Math.min(1, dt * 8)); camLook.lerp(wantLook, Math.min(1, dt * 8));
    camera.position.copy(camPos); camera.lookAt(camLook);

    // overlays (chapter 0 is the hero intro, not a caption)
    const showChap = ci === 0 ? -1 : (u > .66 ? ci : (u < .06 && ci > 1 ? ci - 1 : -1));
    if (showChap !== lastChap) { chapEls.forEach((el, k) => el.classList.toggle('on', k === showChap)); lastChap = showChap; }
    section.classList.toggle('intro', ci === 0);
    hudN.textContent = String(ci + 1).padStart(2, '0');
    hudS.textContent = ci === 0 && u >= 1 ? 'PRESENTING · SCROLL ↓' : phaseName(u);
    hudBar.style.transform = `scaleX(${((ci + u) / N).toFixed(4)})`;

    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }
  start();
}
