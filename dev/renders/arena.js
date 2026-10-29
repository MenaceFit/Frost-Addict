// FROST DISTRICT — "frozen arena" environment: procedural snowy mountains, cloudy night sky,
// mist, a reflective frozen lake, icy rocks with icicles framing the shot, foreground snow.
import * as THREE from 'three';
import { ImprovedNoise } from 'three/addons/math/ImprovedNoise.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

const perlin = new ImprovedNoise();
export function rng(seed) { let s = seed % 2147483647; if (s <= 0) s += 2147483646; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }
const fbm = (x, y, z = 0, oct = 5) => { let a = 0.5, f = 1, sum = 0; for (let i = 0; i < oct; i++) { sum += a * perlin.noise(x * f, y * f, z); a *= 0.5; f *= 2.03; } return sum; };
const ridged = (x, y, oct = 6) => { let a = 0.5, f = 1, sum = 0, w = 1; for (let i = 0; i < oct; i++) { let n = 1 - Math.abs(perlin.noise(x * f, y * f, 7.3)); n *= n * w; w = Math.min(1, n * 2); sum += a * n; a *= 0.5; f *= 2.1; } return sum; };
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

function canvasTex(w, h, draw, repeat) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat); }
  t.anisotropy = 8; return t;
}

// Sky: vertical gradient + fbm clouds + stars, painted once on a big canvas.
function skyTexture(p) {
  return canvasTex(2048, 1024, (g, w, h) => {
    const grd = g.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0, p.skyTop); grd.addColorStop(0.62, p.skyMid); grd.addColorStop(1, p.skyHorizon);
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
    const img = g.getImageData(0, 0, w, h); const d = img.data;
    for (let y = 0; y < h; y++) {
      const band = smooth(0.05, 0.45, y / h) * (1 - smooth(0.78, 1, y / h));
      for (let x = 0; x < w; x++) {
        let n = fbm(x / 260, y / 120, 1.7, 6) * 0.5 + 0.5;
        n = smooth(0.48, 0.85, n) * band * p.cloud;
        const i = (y * w + x) * 4;
        d[i] += (232 - d[i]) * n; d[i + 1] += (240 - d[i + 1]) * n; d[i + 2] += (250 - d[i + 2]) * n;
      }
    }
    g.putImageData(img, 0, 0);
    const r = rng(17);
    for (let i = 0; i < 700; i++) { g.fillStyle = `rgba(255,255,255,${0.15 + r() * 0.6})`; const s = r() < 0.92 ? 1 : 2; g.fillRect(r() * w, r() * h * 0.6, s, s); }
  });
}

function mistTexture() {
  return canvasTex(1024, 256, (g, w, h) => {
    const img = g.createImageData(w, h); const d = img.data;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const v = (fbm(x / 140, y / 50, 3.1, 5) * 0.5 + 0.5);
      const fade = Math.sin((y / h) * Math.PI) * smooth(0, 0.15, x / w) * (1 - smooth(0.85, 1, x / w));
      const a = smooth(0.35, 0.8, v) * fade;
      const i = (y * w + x) * 4; d[i] = d[i + 1] = 240; d[i + 2] = 248; d[i + 3] = a * 255;
    }
    g.putImageData(img, 0, 0);
  });
}

function crackTexture(seed) {
  return canvasTex(1024, 1024, (g, w, h) => {
    g.fillStyle = '#c9dfee'; g.fillRect(0, 0, w, h);
    const r = rng(seed);
    // frosty mottling
    const img = g.getImageData(0, 0, w, h); const d = img.data;
    for (let y = 0; y < h; y += 1) for (let x = 0; x < w; x += 1) {
      const n = fbm(x / 90, y / 90, 5.5, 4); const i = (y * w + x) * 4; const k = n * 40;
      d[i] += k; d[i + 1] += k; d[i + 2] += k * 0.6;
    }
    g.putImageData(img, 0, 0);
    g.lineCap = 'round';
    for (let i = 0; i < 120; i++) {
      let x = r() * w, y = r() * h, a = r() * Math.PI * 2; const len = 30 + r() * 220;
      g.strokeStyle = `rgba(255,255,255,${0.25 + r() * 0.5})`; g.lineWidth = 0.6 + r() * 1.6;
      g.beginPath(); g.moveTo(x, y);
      for (let s = 0; s < len; s += 8) { a += (r() - 0.5) * 0.7; x += Math.cos(a) * 8; y += Math.sin(a) * 8; g.lineTo(x, y); }
      g.stroke();
    }
  }, 6);
}

function mountains(scene, { z, width, depth, height, seed, valley = 0, valleyWidth = 30, color }) {
  const geo = new THREE.PlaneGeometry(width, depth, 640, 160);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i); const zz = pos.getZ(i);
    const env = 0.35 + 0.65 * smooth(valleyWidth * 0.25, valleyWidth, Math.abs(x - valley));
    const back = smooth(depth / 2, -depth / 2, zz); // higher towards the back
    let hgt = Math.pow(ridged(x / 34 + seed, zz / 28 + seed, 7), 1.25) * height * env * (0.35 + 0.65 * back);
    hgt += fbm(x / 12, zz / 12, seed, 3) * 1.2;
    pos.setY(i, Math.max(0, hgt - 1.5));
  }
  geo.computeVertexNormals();
  const nrm = geo.attributes.normal; const cols = []; const c = new THREE.Color();
  const snow = new THREE.Color(0xf2f6fb); const rock = new THREE.Color(color || 0x2b3240); const blue = new THREE.Color(0xa9c3dc);
  for (let i = 0; i < pos.count; i++) {
    const ny = nrm.getY(i); const y = pos.getY(i);
    const s = smooth(0.6, 0.82, ny + fbm(pos.getX(i) / 2.5, pos.getZ(i) / 2.5, 9, 3) * 0.3);
    c.copy(rock).lerp(snow, s); if (y < 2) c.lerp(blue, 0.25);
    cols.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0 }));
  m.position.z = z; m.receiveShadow = true; m.castShadow = true; scene.add(m);
  return m;
}

function rock(seed, sx, sy, sz) {
  let geo = new THREE.IcosahedronGeometry(1, 8);
  geo.deleteAttribute('normal'); geo.deleteAttribute('uv');
  geo = mergeVertices(geo);
  const pos = geo.attributes.position; const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const n = fbm(v.x * 1.6 + seed, v.y * 1.6, v.z * 1.6, 5);
    const strata = Math.sin(v.y * 9 + n * 3) * 0.05;
    const detail = fbm(v.x * 6 + seed, v.y * 6, v.z * 6, 4) * 0.09;
    v.multiplyScalar(1 + n * 0.5 + strata + detail);
    v.y = v.y > 0.55 ? 0.55 + (v.y - 0.55) * 0.35 : v.y; // flat-ish top ledges catch snow
    pos.setXYZ(i, v.x * sx, v.y * sy, v.z * sz);
  }
  geo.computeVertexNormals();
  const nrm = geo.attributes.normal; const cols = []; const c = new THREE.Color();
  const snow = new THREE.Color(0xf4f8fc); const dark = new THREE.Color(0x2c323d);
  for (let i = 0; i < pos.count; i++) {
    const s = smooth(0.18, 0.42, nrm.getY(i) + fbm(pos.getX(i) * 2, pos.getY(i) * 2, pos.getZ(i) * 2, 3) * 0.35);
    c.copy(dark).offsetHSL(0, 0, fbm(pos.getX(i) * 4, pos.getY(i) * 4, 2, 2) * 0.06).lerp(snow, s);
    cols.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.88 }));
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

const icicleMat = () => new THREE.MeshPhysicalMaterial({ color: 0xe6f6ff, emissive: 0x2a6f86, emissiveIntensity: 0.35, transmission: 0.6, thickness: 0.4, roughness: 0.08, ior: 1.31, clearcoat: 1, attenuationColor: new THREE.Color(0x8fd2e6), attenuationDistance: 1.2 });

function icicles(group, seed, ledges, facing) {
  const r = rng(seed); const mat = icicleMat();
  ledges.forEach(({ y, rx, rz, count }) => {
    for (let i = 0; i < count; i++) {
      const a = facing + (r() - 0.5) * Math.PI * 0.9;
      const len = 0.25 + Math.pow(r(), 1.6) * 1.8; const rad = 0.03 + r() * 0.07 * (len / 1.5 + 0.4);
      const cone = new THREE.Mesh(new THREE.ConeGeometry(rad, len, 10, 3), mat);
      cone.rotation.x = Math.PI; cone.rotation.z = (r() - 0.5) * 0.08;
      cone.position.set(Math.cos(a) * rx * 0.97, y - len / 2, Math.sin(a) * rz * 0.97);
      cone.castShadow = true; group.add(cone);
    }
  });
}

function rockFormation(scene, { x, z, h, w, seed, facing }) {
  const g = new THREE.Group();
  const main = rock(seed, w, h, w * 0.8); main.position.y = h * 0.6; g.add(main);
  const r2 = rock(seed + 3, w * 0.75, h * 0.5, w * 0.7); r2.position.set(-Math.sign(x) * -w * 0.2, h * 0.25, w * 0.6); g.add(r2);
  icicles(g, seed, [{ y: h * 1.0, rx: w * 0.92, rz: w * 0.74, count: 26 }, { y: h * 0.55, rx: w * 0.95, rz: w * 0.8, count: 18 }, { y: h * 0.45, rx: w * 0.7, rz: w * 0.9, count: 10 }], facing);
  g.position.set(x, 0, z); scene.add(g);
  return g;
}

function snowField(scene, { x, z, w, d, seed, height = 0.8 }) {
  const geo = new THREE.PlaneGeometry(w, d, 120, 60); geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const px = pos.getX(i); const pz = pos.getZ(i);
    const edge = Math.min(1, (1 - Math.abs(px) / (w / 2)) * 4) * Math.min(1, (1 - Math.abs(pz) / (d / 2)) * 4);
    pos.setY(i, Math.max(0, (fbm(px / 2.2 + seed, pz / 2.2, 4, 4) * 0.5 + 0.55) * height * edge));
  }
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0xf3f7fb, roughness: 0.96 }));
  m.position.set(x, -0.05, z); m.receiveShadow = true; m.castShadow = true; scene.add(m);
}

export function snowParticles(scene, count, seed, box) {
  const r = rng(seed); const geo = new THREE.SphereGeometry(1, 8, 6); const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, fog: false });
  for (let i = 0; i < count; i++) {
    const m = new THREE.Mesh(geo, mat); m.scale.setScalar(0.01 + Math.pow(r(), 3) * 0.05);
    m.position.set(box[0] + r() * (box[1] - box[0]), box[2] + r() * (box[3] - box[2]), box[4] + r() * (box[5] - box[4])); scene.add(m);
  }
}

export const PALETTES = {
  night: { skyTop: '#06101f', skyMid: '#173052', skyHorizon: '#86a7c7', cloud: 0.6, fog: 0x7e9bba, fogDensity: 0.0042, hemiSky: 0xbcd6f0, hemiGround: 0x1b2433, hemi: 1.0, moon: 0xdce9ff, moonI: 2.4, exposure: 1.05 },
  dusk: { skyTop: '#101a30', skyMid: '#34557f', skyHorizon: '#c3d6e8', cloud: 0.7, fog: 0x9fb6cd, fogDensity: 0.0038, hemiSky: 0xd7e6f5, hemiGround: 0x2a3446, hemi: 1.25, moon: 0xf3f6ff, moonI: 2.8, exposure: 1.1 },
  day: { skyTop: '#2c5f97', skyMid: '#7aa3cb', skyHorizon: '#dfeaf4', cloud: 0.85, fog: 0xc3d4e5, fogDensity: 0.0035, hemiSky: 0xffffff, hemiGround: 0x5a6b80, hemi: 1.5, moon: 0xffffff, moonI: 3.2, exposure: 1.12 },
};

// Builds the whole environment. Returns { scene, camera, reflectors } ready to render.
export function buildArena(renderer, opts) {
  const { w, h, palette = 'night', seed = 1, camera: cam, valley = 0, rocks = true, foreground = true, lake = true } = opts;
  const p = PALETTES[palette];
  renderer.toneMappingExposure = p.exposure;
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(p.fog, p.fogDensity);
  const camera = new THREE.PerspectiveCamera(cam.fov, w / h, 0.1, 600);
  camera.position.set(...cam.pos); camera.lookAt(...cam.look);

  // Sky dome (big sphere with the painted sky, unaffected by fog)
  const skyTex = skyTexture(p); skyTex.wrapS = THREE.RepeatWrapping;
  const sky = new THREE.Mesh(new THREE.SphereGeometry(400, 64, 32, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false }));
  sky.rotation.y = Math.PI * 0.5; scene.add(sky);

  // Lights: cool moonlight with long shadows + sky fill + turquoise accent near the subject
  scene.add(new THREE.HemisphereLight(p.hemiSky, p.hemiGround, p.hemi));
  const moon = new THREE.DirectionalLight(p.moon, p.moonI); moon.position.set(-30, 40, 20); moon.castShadow = true;
  moon.shadow.mapSize.set(4096, 4096); Object.assign(moon.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 140 }); moon.shadow.bias = -0.0004; moon.shadow.radius = 4;
  scene.add(moon);

  // Mountains: far range + mid range, valley opening where the subject stands
  mountains(scene, { z: -150, width: 520, depth: 120, height: 85, seed: seed + 0.3, valley, valleyWidth: 80, color: 0x232a36 });
  mountains(scene, { z: -70, width: 300, depth: 60, height: 32, seed: seed + 5.1, valley, valleyWidth: 40, color: 0x1b2029 });

  // Mist banks at the foot of the mountains
  const mist = mistTexture();
  [[-48, 3, 260, 18, 0.55], [-32, 1.5, 200, 9, 0.4], [-20, 0.6, 140, 4, 0.3]].forEach(([z, y, mw, mh, o]) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(mw, mh), new THREE.MeshBasicMaterial({ map: mist, transparent: true, opacity: o, depthWrite: false, fog: false }));
    m.position.set(valley * 0.5, y, z); scene.add(m);
  });

  // Frozen lake: mirror + frosted, cracked ice layer on top
  const reflectors = [];
  if (lake) {
    const mirror = new Reflector(new THREE.PlaneGeometry(400, 400), { textureWidth: Math.round(w * 0.6), textureHeight: Math.round(h * 0.6), color: 0x6a7f96 });
    mirror.rotation.x = -Math.PI / 2; mirror.position.y = -0.02; scene.add(mirror); reflectors.push(mirror);
    const ice = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshPhysicalMaterial({
      map: crackTexture(seed * 3 + 1), color: 0xb7d0e4, transparent: true, opacity: 0.42, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.05, metalness: 0,
    }));
    ice.material.map.repeat.set(40, 40);
    ice.rotation.x = -Math.PI / 2; ice.receiveShadow = true; scene.add(ice);
  }

  // Shore snow behind the lake
  snowField(scene, { x: valley * 0.3, z: -30, w: 180, d: 12, seed: seed + 2, height: 0.5 });

  if (rocks) {
    rockFormation(scene, { x: -(opts.rockX || 11.2) + cam.pos[0], z: 1.5, h: 7.2, w: 2.7, seed: seed + 11, facing: Math.PI * 0.25 });
    rockFormation(scene, { x: (opts.rockX || 11.2) + cam.pos[0], z: 1.0, h: 6.4, w: 2.6, seed: seed + 23, facing: Math.PI * 0.75 });
    // rim light so the framing rocks read as icy rock rather than black cut-outs
    const rim = new THREE.DirectionalLight(0xbfe3ff, 1.6); rim.position.set(0, 12, 30); scene.add(rim);
  }
  if (foreground) {
    snowField(scene, { x: -8 + cam.pos[0], z: 10, w: 10, d: 4, seed: seed + 31, height: 0.9 });
    snowField(scene, { x: 8 + cam.pos[0], z: 10, w: 10, d: 4, seed: seed + 37, height: 0.9 });
  }
  return { scene, camera, reflectors };
}
