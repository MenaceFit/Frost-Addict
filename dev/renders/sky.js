// FROST DISTRICT — "winter sky" set, in the spirit of Drip Addict's product-on-box-in-the-clouds
// cards, rebuilt from scratch: icy blue sky, volumetric cotton clouds, FROST-branded boxes,
// a ladder and snow. Brand-neutral objects only; real product cutouts are layered in the theme.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export function rng(seed) { let s = seed % 2147483647; if (s <= 0) s += 2147483646; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }
const TURQ = 0x31c9cc;

export function skyBackground(top = '#2f86e6', mid = '#62aef0', bottom = '#cfeaff') {
  const c = document.createElement('canvas'); c.width = 16; c.height = 1024;
  const g = c.getContext('2d'); const grd = g.createLinearGradient(0, 0, 0, 1024);
  grd.addColorStop(0, top); grd.addColorStop(0.55, mid); grd.addColorStop(1, bottom);
  g.fillStyle = grd; g.fillRect(0, 0, 16, 1024);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export function skyLights(scene, renderer) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.75;
  scene.add(new THREE.HemisphereLight(0xffffff, 0x7fb6e8, 1.5));
  const sun = new THREE.DirectionalLight(0xfff6ea, 3.0); sun.position.set(-6, 10, 8); sun.castShadow = true;
  sun.shadow.mapSize.set(4096, 4096); Object.assign(sun.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10, near: 1, far: 40 }); sun.shadow.radius = 5; sun.shadow.bias = -0.0004;
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0xbfe4ff, 1.2); fill.position.set(7, 3, 6); scene.add(fill);
}

// Cotton cloud: many overlapping soft spheres, flattened at the base.
export function cloud(seed, { w = 4, h = 1.6, d = 2.2, puffs = 26 } = {}) {
  const r = rng(seed); const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, emissive: 0xdbeeff, emissiveIntensity: 0.18 });
  for (let i = 0; i < puffs; i++) {
    const t = i / puffs; const x = (r() - 0.5) * w; const zz = (r() - 0.5) * d;
    const edge = 1 - Math.min(1, Math.abs(x) / (w / 2));
    const s = (0.35 + r() * 0.55) * (0.55 + edge * 0.7) * (h / 1.6);
    const y = Math.max(s * 0.35, r() * h * edge * 0.75);
    const m = new THREE.Mesh(new THREE.SphereGeometry(s, 36, 24), mat);
    m.position.set(x, y, zz); m.castShadow = true; m.receiveShadow = true; g.add(m);
    void t;
  }
  return g;
}

function labelTexture(text, sub, bg = '#121418', fg = '#ffffff', accent = '#31c9cc') {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 512;
  const g = c.getContext('2d'); g.fillStyle = bg; g.fillRect(0, 0, 1024, 512);
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = fg; g.font = 'italic 900 150px Inter, Arial Black, Arial, sans-serif'; g.fillText(text, 512, 220);
  g.fillStyle = accent; g.font = 'italic 900 88px Inter, Arial Black, Arial, sans-serif'; g.fillText(sub, 512, 350);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}

// FROST DISTRICT presentation box (the pedestal products sit on).
export function frostBox({ w = 3.2, h = 1.9, d = 2.4, lid = true } = {}) {
  const g = new THREE.Group();
  const body = new THREE.MeshPhysicalMaterial({ color: 0x121418, roughness: 0.45, clearcoat: 0.6, clearcoatRoughness: 0.3 });
  const front = new THREE.MeshPhysicalMaterial({ map: labelTexture('FROST', 'DISTRICT'), roughness: 0.45, clearcoat: 0.6, clearcoatRoughness: 0.3 });
  const geo = new RoundedBoxGeometry(w, h, d, 6, 0.06);
  // RoundedBoxGeometry groups: +x, -x, +y, -y, +z, -z
  const box = new THREE.Mesh(geo, [body, body, body, body, front, body]);
  box.position.y = h / 2; box.castShadow = true; box.receiveShadow = true; g.add(box);
  if (lid) {
    const l = new THREE.Mesh(new RoundedBoxGeometry(w * 1.035, h * 0.16, d * 1.035, 6, 0.05), new THREE.MeshPhysicalMaterial({ color: TURQ, roughness: 0.35, clearcoat: 0.8 }));
    l.position.y = h + h * 0.03; l.castShadow = true; l.receiveShadow = true; g.add(l);
  }
  g.userData.top = h + (lid ? h * 0.11 : 0);
  return g;
}

export function ladder(height = 2.6) {
  const g = new THREE.Group(); const mat = new THREE.MeshStandardMaterial({ color: 0xf4f6f8, roughness: 0.5 });
  [-0.28, 0.28].forEach((x) => { const rail = new THREE.Mesh(new THREE.BoxGeometry(0.07, height, 0.07), mat); rail.position.set(x, height / 2, 0); rail.castShadow = true; g.add(rail); });
  for (let y = 0.3; y < height - 0.1; y += 0.36) { const rung = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.05, 0.05), mat); rung.position.set(0, y, 0); rung.castShadow = true; g.add(rung); }
  g.rotation.x = -0.32;
  return g;
}

// Stylised, logo-free sneaker (extruded side profile + sole + laces).
export function sneaker() {
  const g = new THREE.Group();
  const s = new THREE.Shape();
  s.moveTo(-1.42, 0.05); s.lineTo(1.3, 0.05);
  s.bezierCurveTo(1.62, 0.08, 1.66, 0.42, 1.38, 0.5);      // rounded toe
  s.bezierCurveTo(1.0, 0.6, 0.55, 0.68, 0.3, 0.8);         // vamp
  s.lineTo(-0.3, 1.02);                                     // lace line
  s.bezierCurveTo(-0.5, 1.12, -0.7, 0.9, -0.88, 0.92);      // collar dip
  s.bezierCurveTo(-1.05, 0.95, -1.15, 1.18, -1.3, 1.2);    // heel tab
  s.bezierCurveTo(-1.5, 1.12, -1.55, 0.5, -1.42, 0.05);    // heel counter
  const upper = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 0.9, bevelEnabled: true, bevelThickness: 0.14, bevelSize: 0.12, bevelSegments: 8, curveSegments: 32 }),
    new THREE.MeshPhysicalMaterial({ color: 0xf2f4f6, roughness: 0.55, clearcoat: 0.2 }));
  upper.position.z = -0.45; upper.position.y = 0.3; g.add(upper);
  const panel = new THREE.Shape(); panel.moveTo(-0.9, 0.05); panel.bezierCurveTo(-0.3, 0.05, 0.4, 0.15, 0.9, 0.4); panel.bezierCurveTo(0.4, 0.55, -0.4, 0.7, -0.95, 0.6); panel.closePath();
  const pm = new THREE.MeshPhysicalMaterial({ color: TURQ, roughness: 0.4, clearcoat: 0.6 });
  [-0.6, 0.6].forEach((z) => { const p = new THREE.Mesh(new THREE.ExtrudeGeometry(panel, { depth: 0.04, bevelEnabled: false }), pm); p.position.set(0, 0.42, z > 0 ? 0.59 : -0.63); g.add(p); });
  const sole = new THREE.Mesh(new RoundedBoxGeometry(3.05, 0.38, 1.28, 6, 0.16), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.7 }));
  sole.position.y = 0.19; g.add(sole);
  const strip = new THREE.Mesh(new RoundedBoxGeometry(3.07, 0.08, 1.3, 4, 0.04), new THREE.MeshStandardMaterial({ color: 0x121418, roughness: 0.6 }));
  strip.position.y = 0.06; g.add(strip);
  const lace = new THREE.MeshStandardMaterial({ color: 0x121418, roughness: 0.6 });
  for (let i = 0; i < 5; i++) { const l = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.7, 6, 12), lace); l.rotation.x = Math.PI / 2; l.position.set(-0.28 + i * 0.15, 1.34 - i * 0.055, 0); g.add(l); }
  g.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  g.scale.setScalar(0.95);
  return g;
}

export function snowFlakes(scene, count, seed, box) {
  const r = rng(seed); const geo = new THREE.SphereGeometry(1, 10, 8);
  const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95 });
  for (let i = 0; i < count; i++) {
    const m = new THREE.Mesh(geo, mat); m.scale.setScalar(0.015 + Math.pow(r(), 2.5) * 0.06);
    m.position.set(box[0] + r() * (box[1] - box[0]), box[2] + r() * (box[3] - box[2]), box[4] + r() * (box[5] - box[4])); scene.add(m);
  }
}
