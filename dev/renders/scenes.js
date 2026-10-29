// FROST DISTRICT — 3D scenes rendered offline with three.js (see render.mjs).
// Every scene is brand-neutral: ice podiums, ice cubes, snow and lettering.
// Real product photos are layered on top in the theme, never modelled here.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';

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

/* ---------------- Scenes ---------------- */
export const scenes = {
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
