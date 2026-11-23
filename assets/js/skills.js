// Skills cell: a conveyor feeds skill blocks; the arm picks each one, presents it to the camera,
// then shelves it. When the shelf is full it clears and the loop starts again.
import { THREE, COL, MAT, makeRenderer, makeStudio, makeRobot, makeFloor, shadowy, ss, V, lerpV } from './robot.js';
import { current, onGrade } from './theme.js';

{
  const canvas = document.getElementById('skillsCell');
  if (!canvas) throw new Error('no skills canvas');
  const wrap = canvas.parentElement;
  const items = [...document.querySelectorAll('.sk[data-i]')];
  const nowName = document.getElementById('skNow'), nowCat = document.getElementById('skCat');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const CATS = [...new Set(items.map(el => el.dataset.cat))];
  const SK = items.map(el => ({ name: el.dataset.name, cat: el.dataset.cat, ci: CATS.indexOf(el.dataset.cat) }));
  const colOf = sk => [G.css.acc, G.css.acc2, G.light ? '#14945f' : '#5cf2b0'][sk.ci] || G.css.acc;
  const NS = SK.length;

  let renderer;
  try { renderer = makeRenderer(canvas); } catch (e) { wrap.classList.add('no-3d'); throw e; }
  const scene = new THREE.Scene(); scene.fog = new THREE.Fog(COL.bg, 16, 34);
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 80);
  let G = current();
  const studio = makeStudio(renderer, scene, G); const flo = makeFloor(scene, { size: 60 });
  const R = makeRobot(); scene.add(R.robot);
  const accentMat = new THREE.MeshBasicMaterial({ color: COL.cyan });
  const { dark, steel } = MAT;

  /* ---------- conveyor ---------- */
  const BELT_Y = 0.9, BELT_Z = 2.4, PICK_X = -2.8, BS = 0.8;
  const frame = shadowy(new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.7, 1.3), dark)); frame.position.set(-5.0, 0.45, BELT_Z); scene.add(frame);
  const beltTexC = document.createElement('canvas'); beltTexC.width = 256; beltTexC.height = 32;
  { const g = beltTexC.getContext('2d'); g.fillStyle = '#0d1424'; g.fillRect(0, 0, 256, 32); g.fillStyle = '#1b2942'; for (let x = 0; x < 256; x += 32) g.fillRect(x, 0, 14, 32); }
  const beltTex = new THREE.CanvasTexture(beltTexC); beltTex.wrapS = THREE.RepeatWrapping; beltTex.repeat.x = 6;
  const belt = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.06, 1.1), new THREE.MeshStandardMaterial({ map: beltTex, roughness: .7 })); belt.position.set(-5.0, BELT_Y - 0.03, BELT_Z); belt.receiveShadow = true; scene.add(belt);
  for (const dz of [-0.62, 0.62]) { const l = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.04, 0.04), accentMat); l.position.set(-5.0, BELT_Y + 0.02, BELT_Z + dz); scene.add(l); }

  /* ---------- shelf ---------- */
  const COLS = [2.25, 3.2, 4.15], ROWS = [0.55, 1.5, 2.45, 3.4], SHELF_Z = -1.6;
  const slot = k => V(COLS[k % 3], ROWS[Math.floor(k / 3)], SHELF_Z);
  ROWS.forEach(y => { const b = shadowy(new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.06, 1.0), steel)); b.position.set(3.2, y - BS / 2 - 0.03, SHELF_Z); scene.add(b); });
  for (const x of [1.55, 4.85]) { const post = shadowy(new THREE.Mesh(new THREE.BoxGeometry(0.08, 4.1, 0.08), dark)); post.position.set(x, 2.05, SHELF_Z - 0.45); scene.add(post); }

  /* ---------- skill blocks ---------- */
  const redraws = [];
  function faceTex(sk) {
    const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
    const draw = () => {
      g.fillStyle = G.css.card; g.fillRect(0, 0, 256, 256);
      const col = colOf(sk); g.fillStyle = col; g.fillRect(0, 0, 256, 12);
      g.strokeStyle = col; g.globalAlpha = .35; g.lineWidth = 4; g.strokeRect(6, 6, 244, 244); g.globalAlpha = 1;
      g.fillStyle = col; g.font = '600 20px "JetBrains Mono", monospace'; g.textAlign = 'center'; g.fillText(sk.cat.toUpperCase(), 128, 52);
      g.fillStyle = G.css.text; g.font = '700 42px Sora, sans-serif';
      const words = sk.name.split(' '); const lines = []; let cur = '';
      words.forEach(w => { const tst = cur ? cur + ' ' + w : w; if (g.measureText(tst).width > 220 && cur) { lines.push(cur); cur = w; } else cur = tst; }); lines.push(cur);
      lines.forEach((l, i) => g.fillText(l, 128, 140 + (i - (lines.length - 1) / 2) * 50));
      tex.needsUpdate = true;
    };
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
    draw(); (document.fonts ? document.fonts.ready : Promise.resolve()).then(draw);
    redraws.push(draw);
    return tex;
  }
  const blocks = SK.map(sk => {
    const tex = faceTex(sk);
    const side = new THREE.MeshStandardMaterial({ color: 0x2a2440, metalness: .4, roughness: .4, emissive: 0x000000, emissiveIntensity: .06 });
    const front = new THREE.MeshStandardMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: .55, roughness: .5 });
    const m = shadowy(new THREE.Mesh(new THREE.BoxGeometry(BS, BS, BS), [side, side, side, side, front, side]));
    m.visible = false; scene.add(m); return m;
  });

  const sideMats = [];
  function applyGrade(g) {
    G = g; studio.grade(g); flo.grade(g); R.grade(g); accentMat.color.setHex(g.acc);
    { const b = beltTexC.getContext('2d'); b.fillStyle = G.css.card; b.fillRect(0, 0, 256, 32); b.fillStyle = G.light ? '#c9c9d1' : '#ffffff22'; for (let x = 0; x < 256; x += 32) b.fillRect(x, 0, 14, 32); beltTex.needsUpdate = true; }
    redraws.forEach(f => f());
  }
  applyGrade(G); onGrade(applyGrade);

  /* ---------- layout ---------- */
  let narrow = false;
  function resize() {
    const W = canvas.clientWidth, H = canvas.clientHeight; if (!W || !H) return;
    renderer.setSize(W, H, false); narrow = W < 640;
    camera.aspect = W / H; camera.fov = narrow ? 44 : 34; camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(canvas); resize();

  /* ---------- choreography ---------- */
  const T_SKILL = 3.4, T_CLEAR = 1.6, CYCLE = NS * T_SKILL + T_CLEAR;
  const HOME = V(0.3, 4.4, 1.6), SHOW = V(0.9, 3.1, 3.5);
  const pick = V(PICK_X, BELT_Y + BS / 2 + 0.2, BELT_Z);
  function armAt(k, u) {
    const A1 = pick.clone().add(V(0, 1.0, 0)), L = pick.clone().add(V(0.3, 1.5, 0));
    const S = slot(k).add(V(0, 0.2, 0)), Q1 = S.clone().add(V(-0.2, 0.3, 1.4));
    if (u < .16) return lerpV(HOME, A1, ss(0, .16, u));
    if (u < .24) return lerpV(A1, pick, ss(.16, .24, u));
    if (u < .28) return pick.clone();
    if (u < .36) return lerpV(pick, L, ss(.28, .36, u));
    if (u < .50) { const t = ss(.36, .50, u); const q = lerpV(L, SHOW, t); q.y += Math.sin(t * Math.PI) * .4; return q; }
    if (u < .70) return SHOW.clone().add(V(Math.sin((u - .5) * 18) * .05, Math.sin((u - .5) * 12) * .06, 0));
    if (u < .80) return lerpV(SHOW, Q1, ss(.70, .80, u));
    if (u < .86) return lerpV(Q1, S, ss(.80, .86, u));
    if (u < .90) return S.clone();
    return lerpV(S, HOME, ss(.90, 1, u));
  }
  const gripAt = u => (u >= .24 && u < .88) ? Math.min(1, (u - .24) / .04) * (u < .86 ? 1 : 1 - (u - .86) / .02) : 0;

  const gp = new THREE.Vector3();
  let running = false, last = performance.now(), clock = 0, lastK = -1;
  const start = () => { if (running) return; running = true; last = performance.now(); requestAnimationFrame(tick); };
  new IntersectionObserver(([e]) => { if (e.isIntersecting && !document.hidden) start(); else running = false; }, { rootMargin: '80px' }).observe(wrap);
  document.addEventListener('visibilitychange', () => { if (document.hidden) running = false; else if (wrap.getBoundingClientRect().top < innerHeight) start(); });

  function tick(now) {
    if (!running) return;
    const dt = Math.min((now - last) / 1000, 0.05); last = now;
    clock = reduce ? NS * T_SKILL - 0.01 : (clock + dt) % CYCLE;
    const t = now / 1000;
    const inClear = clock >= NS * T_SKILL;
    const k = inClear ? NS : Math.floor(clock / T_SKILL);
    const u = inClear ? 1 : (clock % T_SKILL) / T_SKILL;

    if (inClear) R.pose(HOME, 0, 0);
    else R.pose(armAt(k, u), u > .3 && u < .7 ? ss(.36, .5, u) * Math.PI * 2 : 0, gripAt(u));
    R.robot.updateMatrixWorld(true); R.gripPt.getWorldPosition(gp);

    belt.material.map.offset.x = -(t * 0.6) % 1;
    blocks.forEach((b, i) => {
      b.rotation.set(0, 0, 0); b.scale.setScalar(1);
      if (inClear) {
        const c = (clock - NS * T_SKILL) / T_CLEAR, d = ss(i / NS * .6, i / NS * .6 + .3, c);
        b.visible = d < 1; b.position.copy(slot(i)); b.position.y -= d * 0.5; b.scale.setScalar(1 - d);
        return;
      }
      if (i > k) { b.visible = false; return; }
      b.visible = true;
      if (i < k) { b.position.copy(slot(i)); return; }
      // current block
      if (u < .24) { const x = lerpV(V(-7.6, pick.y - 0.2, BELT_Z), V(PICK_X, pick.y - 0.2, BELT_Z), ss(0, .2, u)); b.position.copy(x); }
      else if (u < .87) { b.position.copy(gp).add(V(0, -0.2, 0)); b.rotation.y = u > .36 && u < .5 ? ss(.36, .5, u) * Math.PI * 2 : 0; }
      else b.position.copy(slot(i));
    });

    if (k !== lastK) {
      items.forEach((el, i) => { el.classList.toggle('on', i === k); el.classList.toggle('done', i < k); });
      if (k < NS) { nowName.textContent = SK[k].name; nowCat.textContent = SK[k].cat; nowCat.style.color = colOf(SK[k]); }
      else { nowName.textContent = 'Shelf full — restocking'; nowCat.textContent = 'Loop'; nowCat.style.color = ''; }
      lastK = k;
    }

    const ang = 0.32 + Math.sin(t * .15) * .03;
    const d = narrow ? 18.5 : 15.5;
    camera.position.set(Math.sin(ang) * d, 4.8, Math.cos(ang) * d);
    camera.lookAt(narrow ? -0.3 : 0, 1.9, 0.6);
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }
}
