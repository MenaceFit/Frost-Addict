// FROST DISTRICT — 3D scenes rendered offline with three.js (see render.mjs).
// Every scene is brand-neutral: ice podiums, ice cubes, snow and lettering.
// Real product photos are layered on top in the theme, never modelled here.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { buildArena, snowParticles as arenaSnow } from './arena.js';
import * as SKY from './sky.js';

const TURQ = 0x31c9cc;
const ICE = 0xb9d8ed;

function rng(seed) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }

function makeRenderer(w, h, transparent) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: transparent, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(w, h);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  if (transparent) renderer.setClearColor(0x000000, 0);
  document.body.appendChild(renderer.domElement);
  return renderer;
}

function gradientTexture(stops, w = 16, h = 512) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); const grd = g.createLinearGradient(0, 0, 0, h);
  stops.forEach(([o, col]) => grd.addColorStop(o, col));
  g.fillStyle = grd; g.fillRect(0, 0, w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

function env(renderer, scene, intensity = 1) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = intensity;
}

const iceMaterial = (tint = 0xd8f3ff, opts = {}) => new THREE.MeshPhysicalMaterial({
  color: tint, transmission: 0.92, thickness: 1.6, roughness: 0.18, ior: 1.31,
  attenuationColor: new THREE.Color(0x8fd8e6), attenuationDistance: 2.2,
  clearcoat: 1, clearcoatRoughness: 0.12, specularIntensity: 1, ...opts,
});
const frostedMaterial = (tint = 0xeaf7fd) => new THREE.MeshPhysicalMaterial({
  color: tint, transmission: 0.55, thickness: 2.5, roughness: 0.55, ior: 1.31,
  attenuationColor: new THREE.Color(0xa5dbe9), attenuationDistance: 1.4, clearcoat: 0.6, clearcoatRoughness: 0.4,
});
const snowMaterial = () => new THREE.MeshStandardMaterial({ color: 0xf6fbff, roughness: 0.95, metalness: 0 });

// Rounded podium: lathe profile with soft edges, frosted ice body + glowing turquoise base ring.
function podium({ radius = 1.6, height = 0.7, tint = 0xeaf7fd, ring = true } = {}) {
  const group = new THREE.Group();
  const r = 0.12; const pts = [];
  pts.push(new THREE.Vector2(0, 0));
  for (let i = 0; i <= 8; i++) { const a = -Math.PI / 2 + (i / 8) * (Math.PI / 2); pts.push(new THREE.Vector2(radius - r + Math.cos(a) * r, r + Math.sin(a) * r)); }
  for (let i = 0; i <= 8; i++) { const a = (i / 8) * (Math.PI / 2); pts.push(new THREE.Vector2(radius - r + Math.cos(a) * r, height - r + Math.sin(a) * r)); }
  pts.push(new THREE.Vector2(0, height));
  const body = new THREE.Mesh(new THREE.LatheGeometry(pts, 128), frostedMaterial(tint));
  body.castShadow = true; body.receiveShadow = true; group.add(body);
  // Top plate: clearer ice
  const top = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.94, radius * 0.94, 0.06, 128), iceMaterial(0xf2fbff, { roughness: 0.32, transmission: 0.7 }));
  top.position.y = height + 0.02; top.receiveShadow = true; group.add(top);
  if (ring) {
    const glow = new THREE.Mesh(new THREE.TorusGeometry(radius * 1.01, 0.025, 16, 160), new THREE.MeshBasicMaterial({ color: TURQ }));
    glow.rotation.x = Math.PI / 2; glow.position.y = 0.05; group.add(glow);
    const light = new THREE.PointLight(TURQ, 6, 6, 1.6); light.position.set(0, 0.25, 0); group.add(light);
  }
  group.userData.top = height + 0.05;
  return group;
}

function iceCube(size, seed) {
  const r = rng(seed);
  const m = new THREE.Mesh(new RoundedBoxGeometry(size, size, size, 6, size * 0.16), iceMaterial(0xe2f6ff, { roughness: 0.1 + r() * 0.12 }));
  m.rotation.set(r() * Math.PI, r() * Math.PI, r() * Math.PI);
  m.castShadow = true;
  return m;
}

function snowDrift(scene, cx, cz, spread, count, seed, y = 0) {
  // Clusters of overlapping soft lumps read as a snow mound rather than flat discs.
  const r = rng(seed); const mat = snowMaterial();
  for (let i = 0; i < count; i++) {
    const a = r() * Math.PI * 2; const d = spread * (0.75 + r() * 0.45);
    const bx = cx + Math.cos(a) * d; const bz = cz + Math.sin(a) * d * 0.7;
    const lumps = 3 + Math.floor(r() * 3);
    for (let j = 0; j < lumps; j++) {
      const s = 0.18 + r() * 0.32;
      const m = new THREE.Mesh(new THREE.SphereGeometry(s, 32, 16), mat);
      m.scale.set(1.2, 0.55 + r() * 0.25, 1);
      m.position.set(bx + (r() - 0.5) * 0.5, y + s * 0.1, bz + (r() - 0.5) * 0.35);
      m.receiveShadow = true; m.castShadow = true; scene.add(m);
    }
  }
}

function snowParticles(scene, count, seed, box) {
  const r = rng(seed); const geo = new THREE.SphereGeometry(1, 8, 6); const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 });
  for (let i = 0; i < count; i++) {
    const m = new THREE.Mesh(geo, mat); const s = 0.008 + r() * 0.025; m.scale.setScalar(s);
    m.position.set(box[0] + r() * (box[1] - box[0]), box[2] + r() * (box[3] - box[2]), box[4] + r() * (box[5] - box[4]));
    scene.add(m);
  }
}

function lights(scene, { key = 0xffffff, keyI = 2.2, rim = TURQ, rimI = 30, fill = ICE } = {}) {
  const k = new THREE.DirectionalLight(key, keyI); k.position.set(-4, 7, 5); k.castShadow = true;
  k.shadow.mapSize.set(2048, 2048); k.shadow.camera.left = -6; k.shadow.camera.right = 6; k.shadow.camera.top = 6; k.shadow.camera.bottom = -6; k.shadow.radius = 6; k.shadow.bias = -0.0005;
  scene.add(k);
  const rimL = new THREE.SpotLight(rim, rimI, 20, Math.PI / 5, 0.6, 1.2); rimL.position.set(5, 4, -4); rimL.target.position.set(0, 1, 0); scene.add(rimL, rimL.target);
  scene.add(new THREE.HemisphereLight(fill, 0x0b1220, 0.5));
}

function radialGlow(color, size, opacity = 0.6) {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d'); const grd = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grd.addColorStop(0, color); grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity, depthWrite: false, fog: false }));
  return m;
}

function project(v, camera, w, h) { const p = v.clone().project(camera); return { x: (p.x + 1) / 2 * 100, y: (1 - (p.y + 1) / 2) * 100 }; }

/* ---------------- Props (brand-neutral) ---------------- */
function snowflake(size) {
  const g = new THREE.Group(); const mat = iceMaterial(0xf0fcff, { roughness: 0.1, thickness: 0.5, transmission: 0.6, attenuationColor: new THREE.Color(0x7fe3ea), emissive: new THREE.Color(0x31c9cc), emissiveIntensity: 0.45 });
  const arm = (len, wid) => new THREE.Mesh(new RoundedBoxGeometry(wid, len, wid * 0.7, 3, wid * 0.3), mat);
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(size * 0.22, size * 0.22, size * 0.12, 6), mat)).rotation.x = Math.PI / 2;
  for (let i = 0; i < 6; i++) {
    const a = new THREE.Group(); a.rotation.z = (i * Math.PI) / 3;
    const main = arm(size, size * 0.11); main.position.y = size / 2; a.add(main);
    [0.45, 0.72].forEach((t, k) => {
      const l = size * (k ? 0.24 : 0.34);
      [-1, 1].forEach((side) => { const b = arm(l, size * 0.08); b.position.set(side * Math.sin(Math.PI / 4) * l / 2, size * t + Math.cos(Math.PI / 4) * l / 2, 0); b.rotation.z = -side * Math.PI / 4; a.add(b); });
    });
    const tip = new THREE.Mesh(new THREE.OctahedronGeometry(size * 0.09), mat); tip.position.y = size * 1.02; a.add(tip);
    g.add(a);
  }
  g.traverse((m) => { if (m.isMesh) m.castShadow = true; });
  return g;
}

function shoeBoxes() {
  const g = new THREE.Group();
  const boxMat = new THREE.MeshPhysicalMaterial({ color: 0x15171c, roughness: 0.55, clearcoat: 0.3 });
  const lidMat = new THREE.MeshPhysicalMaterial({ color: TURQ, roughness: 0.35, clearcoat: 0.6 });
  const tissue = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 });
  const box = (w, h, d, y, rot, open) => {
    const b = new THREE.Group();
    const body = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 4, 0.04), boxMat); body.position.y = h / 2; b.add(body);
    const lid = new THREE.Mesh(new RoundedBoxGeometry(w * 1.04, h * 0.28, d * 1.04, 4, 0.04), lidMat);
    if (open) { lid.position.set(-w * 0.18, h + h * 0.35, -d * 0.25); lid.rotation.set(-0.5, 0.15, 0.22); const t = new THREE.Mesh(new THREE.SphereGeometry(w * 0.28, 24, 12), tissue); t.scale.set(1.6, 0.35, 0.9); t.position.y = h * 0.98; b.add(t); }
    else lid.position.y = h + h * 0.08;
    b.add(lid); b.position.y = y; b.rotation.y = rot;
    b.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
    return b;
  };
  g.add(box(2.3, 0.85, 1.35, 0, 0.35, false));
  g.add(box(2.0, 0.8, 1.2, 1.05, -0.2, true));
  return g;
}

function pufferSculpture() {
  // Glossy quilted tubes stacked like a puffer jacket panel (no logo, no garment shape).
  const g = new THREE.Group();
  const mat = new THREE.MeshPhysicalMaterial({ color: 0x0e0f12, roughness: 0.22, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.08, sheen: 0.4, sheenColor: new THREE.Color(0x335566) });
  for (let i = 0; i < 5; i++) {
    const tube = new THREE.Mesh(new THREE.CapsuleGeometry(0.34, 2.3 - Math.abs(i - 2) * 0.1, 16, 48), mat);
    tube.rotation.z = Math.PI / 2; tube.scale.set(1, 1.18, 0.62);
    tube.position.set(0, 0.36 + i * 0.5, Math.sin(i * 0.8) * 0.04);
    tube.castShadow = true; tube.receiveShadow = true; g.add(tube);
  }
  const zip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.6, 0.06), new THREE.MeshStandardMaterial({ color: 0xc9ced4, metalness: 0.9, roughness: 0.25 }));
  zip.position.set(0, 1.35, 0.22); g.add(zip);
  g.rotation.set(-0.08, 0.45, 0.04);
  return g;
}

function beanie() {
  const g = new THREE.Group();
  const knit = new THREE.MeshStandardMaterial({ color: 0x22262d, roughness: 0.92 });
  const cuffMat = new THREE.MeshStandardMaterial({ color: 0x1a1d22, roughness: 0.95 });
  const crown = new THREE.SphereGeometry(1, 128, 64, 0, Math.PI * 2, 0, Math.PI / 2);
  const pos = crown.attributes.position; const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i); const a = Math.atan2(v.z, v.x); const k = 1 + 0.025 * Math.sin(a * 36); v.x *= k; v.z *= k; pos.setXYZ(i, v.x, v.y, v.z); }
  crown.computeVertexNormals();
  const c = new THREE.Mesh(crown, knit); c.scale.set(1, 1.25, 1); c.position.y = 0.55; g.add(c);
  const cuffGeo = new THREE.CylinderGeometry(1.04, 1.06, 0.6, 128, 1, true);
  const cp = cuffGeo.attributes.position;
  for (let i = 0; i < cp.count; i++) { v.fromBufferAttribute(cp, i); const a = Math.atan2(v.z, v.x); const k = 1 + 0.03 * Math.sin(a * 48); v.x *= k; v.z *= k; cp.setXYZ(i, v.x, v.y, v.z); }
  cuffGeo.computeVertexNormals();
  const cuff = new THREE.Mesh(cuffGeo, cuffMat); cuff.position.y = 0.3; g.add(cuff);
  const patch = new THREE.Mesh(new RoundedBoxGeometry(0.5, 0.26, 0.05, 3, 0.03), new THREE.MeshStandardMaterial({ color: TURQ, roughness: 0.6 }));
  patch.position.set(0, 0.32, 1.07); g.add(patch);
  const pom = new THREE.SphereGeometry(0.42, 64, 32); const pp = pom.attributes.position;
  const r = rng(77); for (let i = 0; i < pp.count; i++) { v.fromBufferAttribute(pp, i); v.multiplyScalar(1 + (r() - 0.5) * 0.12); pp.setXYZ(i, v.x, v.y, v.z); }
  pom.computeVertexNormals();
  const pm = new THREE.Mesh(pom, new THREE.MeshStandardMaterial({ color: 0xf2f5f8, roughness: 1 })); pm.position.y = 1.85; g.add(pm);
  g.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  g.rotation.set(0.08, -0.4, -0.06);
  return g;
}

function giftStack() {
  const g = new THREE.Group();
  const mk = (size, color, ribbon, y, rot) => {
    const b = new THREE.Group();
    const body = new THREE.Mesh(new RoundedBoxGeometry(size, size * 0.8, size, 4, 0.05), new THREE.MeshPhysicalMaterial({ color, roughness: 0.45, clearcoat: 0.5 }));
    body.position.y = size * 0.4; b.add(body);
    const rm = new THREE.MeshPhysicalMaterial({ color: ribbon, roughness: 0.3, clearcoat: 1 });
    const r1 = new THREE.Mesh(new THREE.BoxGeometry(size * 1.01, size * 0.81, size * 0.12), rm); r1.position.y = size * 0.4; b.add(r1);
    const r2 = new THREE.Mesh(new THREE.BoxGeometry(size * 0.12, size * 0.81, size * 1.01), rm); r2.position.y = size * 0.4; b.add(r2);
    const bow = new THREE.Mesh(new THREE.TorusKnotGeometry(size * 0.1, size * 0.035, 96, 12, 2, 3), rm); bow.position.y = size * 0.86; b.add(bow);
    b.position.y = y; b.rotation.y = rot;
    b.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
    return b;
  };
  g.add(mk(1.7, 0x111317, TURQ, 0, 0.3));
  g.add(mk(1.2, 0xf4f7fa, 0x111317, 1.36, -0.25));
  g.add(mk(0.75, TURQ, 0xffffff, 2.33, 0.5));
  return g;
}

const CATS = [
  { name: 'sneakers', grad: ['#e9f8fb', '#bfe7ee'], tint: 0xe7f9fb, seed: 1, prop: shoeBoxes, scale: 0.95 },
  { name: 'doudounes', grad: ['#e4effa', '#a9c6e2'], tint: 0xeaf4fd, seed: 2, prop: pufferSculpture, scale: 0.85 },
  { name: 'accessoires', grad: ['#f0f4f8', '#c9d5e1'], tint: 0xf3f7fb, seed: 3, prop: beanie, scale: 0.95 },
  { name: 'marques', grad: ['#16243a', '#0a0f19'], tint: 0xdff1fb, seed: 4, prop: giftStack, scale: 0.85 },
];

function catScene(c, layer, { w, h }) {
  const dark = c.name === 'marques';
  const renderer = makeRenderer(w, h, layer === 'prop');
  const scene = new THREE.Scene();
  if (layer === 'bg') scene.background = gradientTexture([[0, c.grad[0]], [1, c.grad[1]]]);
  env(renderer, scene, dark ? 0.8 : 1.1);
  const camera = new THREE.PerspectiveCamera(32, w / h, 0.1, 100); camera.position.set(0, 2.6, 9.4); camera.lookAt(0, 1.6, 0);
  lights(scene, { keyI: dark ? 1.8 : 2.6, rimI: dark ? 50 : 18 });
  const p = podium({ radius: 1.7, height: 0.85, tint: c.tint, ring: true });
  if (layer === 'bg') {
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 30), new THREE.ShadowMaterial({ opacity: dark ? 0.5 : 0.18 }));
    floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
    scene.add(p);
    snowDrift(scene, 0, 0.3, 1.9, 9, c.seed * 13);
    const r = rng(c.seed * 7);
    for (let i = 0; i < 3; i++) { const cube = iceCube(0.28 + r() * 0.3, c.seed * 10 + i); cube.position.set((r() < 0.5 ? -1 : 1) * (2 + r() * 0.8), 1.2 + r() * 3.2, -1.2 + r() * 1.5); scene.add(cube); }
    snowParticles(scene, 90, c.seed, [-4, 4, 0.5, 6, -3, 2]);
  } else {
    // Transparent layer: prop + its contact shadow on the podium top.
    const catcher = new THREE.Mesh(new THREE.CircleGeometry(1.6, 64), new THREE.ShadowMaterial({ opacity: 0.28 }));
    catcher.rotation.x = -Math.PI / 2; catcher.position.y = p.userData.top; catcher.receiveShadow = true; scene.add(catcher);
    const prop = c.prop(); prop.scale.setScalar(c.scale); prop.position.y = p.userData.top; scene.add(prop);
  }
  renderer.render(scene, camera);
  return { canvas: renderer.domElement, meta: { podiumTop: project(new THREE.Vector3(0, p.userData.top, 0), camera, w, h) } };
}

/* ---------------- Frozen arena scenes (v3) ---------------- */
const HERO_CAM = { fov: 34, pos: [0, 2.6, 15], look: [0, 2.6, -10] };
const CARD_CAM = { fov: 30, pos: [0, 2.4, 13.5], look: [0, 1.9, 0] };
const BANNER_CAM = { fov: 32, pos: [0, 2.0, 15], look: [0, 3.2, -10] };

function arenaRenderer(w, h, transparent) { const r = makeRenderer(w, h, transparent); r.toneMappingExposure = 1.05; return r; }

function heroArena(layer, { w, h }) {
  const transparent = layer !== 'bg';
  const renderer = arenaRenderer(w, h, transparent);
  let scene, camera;
  const podiumPos = new THREE.Vector3(4.2, 0, -1.5);
  if (layer === 'bg') {
    ({ scene, camera } = buildArena(renderer, { w, h, palette: 'night', seed: 2, camera: HERO_CAM, valley: 10, rockX: 9.2 }));
    const p = podium({ radius: 1.7, height: 0.8 }); p.position.copy(podiumPos); scene.add(p);
    const glow = radialGlow('rgba(49,201,204,0.55)', 8, 0.6); glow.rotation.x = -Math.PI / 2; glow.position.set(podiumPos.x, 0.02, podiumPos.z); scene.add(glow);
    snowDrift(scene, podiumPos.x, podiumPos.z + 0.3, 2.0, 10, 7);
    arenaSnow(scene, 380, 3, [-14, 14, 0.3, 9, -10, 6]);
  } else {
    scene = new THREE.Scene(); env(renderer, scene, 1.1);
    camera = new THREE.PerspectiveCamera(HERO_CAM.fov, w / h, 0.1, 600); camera.position.set(...HERO_CAM.pos); camera.lookAt(...HERO_CAM.look);
    lights(scene, { keyI: 2.2, rimI: 60 });
    const f = snowflake(1.2); f.position.set(podiumPos.x, 2.5, podiumPos.z); f.rotation.set(0.1, -0.45, 0.15); scene.add(f);
  }
  renderer.render(scene, camera);
  return { canvas: renderer.domElement, meta: { podiumTop: project(new THREE.Vector3(podiumPos.x, 0.85, podiumPos.z), camera, w, h) } };
}

function cardArena(c, layer, { w, h }) {
  const renderer = arenaRenderer(w, h, layer === 'prop');
  let scene, camera;
  const palette = { sneakers: 'day', doudounes: 'dusk', accessoires: 'day', marques: 'night' }[c.name];
  if (layer === 'bg') {
    ({ scene, camera } = buildArena(renderer, { w, h, palette, seed: c.seed + 4, camera: CARD_CAM, valley: 0, rocks: true, rockX: 4.4, foreground: false }));
    scene.children.filter((o) => o.isGroup).forEach((g) => { g.scale.setScalar(0.7); g.position.z = -2.5; });
    const p = podium({ radius: 1.7, height: 0.85, tint: c.tint, ring: true }); scene.add(p);
    const glow = radialGlow('rgba(49,201,204,0.5)', 7, 0.55); glow.rotation.x = -Math.PI / 2; glow.position.y = 0.02; scene.add(glow);
    snowDrift(scene, 0, 0.3, 1.9, 9, c.seed * 13);
    arenaSnow(scene, 120, c.seed, [-5, 5, 0.4, 6, -4, 3]);
  } else {
    scene = new THREE.Scene(); env(renderer, scene, 1.1);
    camera = new THREE.PerspectiveCamera(CARD_CAM.fov, w / h, 0.1, 600); camera.position.set(...CARD_CAM.pos); camera.lookAt(...CARD_CAM.look);
    lights(scene, { keyI: 2.6, rimI: 25 });
    const catcher = new THREE.Mesh(new THREE.CircleGeometry(1.6, 64), new THREE.ShadowMaterial({ opacity: 0.3 }));
    catcher.rotation.x = -Math.PI / 2; catcher.position.y = 0.9; catcher.receiveShadow = true; scene.add(catcher);
    const prop = c.prop(); prop.scale.setScalar(c.scale); prop.position.y = 0.9; scene.add(prop);
  }
  renderer.render(scene, camera);
  return { canvas: renderer.domElement, meta: { podiumTop: project(new THREE.Vector3(0, 0.9, 0), camera, w, h) } };
}

/* ---------------- Winter sky scenes (v5, Drip Addict-style cards) ---------------- */
const SKY_PROPS = { sneakers: () => { const s = SKY.sneaker(); s.scale.setScalar(0.66); s.rotation.y = -0.35; return s; }, doudounes: () => { const p = pufferSculpture(); p.scale.setScalar(0.55); return p; },
  accessoires: () => { const b = beanie(); b.scale.setScalar(0.62); return b; }, marques: () => { const g = giftStack(); g.scale.setScalar(0.48); return g; } };
const SKY_CARD_CAM = { fov: 30, pos: [0, 3.0, 14.5], look: [0, 2.3, 0] };

function skyCard(name, layer, { w, h }) {
  const renderer = makeRenderer(w, h, layer === 'prop');
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(SKY_CARD_CAM.fov, w / h, 0.1, 200); camera.position.set(...SKY_CARD_CAM.pos); camera.lookAt(...SKY_CARD_CAM.look);
  SKY.skyLights(scene, renderer);
  const box = SKY.frostBox({ w: 3.0, h: 1.75, d: 2.2 }); box.rotation.y = 0.12;
  const seed = { sneakers: 3, doudounes: 7, accessoires: 11, marques: 19 }[name];
  if (layer === 'bg') {
    scene.background = SKY.skyBackground(...({ marques: ['#0f2d5c', '#2c6bb8', '#9fd0f5'] }[name] || ['#2f86e6', '#62aef0', '#d6eeff']));
    scene.add(box);
    const ld = SKY.ladder(2.2); ld.position.set(-1.05, 0, 1.45); scene.add(ld);
    const base = SKY.cloud(seed, { w: 8, h: 1.0, d: 3, puffs: 52 }); base.position.set(0, -0.75, 1.6); scene.add(base);
    const r = SKY.rng(seed * 5);
    [[-3.6, 5.2, -6, 3.2], [3.8, 4.6, -7, 3.6], [-3.2, 1.0, -3, 2.6], [3.4, 1.4, -3.5, 2.4]].forEach(([x, y, z, cw], i) => {
      const c = SKY.cloud(seed + i * 13, { w: cw, h: 1.2 + r() * 0.6, d: 1.6, puffs: 22 }); c.position.set(x, y, z); scene.add(c);
    });
    SKY.snowFlakes(scene, 120, seed, [-5, 5, 0.5, 8, -4, 3]);
  } else {
    const catcher = new THREE.Mesh(new THREE.PlaneGeometry(3.1, 2.3), new THREE.ShadowMaterial({ opacity: 0.35 }));
    catcher.rotation.x = -Math.PI / 2; catcher.rotation.z = 0.12; catcher.position.y = box.userData.top + 0.005; catcher.receiveShadow = true; scene.add(catcher);
    const prop = SKY_PROPS[name](); prop.position.y = box.userData.top; scene.add(prop);
  }
  renderer.render(scene, camera);
  return { canvas: renderer.domElement, meta: { boxTop: project(new THREE.Vector3(0, box.userData.top, 0), camera, w, h) } };
}

const SKY_HERO_CAM = { fov: 30, pos: [0, 3.2, 17], look: [0, 3.0, 0] };
function skyHero(layer, { w, h }) {
  const renderer = makeRenderer(w, h, layer === 'prop');
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(SKY_HERO_CAM.fov, w / h, 0.1, 200); camera.position.set(...SKY_HERO_CAM.pos); camera.lookAt(...SKY_HERO_CAM.look);
  SKY.skyLights(scene, renderer);
  const main = SKY.frostBox({ w: 3.4, h: 2.0, d: 2.4 }); main.position.set(3.9, 0, 0); main.rotation.y = -0.18;
  const side = SKY.frostBox({ w: 2.4, h: 1.3, d: 1.8 }); side.position.set(7.3, 0, -2.8); side.rotation.y = -0.35;
  if (layer === 'bg') {
    scene.background = SKY.skyBackground('#2a7fe0', '#5eaaf0', '#d8efff');
    scene.add(main, side);
    const ld = SKY.ladder(2.6); ld.position.set(1.9, 0, 1.3); ld.rotation.y = 0.35; scene.add(ld);
    const base = SKY.cloud(5, { w: 15, h: 1.2, d: 4, puffs: 90 }); base.position.set(5.5, -0.95, 1.8); scene.add(base);
    const base2 = SKY.cloud(9, { w: 10, h: 1.2, d: 3, puffs: 50 }); base2.position.set(-6, -0.6, 0.5); scene.add(base2);
    [[-9, 7.5, -10, 5], [1, 8.8, -14, 6], [10.5, 7.2, -9, 4.5], [-4, 4.5, -8, 3.2]].forEach(([x, y, z, cw], i) => {
      const c = SKY.cloud(31 + i * 7, { w: cw, h: 1.6, d: 2, puffs: 26 }); c.position.set(x, y, z); scene.add(c);
    });
    SKY.snowFlakes(scene, 260, 4, [-14, 14, 0.5, 11, -8, 5]);
  } else {
    [[main, () => { const p = pufferSculpture(); p.scale.setScalar(0.68); return p; }], [side, () => { const s = SKY.sneaker(); s.scale.setScalar(0.62); s.rotation.y = -0.6; return s; }]].forEach(([b, mk]) => {
      const catcher = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 2.4), new THREE.ShadowMaterial({ opacity: 0.35 }));
      catcher.rotation.x = -Math.PI / 2; catcher.rotation.z = b.rotation.y; catcher.position.set(b.position.x, b.userData.top + 0.005, b.position.z); catcher.receiveShadow = true; scene.add(catcher);
      const p = mk(); p.position.set(b.position.x, b.userData.top, b.position.z); scene.add(p);
    });
  }
  renderer.render(scene, camera);
  return { canvas: renderer.domElement, meta: { boxTop: project(new THREE.Vector3(main.position.x, main.userData.top, main.position.z), camera, w, h) } };
}

/* ---------------- Scenes ---------------- */
export const scenes = {
  ...Object.fromEntries(['sneakers', 'doudounes', 'accessoires', 'marques'].flatMap((n) => [
    ['sky-cat-' + n, (o) => skyCard(n, 'bg', o)], ['sky-prop-' + n, (o) => skyCard(n, 'prop', o)],
  ])),
  'sky-hero-bg': (o) => skyHero('bg', o),
  'sky-hero-prop': (o) => skyHero('prop', o),
  'arena-hero-bg': (o) => heroArena('bg', o),
  'arena-hero-flake': (o) => heroArena('flake', o),
  ...Object.fromEntries(CATS.flatMap((c) => [
    ['arena-cat-' + c.name, (o) => cardArena(c, 'bg', o)],
    ['arena-prop-' + c.name, (o) => cardArena(c, 'prop', o)],
  ])),
  'arena-banner': ({ w, h }) => {
    const renderer = arenaRenderer(w, h, false);
    const { scene, camera } = buildArena(renderer, { w, h, palette: 'dusk', seed: 9, camera: BANNER_CAM, valley: 12 });
    arenaSnow(scene, 300, 5, [-14, 14, 0.3, 9, -10, 6]);
    renderer.render(scene, camera);
    return { canvas: renderer.domElement };
  },
  'arena-type': async ({ w, h }) => {
    const renderer = arenaRenderer(w, h, false);
    const { scene, camera } = buildArena(renderer, { w, h, palette: 'night', seed: 6, camera: { fov: 30, pos: [0, 2.2, 16], look: [0, 2.4, -10] }, valley: 0 });
    const font = await new Promise((res) => new FontLoader().load('/three/examples/fonts/helvetiker_bold.typeface.json', res));
    const geo = new TextGeometry('FROST', { font, size: 2.3, depth: 0.9, curveSegments: 12, bevelEnabled: true, bevelThickness: 0.12, bevelSize: 0.06, bevelSegments: 8 });
    geo.center();
    const text = new THREE.Mesh(geo, iceMaterial(0xe8f8ff, { roughness: 0.1, thickness: 0.9, attenuationColor: new THREE.Color(0x6fd6e0), attenuationDistance: 3, emissive: new THREE.Color(0x0b3a48), emissiveIntensity: 0.5 }));
    text.position.set(0, 1.35, 0); text.castShadow = true; scene.add(text);
    env(renderer, scene, 0.9);
    const back = radialGlow('rgba(49,201,204,0.7)', 18, 0.45); back.position.set(0, 2, -4); scene.add(back);
    snowDrift(scene, 0, 0.8, 4.2, 14, 5);
    arenaSnow(scene, 300, 9, [-14, 14, 0.3, 9, -10, 6]);
    renderer.render(scene, camera);
    return { canvas: renderer.domElement };
  },

  // Hero background: night studio, podium on the right, floor with soft reflections, snow dust.
  'hero-bg': ({ w, h }) => {
    const renderer = makeRenderer(w, h, false);
    const scene = new THREE.Scene();
    scene.background = gradientTexture([[0, '#05080f'], [0.6, '#0f1c31'], [1, '#18304c']]);
    scene.fog = new THREE.Fog(0x0d1626, 10, 26);
    env(renderer, scene, 0.6);
    const camera = new THREE.PerspectiveCamera(30, w / h, 0.1, 100);
    camera.position.set(0, 3.2, 11); camera.lookAt(0, 1.1, 0);
    lights(scene, { keyI: 1.8, rimI: 40 });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 40), new THREE.MeshStandardMaterial({ color: 0x101b2d, roughness: 0.75, metalness: 0.05 }));
    floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
    const pool = radialGlow('rgba(49,201,204,0.55)', 7, 0.7); pool.rotation.x = -Math.PI / 2; pool.position.set(3.4, 0.01, 0); scene.add(pool);
    const halo = radialGlow('rgba(90,170,220,0.9)', 9, 0.45); halo.position.set(3.4, 2.4, -4); scene.add(halo);
    const p = podium({ radius: 1.55, height: 0.8 }); p.position.set(3.4, 0, 0); scene.add(p);
    const p2 = podium({ radius: 0.8, height: 0.4, ring: false }); p2.position.set(5.6, 0, -1.4); scene.add(p2);
    const p3 = podium({ radius: 0.6, height: 1.2, ring: false }); p3.position.set(1.2, 0, -1.8); scene.add(p3);
    snowDrift(scene, 3.4, 0.4, 1.9, 18, 7);
    snowDrift(scene, 6.5, 1.2, 1, 8, 15);
    snowParticles(scene, 320, 3, [-10, 10, 0.2, 7, -7, 3]);
    renderer.render(scene, camera);
    const top = project(new THREE.Vector3(3.4, p.userData.top, 0), camera, w, h);
    return { canvas: renderer.domElement, meta: { podiumTop: top } };
  },

  // Floating ice cubes on a transparent layer (animated in CSS on top of the hero).
  'hero-ice': ({ w, h }) => {
    const renderer = makeRenderer(w, h, true);
    const scene = new THREE.Scene(); env(renderer, scene, 1.1);
    const camera = new THREE.PerspectiveCamera(30, w / h, 0.1, 100); camera.position.set(0, 3.2, 11); camera.lookAt(0, 1.1, 0);
    lights(scene, { keyI: 2.4, rimI: 60 });
    [[0.62, 0.9, 3.9, -0.6], [0.55, 6.3, 3.6, -0.6], [0.38, 0.6, 1.2, 1.6], [0.62, 6.9, 1.3, 0.2], [0.3, 1.9, 4.9, -1.2]].forEach(([s, x, y, z], i) => {
      const c = iceCube(s, 40 + i); c.position.set(x, y, z); scene.add(c);
    });
    renderer.render(scene, camera);
    return { canvas: renderer.domElement };
  },

  // Category cards: background (podium) and prop (transparent layer, same camera) rendered separately.
  ...Object.fromEntries(CATS.flatMap((c) => [
    ['cat-' + c.name, (o) => catScene(c, 'bg', o)],
    ['prop-' + c.name, (o) => catScene(c, 'prop', o)],
  ])),

  // Hero ice snowflake layer (floats above the main podium).
  'hero-flake': ({ w, h }) => {
    const renderer = makeRenderer(w, h, true);
    const scene = new THREE.Scene(); env(renderer, scene, 1.2);
    const camera = new THREE.PerspectiveCamera(30, w / h, 0.1, 100); camera.position.set(0, 3.2, 11); camera.lookAt(0, 1.1, 0);
    lights(scene, { keyI: 2.4, rimI: 70 });
    const f = snowflake(1.15); f.position.set(3.4, 2.35, 0.3); f.rotation.set(0.12, -0.5, 0.18); scene.add(f);
    renderer.render(scene, camera);
    return { canvas: renderer.domElement };
  },

  // 3D lettering: extruded frosted "FROST" for the editorial / newsletter banner.
  'frost-type': async ({ w, h }) => {
    const renderer = makeRenderer(w, h, false);
    const scene = new THREE.Scene();
    scene.background = gradientTexture([[0, '#06090f'], [1, '#14233a']]);
    env(renderer, scene, 0.9);
    const camera = new THREE.PerspectiveCamera(28, w / h, 0.1, 100); camera.position.set(-1.2, 1.6, 13); camera.lookAt(0, 0.9, 0);
    lights(scene, { keyI: 1.4, rimI: 80 });
    const font = await new Promise((res) => new FontLoader().load('/three/examples/fonts/helvetiker_bold.typeface.json', res));
    const geo = new TextGeometry('FROST', { font, size: 2.1, depth: 0.9, curveSegments: 12, bevelEnabled: true, bevelThickness: 0.12, bevelSize: 0.06, bevelSegments: 8 });
    geo.center();
    const text = new THREE.Mesh(geo, iceMaterial(0xe8f8ff, { roughness: 0.12, thickness: 0.9, attenuationColor: new THREE.Color(0x6fd6e0), attenuationDistance: 3, emissive: new THREE.Color(0x0b3a48), emissiveIntensity: 0.6 }));
    text.position.y = 1.3; text.rotation.y = 0.12; text.castShadow = true; scene.add(text);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 40), new THREE.MeshStandardMaterial({ color: 0x0f1a2b, roughness: 0.8, metalness: 0.05 }));
    floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
    const back = radialGlow('rgba(49,201,204,0.85)', 16, 0.55); back.position.set(0, 1.6, -3); scene.add(back);
    const pool = radialGlow('rgba(120,200,235,0.6)', 14, 0.5); pool.rotation.x = -Math.PI / 2; pool.position.set(0, 0.01, 0.5); scene.add(pool);
    snowDrift(scene, 0, 0.6, 3.8, 14, 5);
    snowParticles(scene, 220, 9, [-9, 9, 0.2, 6, -4, 3]);
    const line = new THREE.Mesh(new THREE.BoxGeometry(9.5, 0.03, 0.03), new THREE.MeshBasicMaterial({ color: TURQ })); line.position.set(0, 0.03, 1.4); scene.add(line);
    renderer.render(scene, camera);
    return { canvas: renderer.domElement };
  },
};
