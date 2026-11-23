// Shared robot cell: studio lighting/environment, a white ceramic 5-axis arm with cyan accents,
// floor + safety ring, and an analytic 2-link IK solver for the fingertip.
import * as THREE from './three.min.js';
export { THREE };

export const COL = { bg: 0x070a12, cyan: 0x4de1ff, mint: 0x5cf2b0, violet: 0x8b7bff, coral: 0xff6b6b };

export function makeRenderer(canvas) {
  const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  r.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFShadowMap;
  r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.08;
  return r;
}

export function makeStudio(renderer, scene, g) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const hemi = new THREE.HemisphereLight(0xcfe3ff, 0x070a12, 0.4); scene.add(hemi);
  const key = new THREE.SpotLight(0xffffff, 240, 40, 0.6, 0.6, 1.6);
  key.position.set(5, 11, 8); key.target.position.set(0, 2, 1); key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024); key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02;
  scene.add(key, key.target);
  const rim = new THREE.DirectionalLight(0xffffff, 2.2); rim.position.set(-6, 6, -8); scene.add(rim);
  const fill = new THREE.DirectionalLight(0xffffff, 0.9); fill.position.set(-8, 3, 6); scene.add(fill);
  let envTex = null;
  function grade(g) {
    const env = new THREE.Scene(); env.background = new THREE.Color(g.light ? 0xbfbfc6 : g.bg2);
    const panel = (w, h, col, x, y, z, ry = 0, rx = 0) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: col, side: THREE.DoubleSide }));
      m.position.set(x, y, z); m.rotation.set(rx, ry, 0); env.add(m);
    };
    panel(10, 3, 0xffffff, 0, 8, 0, 0, Math.PI / 2);
    panel(6, 8, 0xf2f2ff, -9, 2, 2, Math.PI / 2);
    panel(4, 8, g.acc2, 9, 2, -3, -Math.PI / 2);
    panel(20, 1, g.acc, 0, -1, -9);
    if (envTex) envTex.dispose();
    envTex = pmrem.fromScene(env, 0.04).texture; scene.environment = envTex;
    hemi.color.setHex(g.light ? 0xffffff : 0xd8d8ff); hemi.groundColor.setHex(g.bg); hemi.intensity = g.light ? 1.1 : 0.4;
    rim.color.setHex(g.rim); rim.intensity = g.light ? 1.2 : 2.2;
    fill.color.setHex(g.fill); fill.intensity = g.light ? 0.6 : 0.9;
    key.intensity = g.light ? 180 : 240;
    if (scene.fog) scene.fog.color.setHex(g.fog);
  }
  grade(g);
  return { key, grade };
}

const shadowy = m => { m.castShadow = true; m.receiveShadow = true; return m; };
const put = (parent, mesh, x = 0, y = 0, z = 0) => { mesh.position.set(x, y, z); parent.add(mesh); return mesh; };
export { shadowy, put };

function rbox(w, h, d, r) {
  const s = new THREE.Shape(), X = w / 2, Y = d / 2;
  s.moveTo(-X + r, -Y); s.lineTo(X - r, -Y); s.quadraticCurveTo(X, -Y, X, -Y + r);
  s.lineTo(X, Y - r); s.quadraticCurveTo(X, Y, X - r, Y); s.lineTo(-X + r, Y);
  s.quadraticCurveTo(-X, Y, -X, Y - r); s.lineTo(-X, -Y + r); s.quadraticCurveTo(-X, -Y, -X + r, -Y);
  const g = new THREE.ExtrudeGeometry(s, { depth: h, bevelEnabled: true, bevelSize: r * .4, bevelThickness: r * .4, bevelSegments: 4, curveSegments: 10 });
  g.rotateX(-Math.PI / 2); return g;
}

export const MAT = {
  shell: new THREE.MeshPhysicalMaterial({ color: 0xe9eef6, metalness: 0.05, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.08 }),
  dark: new THREE.MeshStandardMaterial({ color: 0x1a2232, metalness: 0.75, roughness: 0.32 }),
  steel: new THREE.MeshStandardMaterial({ color: 0xa8b4c6, metalness: 1, roughness: 0.2 }),
  rubber: new THREE.MeshStandardMaterial({ color: 0x0b0f17, metalness: 0, roughness: 0.8 }),
};

export function makeRobot() {
  const L1 = 3.1, L2 = 2.7, SH_Y = 1.7, TIP = 1.12;
  const { shell, dark, steel, rubber } = MAT;
  const glow = new THREE.MeshBasicMaterial({ color: COL.cyan });
  let gc = { acc: COL.cyan, ok: COL.mint };
  const hub = (r, len, mat = dark) => { const g = new THREE.CylinderGeometry(r, r, len, 40); g.rotateX(Math.PI / 2); return shadowy(new THREE.Mesh(g, mat)); };
  const ledRing = (r, parent, y, rot = true) => { const m = new THREE.Mesh(new THREE.TorusGeometry(r, 0.03, 8, 80), glow); if (rot) m.rotation.x = Math.PI / 2; m.position.y = y; parent.add(m); return m; };

  const robot = new THREE.Group();
  put(robot, shadowy(new THREE.Mesh(new THREE.CylinderGeometry(1.45, 1.7, 0.4, 56), dark)), 0, 0.2, 0);
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; put(robot, new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.08, 12), steel), Math.cos(a) * 1.45, 0.42, Math.sin(a) * 1.45); }
  const J1 = new THREE.Group(); J1.position.y = 0.4; robot.add(J1);
  put(J1, shadowy(new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.2, 0.95, 56), dark)), 0, 0.48, 0);
  ledRing(1.1, J1, 0.06);
  put(J1, shadowy(new THREE.Mesh(rbox(1.15, 0.7, 1.5, 0.18), dark)), 0, 0.92, 0);
  const J2 = new THREE.Group(); J2.position.y = SH_Y - 0.4; J1.add(J2);
  J2.add(hub(0.62, 1.7));
  const c2 = put(J2, new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.05, 40).rotateX(Math.PI / 2), steel), 0, 0, 0.87);
  const r2 = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.025, 8, 60), glow); r2.position.z = 0.88; J2.add(r2);
  put(J2, shadowy(new THREE.Mesh(rbox(0.78, L1 - 0.4, 0.95, 0.2), shell)), 0, 0.15, 0);
  put(J2, new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.06, 0.97), glow), 0, L1 * 0.55, 0);
  const J3 = new THREE.Group(); J3.position.y = L1; J2.add(J3);
  J3.add(hub(0.5, 1.35));
  put(J3, new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.05, 32).rotateX(Math.PI / 2), steel), 0, 0, 0.7);
  const r3 = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.022, 8, 60), glow); r3.position.z = 0.71; J3.add(r3);
  put(J3, shadowy(new THREE.Mesh(rbox(0.6, L2 - 0.35, 0.72, 0.16), shell)), 0, 0.1, 0);
  put(J3, new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.08, 0.74), rubber), 0, L2 * 0.62, 0);
  const J4 = new THREE.Group(); J4.position.y = L2; J3.add(J4);
  J4.add(hub(0.36, 0.95));
  const J5 = new THREE.Group(); J4.add(J5);
  put(J5, shadowy(new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.45, 32), dark)), 0, 0.3, 0);
  put(J5, shadowy(new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.08, 32), steel)), 0, 0.56, 0);
  ledRing(0.37, J5, 0.62);
  put(J5, shadowy(new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.22, 0.42), dark)), 0, 0.7, 0);
  const fingers = [-1, 1].map(s => {
    const f = shadowy(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.5, 0.32), steel)); f.position.set(s * 0.28, 1.04, 0); J5.add(f);
    put(f, new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.22, 0.3), rubber), -s * 0.06, 0.1, 0);
    return f;
  });
  const tipLight = new THREE.PointLight(COL.cyan, 3, 4, 2); tipLight.position.y = 1.2; J5.add(tipLight);
  const gripPt = new THREE.Object3D(); gripPt.position.y = TIP; J5.add(gripPt);
  const cablePts = [new THREE.Vector3(-0.5, 0.2, -0.55), new THREE.Vector3(-0.62, 1.4, -0.6), new THREE.Vector3(-0.55, 2.6, -0.55), new THREE.Vector3(-0.3, 3.1, -0.5)];
  J2.add(shadowy(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(cablePts), 40, 0.07, 10), rubber)));

  function solve(T) {
    const yaw = Math.atan2(-T.z, T.x);
    const d = Math.max(0.6, Math.hypot(T.x, T.z));
    const hw = (T.y + TIP) - SH_Y;
    let r = Math.hypot(d, hw);
    r = Math.min(Math.max(r, Math.abs(L1 - L2) + 0.05), L1 + L2 - 0.05);
    const a = Math.atan2(hw, d), b = Math.acos((L1 * L1 + r * r - L2 * L2) / (2 * L1 * r));
    const phi1 = a + b, c = Math.acos((L1 * L1 + L2 * L2 - r * r) / (2 * L1 * L2)), phi2 = phi1 - (Math.PI - c);
    return { yaw, s: phi1 - Math.PI / 2, e: phi2 - phi1, w: -Math.PI / 2 - phi2 };
  }
  function pose(T, wristYaw = 0, grip = 0, yawOverride = null) {
    const q = solve(T);
    J1.rotation.y = yawOverride ?? q.yaw; J2.rotation.z = q.s; J3.rotation.z = q.e; J4.rotation.z = q.w;
    J5.rotation.y = wristYaw - J1.rotation.y;
    fingers[0].position.x = -0.28 + grip * 0.2; fingers[1].position.x = 0.28 - grip * 0.2;
    glow.color.setHex(grip > 0.5 ? gc.ok : gc.acc); tipLight.color.copy(glow.color);
    return q;
  }
  function grade(g) { gc = g; MAT.shell.color.setHex(g.shell); MAT.dark.color.setHex(g.dark); glow.color.setHex(g.acc); }
  return { robot, J1, J2, J3, J4, J5, fingers, gripPt, tipLight, glow, solve, pose, TIP, grade };
}

export function makeFloor(scene, { size = 90, ring = true } = {}) {
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x0a1120, roughness: 0.8, metalness: 0.15 });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(size, size), floorMat);
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  let grid = null;
  const c = document.createElement('canvas'); c.width = 1024; c.height = 64; const g2 = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = THREE.RepeatWrapping; tex.repeat.x = 3;
  if (ring) {
    const ringGeo = new THREE.RingGeometry(2.25, 2.55, 128, 1);
    const pos = ringGeo.attributes.position, uv = ringGeo.attributes.uv;
    for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), y = pos.getY(i); uv.setXY(i, Math.atan2(y, x) / (Math.PI * 2) + .5, (Math.hypot(x, y) - 2.25) / 0.3); }
    const ringM = new THREE.Mesh(ringGeo, new THREE.MeshStandardMaterial({ map: tex, roughness: .6, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: .25 }));
    ringM.rotation.x = -Math.PI / 2; ringM.position.y = 0.006; ringM.receiveShadow = true; scene.add(ringM);
  }
  const hex = n => '#' + n.toString(16).padStart(6, '0');
  function grade(g) {
    floorMat.color.setHex(g.floor);
    if (grid) { scene.remove(grid); grid.geometry.dispose(); }
    grid = new THREE.GridHelper(size, size, g.gridA, g.gridB); grid.position.y = 0.003; scene.add(grid);
    g2.fillStyle = hex(g.floor); g2.fillRect(0, 0, 1024, 64); g2.fillStyle = hex(g.acc);
    for (let x = -64; x < 1100; x += 64) { g2.beginPath(); g2.moveTo(x, 64); g2.lineTo(x + 32, 0); g2.lineTo(x + 64, 0); g2.lineTo(x + 32, 64); g2.fill(); }
    tex.needsUpdate = true;
  }
  return { grade };
}

export const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
export const V = (x, y, z) => new THREE.Vector3(x, y, z);
export const lerpV = (a, b, t) => a.clone().lerp(b, t);

// Draw text-on-canvas card faces in the site's style.
export function cardCanvas(w = 1024, h = 640) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
