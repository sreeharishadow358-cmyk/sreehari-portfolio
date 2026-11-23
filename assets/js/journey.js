// Journey world: a side-scrolling 3D path through Sree Hari's milestones.
// Scrolling glides the camera sideways from station to station. Behind the path, his drawn
// portrait hovers as a hologram and "watches": a light beam follows him to the active milestone.
import { THREE, makeRenderer, makeStudio, shadowy, ss, V } from './robot.js';
import { current, onGrade } from './theme.js';

{
  const section = document.getElementById('world');
  const canvas = document.getElementById('worldCanvas');
  if (!section || !canvas) throw new Error('no world');
  const items = [...document.querySelectorAll('#journey .tl__i')];
  const M = items.map(li => ({
    time: li.querySelector('time')?.textContent || '', title: li.querySelector('h3')?.textContent || '',
    text: li.querySelector('p')?.textContent || '', img: li.querySelector('img')?.getAttribute('src') || '', draw: li.dataset.draw || '',
  }));
  const N = M.length;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const elN = document.getElementById('wN'), elT = document.getElementById('wT'), elH = document.getElementById('wH'), elP = document.getElementById('wP');
  const card = section.querySelector('.world__card'), dots = [...section.querySelectorAll('.world__rail li')], bar = document.getElementById('wBar');

  let renderer;
  try { renderer = makeRenderer(canvas); } catch (e) { section.classList.add('no-3d'); throw e; }
  const scene = new THREE.Scene(); scene.fog = new THREE.Fog(0x07050d, 16, 48);
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 140);
  let G = current();
  const studio = makeStudio(renderer, scene, G);
  studio.key.position.set(0, 14, 10);

  const SP = 7.5, LEN = (N - 1) * SP;
  const acc = new THREE.MeshBasicMaterial({ color: G.acc });
  const darkMat = new THREE.MeshStandardMaterial({ color: G.dark, metalness: .6, roughness: .35 });

  /* ---------- ground + path ---------- */
  const floorMat = new THREE.MeshStandardMaterial({ color: G.floor, roughness: .85, metalness: .1 });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(LEN + 80, 60), floorMat); floor.rotation.x = -Math.PI / 2; floor.position.x = LEN / 2; floor.receiveShadow = true; scene.add(floor);
  let grid = null;
  const path = new THREE.Mesh(new THREE.BoxGeometry(LEN + 30, 0.02, 0.09), acc); path.position.set(LEN / 2, 0.012, 2.2); scene.add(path);
  const path2 = path.clone(); path2.scale.set(1, 1, .5); path2.position.z = 2.55; scene.add(path2);
  // travelling pulses on the path
  const PN = 40, pPos = new Float32Array(PN * 3), pOff = Array.from({ length: PN }, () => Math.random());
  const pGeo = new THREE.BufferGeometry(); pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  const dot = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, '#fff'); gr.addColorStop(.3, 'rgba(255,255,255,.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
  const pMat = new THREE.PointsMaterial({ size: .45, map: dot, color: G.acc, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  scene.add(new THREE.Points(pGeo, pMat));

  /* ---------- background ridges (parallax) ---------- */
  const ridgeMats = [];
  function ridge(z, h, seedK, op) {
    const s = new THREE.Shape(); const W = LEN + 120; s.moveTo(-60, 0);
    let x = -60, r = seedK; while (x < W) { r = (r * 9301 + 49297) % 233280; x += 2 + (r / 233280) * 4; s.lineTo(x, h * (.35 + (r / 233280) * .65)); }
    s.lineTo(W, 0); s.lineTo(-60, 0);
    const m = new THREE.MeshBasicMaterial({ color: 0x1a1030, transparent: true, opacity: op, fog: true }); ridgeMats.push(m);
    const mesh = new THREE.Mesh(new THREE.ShapeGeometry(s), m); mesh.position.z = z; scene.add(mesh); return mesh;
  }
  const ridgeFar = ridge(-34, 9, 7, .9), ridgeNear = ridge(-22, 5, 3, .95);

  /* ---------- hologram portrait ---------- */
  const holoTex = new THREE.TextureLoader().load('assets/img/me-drawn.png'); holoTex.colorSpace = THREE.SRGBColorSpace;
  const holoMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { map: { value: holoTex }, uT: { value: 0 }, uA: { value: new THREE.Color(G.acc) }, uB: { value: new THREE.Color(G.acc2) }, uO: { value: .9 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `uniform sampler2D map; uniform float uT; uniform vec3 uA; uniform vec3 uB; uniform float uO; varying vec2 vUv;
      void main(){
        vec2 uv=vUv; uv.x+=sin(uv.y*40.+uT*3.)*.0012;
        vec4 c=texture2D(map,uv);
        float l=dot(c.rgb,vec3(.3,.59,.11));
        vec3 tint=mix(uA*.25,mix(uA,vec3(1.),.35),l*1.2);
        tint=mix(tint,c.rgb,.45);
        float scan=.86+.14*sin(vUv.y*900.-uT*6.);
        float band=smoothstep(.0,.04,abs(fract(vUv.y*1.5-uT*.12)-.5));
        float edge=smoothstep(0.,.12,vUv.y)*smoothstep(1.,.85,vUv.y);
        vec3 col=(tint*1.35)*scan+uB*(1.-band)*.3;
        gl_FragColor=vec4(col,c.a*uO*edge*(.9+.1*sin(uT*17.)));
      }`,
  });
  const HH = 11.5, holo = new THREE.Mesh(new THREE.PlaneGeometry(HH * 720 / 1020, HH), holoMat);
  holo.position.set(0, HH / 2 - 1.3, -12); scene.add(holo);
  const holoBase = new THREE.Mesh(new THREE.RingGeometry(3.2, 3.35, 80), acc); holoBase.rotation.x = -Math.PI / 2; scene.add(holoBase);
  // gaze beam: from the hologram's eyes to the active milestone
  const beamMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { uC: { value: new THREE.Color(G.acc) }, uO: { value: .0 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `uniform vec3 uC; uniform float uO; varying vec2 vUv; void main(){ float a=(1.-vUv.y)*.9+.1; gl_FragColor=vec4(uC, a*uO); }`,
  });
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 1.5, 1, 32, 1, true), beamMat); scene.add(beam);

  /* ---------- stations ---------- */
  const hex = n => '#' + n.toString(16).padStart(6, '0');
  const T0 = performance.now();
  const ILLO = {
    // e-Yantra: a stationary robot arm at a Mars base, moving a crate
    mars(g, W, H, P) {
      const t = (performance.now() - T0) / 1000;
      const sky = g.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#050210'); sky.addColorStop(.62, P.acc2 + '66'); sky.addColorStop(1, '#2a0d22'); g.fillStyle = sky; g.fillRect(0, 0, W, H);
      for (let i = 0; i < 90; i++) { const x = (i * 97) % W, y = (i * 53) % (H * .5); g.fillStyle = `rgba(255,255,255,${.2 + (i % 5) * .12})`; g.fillRect(x, y, 2, 2); }
      const pl = g.createRadialGradient(820, 140, 10, 820, 140, 90); pl.addColorStop(0, '#ffb38a'); pl.addColorStop(1, '#7a2a3a'); g.fillStyle = pl; g.beginPath(); g.arc(820, 140, 80, 0, 7); g.fill();
      g.fillStyle = '#3a1226'; g.beginPath(); g.moveTo(0, H * .7); for (let x = 0; x <= W; x += 40) g.lineTo(x, H * .66 + Math.sin(x * .013) * 22 + Math.sin(x * .05) * 6); g.lineTo(W, H); g.lineTo(0, H); g.fill();
      g.fillStyle = '#5a1d33'; g.beginPath(); g.moveTo(0, H * .8); for (let x = 0; x <= W; x += 30) g.lineTo(x, H * .78 + Math.sin(x * .02 + 1) * 10); g.lineTo(W, H); g.lineTo(0, H); g.fill();
      g.strokeStyle = P.acc; g.lineWidth = 3; g.fillStyle = '#1b1030'; g.beginPath(); g.arc(200, H * .74, 110, Math.PI, 0); g.fill(); g.stroke(); // dome
      g.beginPath(); for (let a = 0; a < 5; a++) { g.moveTo(200 + Math.cos(Math.PI + a * .6) * 110, H * .74 + Math.sin(Math.PI + a * .6) * 110); g.lineTo(200, H * .74); } g.stroke();
      // arm on a pedestal
      const bx = 560, by = H * .76, a1 = -1.2 + Math.sin(t * .9) * .35, a2 = 1.1 + Math.sin(t * .9 + 1) * .4;
      g.fillStyle = '#2a2040'; g.fillRect(bx - 55, by - 30, 110, 34); g.fillStyle = P.acc; g.fillRect(bx - 55, by - 32, 110, 5);
      const j1 = [bx, by - 34], j2 = [j1[0] + Math.cos(a1) * 150, j1[1] + Math.sin(a1) * 150], j3 = [j2[0] + Math.cos(a1 + a2) * 130, j2[1] + Math.sin(a1 + a2) * 130];
      g.lineCap = 'round'; g.strokeStyle = '#ece6ff'; g.lineWidth = 30; g.beginPath(); g.moveTo(...j1); g.lineTo(...j2); g.stroke(); g.lineWidth = 22; g.beginPath(); g.moveTo(...j2); g.lineTo(...j3); g.stroke();
      g.fillStyle = '#1b1030'; [j1, j2].forEach(j => { g.beginPath(); g.arc(j[0], j[1], 20, 0, 7); g.fill(); }); g.strokeStyle = P.acc; g.lineWidth = 4; [j1, j2].forEach(j => { g.beginPath(); g.arc(j[0], j[1], 11, 0, 7); g.stroke(); });
      g.fillStyle = '#c9b8ff'; g.fillRect(j3[0] - 26, j3[1] + 6, 52, 40); g.strokeStyle = '#1b1030'; g.lineWidth = 3; g.strokeRect(j3[0] - 26, j3[1] + 6, 52, 40); // crate
      g.fillStyle = P.acc; g.fillRect(j3[0] - 30, j3[1] - 6, 60, 10);
      g.font = '600 22px "JetBrains Mono", monospace'; g.fillStyle = P.text; g.textBaseline = 'top'; g.fillText('MARS BASE · LOGISTICS', 40, 40);
    },
    // NXP Cup: an autonomous car following a track, with hospital stops
    nxp(g, W, H, P) {
      const t = (performance.now() - T0) / 1000;
      g.fillStyle = '#07040f'; g.fillRect(0, 0, W, H);
      g.strokeStyle = P.acc + '22'; g.lineWidth = 1; for (let x = 0; x < W; x += 40) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); } for (let y = 0; y < H; y += 40) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
      const cx = W / 2, cy = H * .5, rx = 360, ry = 200;
      g.strokeStyle = '#ffffff'; g.lineWidth = 46; g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, 7); g.stroke();
      g.strokeStyle = '#05020b'; g.lineWidth = 38; g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, 7); g.stroke();
      g.strokeStyle = P.acc; g.lineWidth = 3; g.setLineDash([18, 16]); g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, 7); g.stroke(); g.setLineDash([]);
      [[.3, 'H1'], [2.1, 'H2'], [4.0, 'H3']].forEach(([a, l]) => { const x = cx + Math.cos(a) * (rx + 70), y = cy + Math.sin(a) * (ry + 60); g.fillStyle = '#1b1030'; g.strokeStyle = P.acc2; g.lineWidth = 3; g.beginPath(); g.roundRect(x - 36, y - 26, 72, 52, 10); g.fill(); g.stroke(); g.fillStyle = P.text; g.font = '700 26px Sora, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(l, x, y); g.textAlign = 'left'; });
      const a = t * .7, x = cx + Math.cos(a) * rx, y = cy + Math.sin(a) * ry, ang = Math.atan2(Math.cos(a) * ry, -Math.sin(a) * rx);
      g.save(); g.translate(x, y); g.rotate(ang);
      g.fillStyle = P.acc + '33'; g.beginPath(); g.moveTo(30, 0); g.lineTo(140, -50); g.lineTo(140, 50); g.fill(); // camera cone
      g.fillStyle = '#ece6ff'; g.beginPath(); g.roundRect(-34, -18, 68, 36, 8); g.fill(); g.fillStyle = '#1b1030'; [-22, 22].forEach(dx => [-20, 20].forEach(dy => g.fillRect(dx - 8, dy - 4, 16, 8)));
      g.fillStyle = P.acc; g.fillRect(14, -6, 10, 12); g.restore();
      g.font = '600 22px "JetBrains Mono", monospace'; g.fillStyle = P.text; g.textBaseline = 'top'; g.fillText('AUTONOMOUS · PATIENT DELIVERY', 40, 40);
    },
    // SIH: six students around a laptop, illustrated
    team(g, W, H, P) {
      const t = (performance.now() - T0) / 1000;
      const bg = g.createRadialGradient(W / 2, H * .45, 40, W / 2, H * .45, W * .7); bg.addColorStop(0, P.acc + '44'); bg.addColorStop(1, '#07040f'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
      const hairs = ['#120a1f', '#2a1636', '#0d0718', '#3a2448', '#160c22', '#241434'], shirts = [P.acc, '#ece6ff', P.acc2, '#6a4bd6', '#c9b8ff', '#3b2a7a'], skin = ['#b07a5a', '#8c5a40', '#c08a68', '#9a6648', '#a87252', '#7e5038'];
      for (let i = 0; i < 6; i++) {
        const x = 120 + i * 157, bob = Math.sin(t * 2 + i) * 4, y = H * .56 + (i % 2 ? 26 : 0) + bob;
        g.fillStyle = shirts[i]; g.beginPath(); g.ellipse(x, y + 120, 70, 70, 0, Math.PI, 0); g.fill(); g.fillRect(x - 70, y + 120, 140, 80);
        g.fillStyle = skin[i]; g.beginPath(); g.arc(x, y + 20, 44, 0, 7); g.fill();
        g.fillStyle = hairs[i]; g.beginPath(); g.arc(x, y + 6, 46, Math.PI * 1.05, Math.PI * 1.95); g.fill(); g.beginPath(); g.ellipse(x, y - 18, 44, 22, 0, 0, 7); g.fill();
        if (i % 3 === 0) { g.strokeStyle = '#ece6ff'; g.lineWidth = 3; g.strokeRect(x - 30, y + 12, 24, 16); g.strokeRect(x + 6, y + 12, 24, 16); }
        g.fillStyle = '#1b1030'; g.beginPath(); g.arc(x - 14, y + 22, 4, 0, 7); g.arc(x + 14, y + 22, 4, 0, 7); g.fill();
        g.strokeStyle = '#1b1030'; g.lineWidth = 3; g.beginPath(); g.arc(x, y + 34, 10, .2, Math.PI - .2); g.stroke();
      }
      g.fillStyle = '#1b1030'; g.beginPath(); g.roundRect(W / 2 - 170, H * .84, 340, 18, 6); g.fill(); g.fillStyle = P.acc; g.fillRect(W / 2 - 140, H * .84 - 6, 280, 6);
      g.font = '600 22px "JetBrains Mono", monospace'; g.fillStyle = P.text; g.textBaseline = 'top'; g.fillText('TEAM OF SIX · SMART LADDER', 40, 40);
    },
  };
  const stations = M.map((m, k) => {
    const grp = new THREE.Group(); grp.position.set(k * SP, 0, 0); scene.add(grp);
    const ped = shadowy(new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.45, .35, 48), darkMat)); ped.position.y = .175; grp.add(ped);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.3, .03, 8, 64), acc); ring.rotation.x = Math.PI / 2; ring.position.y = .36; grp.add(ring);
    const post = shadowy(new THREE.Mesh(new THREE.BoxGeometry(.12, 1.2, .12), darkMat)); post.position.y = .9; grp.add(post);
    const c = document.createElement('canvas'); c.width = 1024; c.height = 700;
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
    const frame = new THREE.Group(); frame.position.y = 2.75; frame.rotation.y = -0.12; grp.add(frame);
    frame.add(shadowy(new THREE.Mesh(new THREE.BoxGeometry(3.86, 2.7, .1), darkMat)));
    const faceMat = new THREE.MeshStandardMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: .5, roughness: .5 });
    const face = new THREE.Mesh(new THREE.PlaneGeometry(3.7, 2.53), faceMat); face.position.z = .056; frame.add(face);
    const topBar = new THREE.Mesh(new THREE.BoxGeometry(3.9, .04, .12), acc); topBar.position.y = 1.37; frame.add(topBar);
    const beamUp = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 9, 40, 1, true), new THREE.MeshBasicMaterial({ color: G.acc, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
    beamUp.position.y = 4.5; grp.add(beamUp);
    const st = { grp, frame, c, tex, faceMat, beamUp, m, img: null, k, e: 0 };
    if (m.img) { const im = new Image(); im.onload = () => { st.img = im; paint(st); }; im.src = m.img; }
    return st;
  });
  function paint(st) {
    const { c, m } = st, g = c.getContext('2d'), W = c.width, H = c.height, P = G.css;
    g.fillStyle = P.card; g.fillRect(0, 0, W, H);
    if (st.img) {
      const s = Math.max(W / st.img.naturalWidth, H / st.img.naturalHeight), dw = st.img.naturalWidth * s, dh = st.img.naturalHeight * s;
      g.drawImage(st.img, (W - dw) / 2, (H - dh) / 2, dw, dh);
      g.globalCompositeOperation = 'soft-light'; g.fillStyle = P.acc; g.globalAlpha = .28; g.fillRect(0, 0, W, H); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    } else if (m.draw) {
      ILLO[m.draw](g, W, H, P);
    } else {
      const gr = g.createLinearGradient(0, 0, W, H); gr.addColorStop(0, P.acc + '55'); gr.addColorStop(1, P.card); g.fillStyle = gr; g.fillRect(0, 0, W, H);
      g.fillStyle = P.acc + '18'; for (let x = 0; x < W; x += 40) for (let y = 0; y < H; y += 40) g.fillRect(x, y, 3, 3);
      g.font = '700 74px Sora, sans-serif'; g.fillStyle = P.text; g.textBaseline = 'top';
      const words = m.title.split(' '); let line = '', y = 150; const lines = [];
      words.forEach(w => { const t = line ? line + ' ' + w : w; if (g.measureText(t).width > W - 120 && line) { lines.push(line); line = w; } else line = t; }); lines.push(line);
      lines.slice(0, 4).forEach((l, i) => g.fillText(l, 60, y + i * 86));
    }
    const gr2 = g.createLinearGradient(0, H * .6, 0, H); gr2.addColorStop(0, P.bg + '00'); gr2.addColorStop(1, P.bg + 'dd'); g.fillStyle = gr2; g.fillRect(0, 0, W, H);
    g.font = '600 30px "JetBrains Mono", monospace'; const tw = g.measureText(m.time).width;
    g.fillStyle = P.acc; g.beginPath(); g.roundRect(40, H - 92, tw + 36, 52, 26); g.fill();
    g.fillStyle = P.accInk; g.textBaseline = 'middle'; g.fillText(m.time, 58, H - 65);
    g.font = '600 26px "JetBrains Mono", monospace'; g.fillStyle = P.text; g.fillText(String(st.k + 1).padStart(2, '0') + ' / ' + String(N).padStart(2, '0'), W - 170, H - 65);
    st.tex.needsUpdate = true;
  }
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => stations.forEach(paint));
  setInterval(() => { if (!running) return; stations.forEach(st => { if (st.m.draw && Math.abs(st.k - active) <= 1) paint(st); }); }, 120); // animated illustrations

  /* ---------- dust ---------- */
  const DN = 500, dPos = new Float32Array(DN * 3);
  for (let i = 0; i < DN; i++) { dPos[i * 3] = -20 + Math.random() * (LEN + 40); dPos[i * 3 + 1] = Math.random() * 12; dPos[i * 3 + 2] = -18 + Math.random() * 26; }
  const dGeo = new THREE.BufferGeometry(); dGeo.setAttribute('position', new THREE.BufferAttribute(dPos, 3));
  const dMat = new THREE.PointsMaterial({ size: .09, map: dot, color: G.acc2, transparent: true, opacity: .5, depthWrite: false, blending: THREE.AdditiveBlending });
  scene.add(new THREE.Points(dGeo, dMat));

  /* ---------- grade ---------- */
  function applyGrade(g) {
    G = g; studio.grade(g);
    scene.fog.color.setHex(g.fog); floorMat.color.setHex(g.floor); darkMat.color.setHex(g.dark);
    if (grid) { scene.remove(grid); grid.geometry.dispose(); }
    grid = new THREE.GridHelper(LEN + 80, Math.round((LEN + 80) / 1.5), g.gridA, g.gridB); grid.position.set(LEN / 2, .004, 0); scene.add(grid);
    acc.color.setHex(g.acc); pMat.color.setHex(g.acc); dMat.color.setHex(g.acc2);
    const base = new THREE.Color(g.bg);
    ridgeMats[0].color.copy(base).lerp(new THREE.Color(g.acc), .16); ridgeMats[1].color.copy(base).lerp(new THREE.Color(g.acc), .08);
    holoMat.uniforms.uA.value.setHex(g.acc); holoMat.uniforms.uB.value.setHex(g.acc2); beamMat.uniforms.uC.value.setHex(g.acc);
    stations.forEach(s => { s.beamUp.material.color.setHex(g.acc); paint(s); });
  }
  applyGrade(G); onGrade(applyGrade);

  /* ---------- layout ---------- */
  let narrow = false;
  function resize() {
    const W = canvas.clientWidth, H = canvas.clientHeight; if (!W || !H) return;
    renderer.setSize(W, H, false); narrow = W < 900;
    camera.aspect = W / H; camera.fov = narrow ? 50 : 38; camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(canvas); resize();
  let mx = 0, my = 0;
  addEventListener('pointermove', e => { mx = e.clientX / innerWidth - .5; my = e.clientY / innerHeight - .5; }, { passive: true });

  /* ---------- loop ---------- */
  let running = false, last = performance.now(), pS = 0, active = -1;
  const start = () => { if (running) return; running = true; last = performance.now(); requestAnimationFrame(tick); };
  new IntersectionObserver(([e]) => { if (e.isIntersecting && !document.hidden) start(); else running = false; }).observe(section);
  document.addEventListener('visibilitychange', () => { if (document.hidden) running = false; else { const r = section.getBoundingClientRect(); if (r.top < innerHeight && r.bottom > 0) start(); } });
  const progress = () => Math.min(1, Math.max(0, -section.getBoundingClientRect().top / Math.max(1, section.offsetHeight - innerHeight)));
  const camPos = V(0, 3, 11), look = V(0, 2, 0), eye = new THREE.Vector3(), tgt = new THREE.Vector3(), mid = new THREE.Vector3(), up = V(0, 1, 0);

  function tick(now) {
    if (!running) return;
    const dt = Math.min((now - last) / 1000, .05); last = now; const t = reduce ? 0 : now / 1000;
    const pr = progress(); pS += (pr - pS) * Math.min(1, dt * 6); if (Math.abs(pr - pS) > .3 || reduce) pS = pr;
    const v = pS * (N - 1), k = Math.min(N - 2, Math.floor(v)), f = v - k;
    const camX = (k + ss(.3, .7, f)) * SP;
    const idx = Math.min(N - 1, Math.round(k + ss(.3, .7, f)));

    camPos.set(camX + mx * 1.2 + (narrow ? 0 : -1.4), 4.1 - my * .5, narrow ? 15.5 : 13.2);
    camera.position.lerp(camPos, Math.min(1, dt * 8));
    look.lerp(tgt.set(camX + (narrow ? 0 : -1.0), narrow ? 3.6 : 3.4, 0), Math.min(1, dt * 8));
    camera.lookAt(look);

    // hologram drifts slower than the camera (parallax) and sits to the right
    holo.position.x = camX * .9 + (narrow ? 1.5 : 7.2);
    holoBase.position.set(holo.position.x, .01, holo.position.z + 1);
    holoMat.uniforms.uT.value = t;
    ridgeFar.position.x = camX * .55; ridgeNear.position.x = camX * .3;

    stations.forEach((s, i) => {
      const on = i === idx ? 1 : 0; s.e += (on - s.e) * Math.min(1, dt * 5);
      s.frame.scale.setScalar(1 + s.e * .08); s.frame.position.y = 2.75 + s.e * .25 + Math.sin(t * 1.2 + i) * .04;
      s.faceMat.emissiveIntensity = .28 + s.e * .5;
      s.beamUp.material.opacity = s.e * .07;
    });

    // gaze beam from the hologram's eyes to the active frame
    eye.set(holo.position.x - .35, holo.position.y + HH * .28, holo.position.z + .2);
    const st = stations[idx]; st.frame.getWorldPosition(tgt);
    mid.addVectors(eye, tgt).multiplyScalar(.5); beam.position.copy(mid);
    const d = tgt.clone().sub(eye); beam.scale.set(1, d.length(), 1); beam.quaternion.setFromUnitVectors(up, d.normalize());
    beamMat.uniforms.uO.value = (.12 + .05 * Math.sin(t * 3)) * (1 - Math.abs(f - .5) * (f > .3 && f < .7 ? 2 : 0));

    for (let i = 0; i < PN; i++) { const x = ((pOff[i] + t * .05) % 1) * (LEN + 20) - 10; pPos[i * 3] = x; pPos[i * 3 + 1] = .05; pPos[i * 3 + 2] = i % 2 ? 2.2 : 2.55; }
    pGeo.attributes.position.needsUpdate = true;

    if (idx !== active) {
      active = idx; const m = M[idx];
      card.classList.remove('in'); void card.offsetWidth;
      elN.textContent = String(idx + 1).padStart(2, '0'); elT.textContent = m.time; elH.textContent = m.title; elP.textContent = m.text;
      card.classList.add('in');
      dots.forEach((d2, i) => { d2.classList.toggle('on', i === idx); d2.classList.toggle('done', i < idx); });
    }
    bar.style.transform = `scaleX(${(v / (N - 1)).toFixed(4)})`;

    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }
}
