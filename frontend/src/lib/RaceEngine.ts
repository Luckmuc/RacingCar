import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { Map as GameMap } from '../types';

// ---- Default model path ----
const DEFAULT_MODEL_PATH = '/models/porsche_gt3_rs.glb';

// ---- Multi-path model cache ----
const modelCache = new Map<string, THREE.Group>();
const loadPromises = new Map<string, Promise<THREE.Group>>();

function loadCarModel(modelPath: string = DEFAULT_MODEL_PATH): Promise<THREE.Group> {
  const cached = modelCache.get(modelPath);
  if (cached) return Promise.resolve(cached.clone(true));

  const existing = loadPromises.get(modelPath);
  if (existing) return existing.then(m => m.clone(true));

  const promise = new Promise<THREE.Group>((resolve, reject) => {
    const loader = new GLTFLoader();
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
    dracoLoader.setDecoderConfig({ type: 'js' });
    loader.setDRACOLoader(dracoLoader);

    loader.load(
      modelPath,
      (gltf) => {
        const model = gltf.scene;
        model.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            mesh.frustumCulled = true;
            if (mesh.material) {
              const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
              materials.forEach((mat) => {
                if ((mat as THREE.MeshStandardMaterial).isMeshStandardMaterial) {
                  (mat as THREE.MeshStandardMaterial).envMapIntensity = 0.5;
                }
              });
            }
          }
        });
        modelCache.set(modelPath, model);
        resolve(model.clone(true));
      },
      undefined,
      reject
    );
  });

  loadPromises.set(modelPath, promise);
  return promise;
}

// Preload default model
loadCarModel(DEFAULT_MODEL_PATH).catch(() => { });

// ---- Ghost System ----

export interface GhostFrame {
  x: number;
  z: number;
  r: number; // rotation
  t: number; // time
}

export function getGhostData(mapId: string): GhostFrame[] | null {
  try {
    const data = localStorage.getItem(`ghost_${mapId}`);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export function saveGhostData(mapId: string, frames: GhostFrame[]) {
  try {
    localStorage.setItem(`ghost_${mapId}`, JSON.stringify(frames));
  } catch {
    // Storage full
  }
}

class GhostRecorder {
  frames: GhostFrame[] = [];
  private interval = 1 / 12;
  private timer = 0;

  record(pos: THREE.Vector3, rotation: number, time: number, dt: number) {
    this.timer += dt;
    if (this.timer >= this.interval) {
      this.timer = 0;
      this.frames.push({
        x: Math.round(pos.x * 100) / 100,
        z: Math.round(pos.z * 100) / 100,
        r: Math.round(rotation * 1000) / 1000,
        t: Math.round(time * 1000) / 1000,
      });
    }
  }

  getData(): GhostFrame[] {
    return this.frames;
  }
}

class GhostReplayer {
  mesh: THREE.Group | null = null;
  private frames: GhostFrame[];
  private idx = 0;

  constructor(frames: GhostFrame[]) {
    this.frames = frames;
  }

  update(time: number) {
    if (!this.mesh || this.frames.length === 0) return;

    while (this.idx < this.frames.length - 1 && this.frames[this.idx + 1].t <= time) {
      this.idx++;
    }

    if (this.idx >= this.frames.length - 1) {
      const last = this.frames[this.frames.length - 1];
      this.mesh.position.set(last.x, 0, last.z);
      this.mesh.rotation.y = last.r;
      return;
    }

    const a = this.frames[this.idx];
    const b = this.frames[this.idx + 1];
    const frac = b.t === a.t ? 0 : (time - a.t) / (b.t - a.t);

    this.mesh.position.set(a.x + (b.x - a.x) * frac, 0, a.z + (b.z - a.z) * frac);

    let rd = b.r - a.r;
    while (rd > Math.PI) rd -= Math.PI * 2;
    while (rd < -Math.PI) rd += Math.PI * 2;
    this.mesh.rotation.y = a.r + rd * frac;
  }
}

// ---- CarPhysics ----

export class CarPhysics {
  position = new THREE.Vector3(0, 0.5, 0);
  velocity = new THREE.Vector3(0, 0, 0);
  acceleration = new THREE.Vector3(0, 0, 0);
  rotation = 0;
  speed = 0;

  maxSpeed = 200;
  accelerationPower = 60;
  brakePower = 80;
  friction = 0.98;
  handling = 2.2;

  private turnInput = 0;

  condition = 100;
  damageThreshold = 5;
  radius = 3.5;

  // Y-axis for ramps
  yVelocity = 0;
  grounded = true;
  private gravity = -25;

  update(deltaTime: number) {
    const absSpeed = Math.abs(this.speed);
    const speedFactor = Math.min(absSpeed / 30, 1) * 0.85 + 0.15;
    const turnDir = this.speed >= 0 ? 1 : -1;
    this.rotation -= this.turnInput * this.handling * deltaTime * speedFactor * turnDir;

    const frictionFactor = Math.pow(this.friction, deltaTime * 60);
    this.velocity.multiplyScalar(frictionFactor);
    this.velocity.addScaledVector(this.acceleration, deltaTime);

    const forwardDir = new THREE.Vector3(Math.sin(this.rotation), 0, Math.cos(this.rotation));
    this.speed = this.velocity.dot(forwardDir);

    const maxSpd = this.maxSpeed / 3.6;
    if (Math.abs(this.speed) > maxSpd) {
      this.velocity.normalize().multiplyScalar(maxSpd);
      this.speed = this.speed > 0 ? maxSpd : -maxSpd;
    }

    this.position.addScaledVector(this.velocity, deltaTime);

    // Y-axis physics (ramps / jumps)
    if (!this.grounded) {
      this.yVelocity += this.gravity * deltaTime;
      this.position.y += this.yVelocity * deltaTime;
      if (this.position.y <= 0.5) {
        this.position.y = 0.5;
        this.yVelocity = 0;
        this.grounded = true;
      }
    } else {
      this.position.y = 0.5;
    }
  }

  setInput(forward: number, turn: number) {
    const power = forward > 0 ? this.accelerationPower : this.brakePower;
    this.acceleration = new THREE.Vector3(
      Math.sin(this.rotation) * forward * power,
      0,
      Math.cos(this.rotation) * forward * power
    );
    this.turnInput = turn;
  }

  launch(upVelocity: number) {
    if (this.grounded) {
      this.yVelocity = upVelocity;
      this.grounded = false;
    }
  }

  takeDamage(amount: number = this.damageThreshold) {
    this.condition = Math.max(0, this.condition - amount);
  }

  getSpeedKmh(): number {
    return Math.abs(this.speed) * 3.6;
  }

  reset() {
    this.position = new THREE.Vector3(0, 0.5, 0);
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.acceleration = new THREE.Vector3(0, 0, 0);
    this.rotation = 0;
    this.speed = 0;
    this.turnInput = 0;
    this.yVelocity = 0;
    this.grounded = true;
  }
}

// ---- Bot AI ----

class BotCar {
  physics: CarPhysics;
  mesh: THREE.Group | null = null;
  nametag: THREE.Sprite | null = null;
  targetCheckpoint = 1;
  name: string;
  finished = false;
  finishTime = 0;

  private checkpoints: THREE.Vector3[];
  private roadWaypoints: THREE.Vector3[] = [];
  private currentWaypoint = 0;
  private offX: number;
  private offZ: number;
  private stuckTimer = 0;
  private lastPos = new THREE.Vector3();

  constructor(
    checkpoints: THREE.Vector3[],
    startPos: THREE.Vector3,
    startRotation: number,
    difficulty: number,
    name: string
  ) {
    this.physics = new CarPhysics();
    this.checkpoints = checkpoints;
    this.name = name;

    this.physics.position.copy(startPos);
    this.physics.position.y = 0.5;
    this.physics.rotation = startRotation;
    this.lastPos.copy(startPos);

    // Difficulty 0.5–1.0: good to great AI
    this.physics.maxSpeed = 180 + difficulty * 100; // 230–280 km/h
    this.physics.accelerationPower = 55 + difficulty * 30;  // 70–85
    this.physics.brakePower = 80 + difficulty * 30;
    this.physics.handling = 2.4 + difficulty * 0.6;  // 2.7–3.0
    this.physics.friction = 0.985;

    this.offX = (Math.random() - 0.5) * 3;
    this.offZ = (Math.random() - 0.5) * 3;

    this.buildRoadWaypoints();
  }

  private buildRoadWaypoints() {
    const waypointSpacing = 10; // dense waypoints for accurate path following
    for (let i = 0; i < this.checkpoints.length; i++) {
      const from = this.checkpoints[i];
      const to = this.checkpoints[(i + 1) % this.checkpoints.length];
      const dx = to.x - from.x;
      const dz = to.z - from.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      const steps = Math.max(1, Math.floor(dist / waypointSpacing));
      for (let s = 0; s < steps; s++) {
        const t = s / steps;
        this.roadWaypoints.push(new THREE.Vector3(
          from.x + dx * t,
          0,
          from.z + dz * t
        ));
      }
    }
    if (this.checkpoints.length > 0) {
      this.roadWaypoints.push(this.checkpoints[0].clone());
    }
  }

  update(deltaTime: number, raceTime: number) {
    if (this.finished) return;

    const totalWp = this.roadWaypoints.length;
    if (totalWp === 0) return;

    // Find closest waypoint within a search window
    let bestWp = this.currentWaypoint % totalWp;
    let bestDist = Infinity;
    const searchWindow = Math.min(totalWp, 16);
    for (let w = 0; w < searchWindow; w++) {
      const idx = (this.currentWaypoint + w) % totalWp;
      const wp = this.roadWaypoints[idx];
      const dx = wp.x - this.physics.position.x;
      const dz = wp.z - this.physics.position.z;
      const d = Math.sqrt(dx * dx + dz * dz);
      if (d < bestDist) {
        bestDist = d;
        bestWp = idx;
      }
    }

    // Look 5 waypoints ahead for smooth pre-steering
    const targetIdx = (bestWp + 5) % totalWp;
    const target = this.roadWaypoints[targetIdx];
    const tx = target.x + this.offX;
    const tz = target.z + this.offZ;

    const dx = tx - this.physics.position.x;
    const dz = tz - this.physics.position.z;

    const targetAngle = Math.atan2(dx, dz);
    let angleDiff = targetAngle - this.physics.rotation;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

    // Stronger steering clamp so AI can handle tight turns
    const turn = Math.max(-1, Math.min(1, angleDiff * 4.5));

    // Throttle: slow down on sharp turns, full gas on straights
    const absAngle = Math.abs(angleDiff);
    let forward = 1.0;
    if (absAngle > 0.6) forward = 0.5;       // sharp turn
    else if (absAngle > 0.3) forward = 0.75; // moderate turn

    this.physics.setInput(forward, turn);
    this.physics.update(deltaTime);

    // Advance waypoint when close (tighter radius = more precise)
    if (bestDist < 12) {
      this.currentWaypoint = (bestWp + 1) % totalWp;
    }

    // Stuck detection: if barely moved in 3s, nudge forward
    this.stuckTimer += deltaTime;
    if (this.stuckTimer > 3.0) {
      const moved = this.physics.position.distanceTo(this.lastPos);
      if (moved < 2) {
        // reverse a bit then accelerate
        this.physics.setInput(-1, turn * -0.5);
        this.physics.update(deltaTime);
      }
      this.stuckTimer = 0;
      this.lastPos.copy(this.physics.position);
    }

    // Checkpoint detection
    if (this.targetCheckpoint < this.checkpoints.length) {
      const cpTarget = this.checkpoints[this.targetCheckpoint];
      const cpDx = cpTarget.x - this.physics.position.x;
      const cpDz = cpTarget.z - this.physics.position.z;
      const cpDist = Math.sqrt(cpDx * cpDx + cpDz * cpDz);

      if (cpDist < 25) {
        this.targetCheckpoint++;
        if (this.targetCheckpoint >= this.checkpoints.length) {
          this.finished = true;
          this.finishTime = raceTime;
        }
        this.offX = (Math.random() - 0.5) * 3;
        this.offZ = (Math.random() - 0.5) * 3;
      }
    }

    if (this.mesh) {
      this.mesh.position.set(this.physics.position.x, 0, this.physics.position.z);
      this.mesh.rotation.y = this.physics.rotation;
    }
    if (this.nametag) {
      this.nametag.position.set(this.physics.position.x, 5, this.physics.position.z);
    }
  }
}

function createBotCarMesh(color: number): THREE.Group {
  const group = new THREE.Group();

  const bodyGeo = new THREE.BoxGeometry(2.4, 0.9, 5.5);
  const bodyMat = new THREE.MeshStandardMaterial({ color, metalness: 0.7, roughness: 0.2 });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 0.65;
  body.castShadow = true;
  group.add(body);

  const cockpitGeo = new THREE.BoxGeometry(1.8, 0.55, 2.2);
  const cockpitMat = new THREE.MeshStandardMaterial({ color: 0x111122, metalness: 0.3, roughness: 0.6 });
  const cockpit = new THREE.Mesh(cockpitGeo, cockpitMat);
  cockpit.position.set(0, 1.35, -0.3);
  cockpit.castShadow = true;
  group.add(cockpit);

  const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.28, 12);
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 });
  const wPos: [number, number, number][] = [
    [-1.2, 0.38, 2], [1.2, 0.38, 2], [-1.2, 0.38, -2], [1.2, 0.38, -2],
  ];
  for (const [x, y, z] of wPos) {
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.position.set(x, y, z);
    wheel.rotation.z = Math.PI / 2;
    group.add(wheel);
  }

  return group;
}

function createNametag(text: string, color: string = '#ffffff'): THREE.Sprite {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  canvas.width = 512;
  canvas.height = 128;

  // Background
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.roundRect(64, 32, 384, 64, 32);
  ctx.fill();

  // Text
  ctx.font = 'bold 48px Inter, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(text, 256, 64);

  const texture = new THREE.CanvasTexture(canvas);
  const spriteMaterial = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(spriteMaterial);
  sprite.scale.set(8, 2, 1);
  return sprite;
}

function createGhostCarMesh(): THREE.Group {
  const group = new THREE.Group();

  const bodyGeo = new THREE.BoxGeometry(2.4, 0.9, 5.5);
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x00ccff, transparent: true, opacity: 0.35,
    metalness: 0.5, roughness: 0.3,
  });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 0.65;
  group.add(body);

  const cockpitGeo = new THREE.BoxGeometry(1.8, 0.55, 2.2);
  const cockpitMat = new THREE.MeshStandardMaterial({
    color: 0x0088bb, transparent: true, opacity: 0.25,
  });
  const cockpit = new THREE.Mesh(cockpitGeo, cockpitMat);
  cockpit.position.set(0, 1.35, -0.3);
  group.add(cockpit);

  return group;
}

// ---- Procedural textures ----

function createAsphaltTexture(): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#2a2a2a';
  ctx.fillRect(0, 0, size, size);

  const imageData = ctx.getImageData(0, 0, size, size);
  for (let i = 0; i < imageData.data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 20;
    imageData.data[i] += noise;
    imageData.data[i + 1] += noise;
    imageData.data[i + 2] += noise;
  }
  ctx.putImageData(imageData, 0, 0);

  ctx.strokeStyle = '#FFD700';
  ctx.lineWidth = 4;
  ctx.setLineDash([40, 30]);
  ctx.beginPath();
  ctx.moveTo(size / 2, 0);
  ctx.lineTo(size / 2, size);
  ctx.stroke();

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(20, 0);
  ctx.lineTo(20, size);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(size - 20, 0);
  ctx.lineTo(size - 20, size);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(80, 80);
  return tex;
}

function createGrassTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#1a3d1a';
  ctx.fillRect(0, 0, size, size);

  const imageData = ctx.getImageData(0, 0, size, size);
  for (let i = 0; i < imageData.data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 25;
    imageData.data[i] += noise * 0.5;
    imageData.data[i + 1] += noise;
    imageData.data[i + 2] += noise * 0.3;
  }
  ctx.putImageData(imageData, 0, 0);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(200, 200);
  return tex;
}

function createBuildingTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#3a3a44';
  ctx.fillRect(0, 0, size, size);

  const windowCols = 4;
  const windowRows = 6;
  const ww = size / windowCols;
  const wh = size / windowRows;
  for (let r = 0; r < windowRows; r++) {
    for (let c = 0; c < windowCols; c++) {
      const lit = Math.random() > 0.4;
      ctx.fillStyle = lit ? '#ffeebb' : '#222230';
      const pad = 8;
      ctx.fillRect(c * ww + pad, r * wh + pad, ww - pad * 2, wh - pad * 2);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

// ---- Track building helpers ----

interface TrackSegment {
  from: THREE.Vector3;
  to: THREE.Vector3;
}

function buildRoadMesh(segments: TrackSegment[], roadWidth: number): THREE.Mesh {
  const shape: THREE.Vector3[] = [];
  const halfW = roadWidth / 2;

  for (const seg of segments) {
    const dir = new THREE.Vector3().subVectors(seg.to, seg.from).normalize();
    const perp = new THREE.Vector3(-dir.z, 0, dir.x);

    shape.push(
      new THREE.Vector3().copy(seg.from).addScaledVector(perp, -halfW),
      new THREE.Vector3().copy(seg.from).addScaledVector(perp, halfW),
      new THREE.Vector3().copy(seg.to).addScaledVector(perp, halfW),
      new THREE.Vector3().copy(seg.to).addScaledVector(perp, -halfW),
    );
  }

  const positions: number[] = [];
  const uvs: number[] = [];
  const normals: number[] = [];
  let uvOffset = 0;

  for (let i = 0; i < shape.length; i += 4) {
    const a = shape[i], b = shape[i + 1], c = shape[i + 2], d = shape[i + 3];
    const segLen = a.distanceTo(d);
    const uvLen = segLen / roadWidth;

    positions.push(a.x, 0.05, a.z, b.x, 0.05, b.z, c.x, 0.05, c.z);
    uvs.push(0, uvOffset, 1, uvOffset, 1, uvOffset + uvLen);
    normals.push(0, 1, 0, 0, 1, 0, 0, 1, 0);

    positions.push(a.x, 0.05, a.z, c.x, 0.05, c.z, d.x, 0.05, d.z);
    uvs.push(0, uvOffset, 1, uvOffset + uvLen, 0, uvOffset + uvLen);
    normals.push(0, 1, 0, 0, 1, 0, 0, 1, 0);

    uvOffset += uvLen;
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geom.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));

  const roadTex = createAsphaltTexture();
  roadTex.repeat.set(1, 1);
  roadTex.wrapS = THREE.RepeatWrapping;
  roadTex.wrapT = THREE.RepeatWrapping;

  const mat = new THREE.MeshStandardMaterial({
    map: roadTex,
    roughness: 0.85,
    metalness: 0.0,
  });

  const mesh = new THREE.Mesh(geom, mat);
  mesh.receiveShadow = true;
  return mesh;
}

// Distance from point to line segment in 2D
function distToSegment2D(
  px: number, pz: number,
  ax: number, az: number,
  bx: number, bz: number
): number {
  const abx = bx - ax;
  const abz = bz - az;
  const ab2 = abx * abx + abz * abz;
  if (ab2 < 0.001) {
    const dx = px - ax;
    const dz = pz - az;
    return Math.sqrt(dx * dx + dz * dz);
  }
  let t = ((px - ax) * abx + (pz - az) * abz) / ab2;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + abx * t;
  const cz = az + abz * t;
  const dx = px - cx;
  const dz = pz - cz;
  return Math.sqrt(dx * dx + dz * dz);
}

// ---- Race Options ----

export interface CarStats {
  maxSpeed?: number;        // km/h, e.g. 280
  acceleration?: number;   // 1-10 scale from DB
  handling?: number;       // 1-10 scale from DB
  durability?: number;     // 1-10 scale from DB
}

export interface RaceOptions {
  modelPath?: string;
  mode?: 'normal' | 'bots' | 'ghost';
  ghostData?: GhostFrame[];
  botCount?: number;
  carStats?: CarStats;
}

// ---- Main RaceScene ----

export class RaceScene {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  map: GameMap;
  playerCar: CarPhysics;
  checkpoints: THREE.Vector3[] = [];
  currentCheckpoint = 0;
  raceFinished = false;
  raceTime = 0;

  mode: string;
  bots: BotCar[] = [];
  ghostRecorder: GhostRecorder;

  private ghostReplayer: GhostReplayer | null = null;
  private carMesh: THREE.Group | null = null;
  private playerNametag: THREE.Sprite | null = null;
  private playerName: string = 'Player';
  private resizeHandler: () => void;
  // Fixed camera offsets — no dynamic zoom-out
  private readonly baseCameraZ = -18;
  private readonly baseCameraY = 7;
  private cameraOffset = new THREE.Vector3(0, 7, -18);
  private cameraLookOffset = new THREE.Vector3(0, 1.5, 0);
  private checkpointMeshes: THREE.Mesh[] = [];
  private collisionBoxes: THREE.Box3[] = [];
  private obstacleBoxes: THREE.Box3[] = [];
  private roadSegments: { fx: number; fz: number; tx: number; tz: number }[] = [];
  private rampZones: { x: number; z: number; radius: number }[] = [];
  private boostZones: { x: number; z: number; radius: number }[] = [];
  private modelPath: string;
  private smoothLookTarget = new THREE.Vector3();

  // F1-style countdown
  countdownTime = 5; // seconds remaining
  countdownActive = true;
  countdownLights = 0; // 0-5 lit lights

  onModelLoaded?: () => void;

  constructor(canvas: HTMLCanvasElement, map: GameMap, options?: RaceOptions) {
    this.map = map;
    this.mode = options?.mode || 'normal';
    this.modelPath = options?.modelPath || DEFAULT_MODEL_PATH;
    this.playerName = (map as any).playerName || 'Player'; // Assume injected for now or default
    this.ghostRecorder = new GhostRecorder();

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb);
    this.scene.fog = new THREE.FogExp2(0x87ceeb, 0.0008);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.5,
      5000
    );
    this.camera.position.set(0, 10, -20);

    this.setupLighting();
    this.createSkyDome();

    this.playerCar = new CarPhysics();

    // Apply car-specific stats from DB (acceleration 1-10 → physics power, maxSpeed in km/h)
    if (options?.carStats) {
      const s = options.carStats;
      if (s.maxSpeed && s.maxSpeed > 0) this.playerCar.maxSpeed = s.maxSpeed;
      if (s.acceleration && s.acceleration > 0) this.playerCar.accelerationPower = 30 + s.acceleration * 7; // 37–100
      if (s.handling && s.handling > 0) this.playerCar.handling = 1.0 + s.handling * 0.18; // 1.18–2.8
      if (s.durability && s.durability > 0) this.playerCar.damageThreshold = 3 + s.durability * 0.7;
      // Braking scales with acceleration
      this.playerCar.brakePower = this.playerCar.accelerationPower * 1.4;
    }

    this.checkpoints = map.checkpoints.map((cp: any) =>
      new THREE.Vector3(cp.x || 0, cp.y || 0, cp.z || 0)
    );

    // Build road segments for scenery awareness
    for (let i = 0; i < this.checkpoints.length; i++) {
      const from = this.checkpoints[i];
      const to = this.checkpoints[(i + 1) % this.checkpoints.length];
      this.roadSegments.push({ fx: from.x, fz: from.z, tx: to.x, tz: to.z });
    }

    this.buildWorld();

    if (this.checkpoints.length > 0) {
      this.playerCar.position.copy(this.checkpoints[0]);
      this.playerCar.position.y = 0.5;
      if (this.checkpoints.length > 1) {
        const dir = new THREE.Vector3().subVectors(this.checkpoints[1], this.checkpoints[0]);
        this.playerCar.rotation = Math.atan2(dir.x, dir.z);
      }
    }

    this.loadCarMesh();

    // Mode-specific setup — bots ONLY spawn in 'bots' mode
    if (this.mode === 'bots') {
      this.setupBots(options?.botCount || 4);
    } else if (this.mode === 'ghost' && options?.ghostData) {
      this.setupGhost(options.ghostData);
    }

    this.resizeHandler = () => this.onWindowResize();
    window.addEventListener('resize', this.resizeHandler);
  }

  private isNearRoad(x: number, z: number, minDist: number): boolean {
    for (const seg of this.roadSegments) {
      if (distToSegment2D(x, z, seg.fx, seg.fz, seg.tx, seg.tz) < minDist) {
        return true;
      }
    }
    return false;
  }

  private setupLighting() {
    const hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x3d5c3d, 0.6);
    this.scene.add(hemiLight);

    const sun = new THREE.DirectionalLight(0xfff5e6, 1.2);
    sun.position.set(200, 300, 150);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 1500;
    sun.shadow.camera.left = -500;
    sun.shadow.camera.right = 500;
    sun.shadow.camera.top = 500;
    sun.shadow.camera.bottom = -500;
    sun.shadow.bias = -0.0005;
    sun.shadow.normalBias = 0.02;
    this.scene.add(sun);
    this.scene.add(sun.target);

    const fill = new THREE.DirectionalLight(0xb4c8e0, 0.3);
    fill.position.set(-100, 50, -100);
    this.scene.add(fill);

    const ambient = new THREE.AmbientLight(0xffffff, 0.15);
    this.scene.add(ambient);
  }

  private createSkyDome() {
    const skyGeo = new THREE.SphereGeometry(2500, 32, 16);
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      uniforms: {
        topColor: { value: new THREE.Color(0x0055cc) },
        bottomColor: { value: new THREE.Color(0x87ceeb) },
        offset: { value: 20 },
        exponent: { value: 0.4 },
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        uniform float offset;
        uniform float exponent;
        varying vec3 vWorldPosition;
        void main() {
          float h = normalize(vWorldPosition + offset).y;
          gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
        }
      `,
    });
    const sky = new THREE.Mesh(skyGeo, skyMat);
    this.scene.add(sky);
  }

  private buildWorld() {
    // Ground
    const groundSize = 4000;
    const grassTex = createGrassTexture();
    const groundGeo = new THREE.PlaneGeometry(groundSize, groundSize);
    const groundMat = new THREE.MeshStandardMaterial({
      map: grassTex,
      roughness: 0.9,
      metalness: 0.0,
      color: 0x2d5a2d,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Road
    if (this.checkpoints.length > 1) {
      const segments: TrackSegment[] = [];
      for (let i = 0; i < this.checkpoints.length - 1; i++) {
        segments.push({ from: this.checkpoints[i], to: this.checkpoints[i + 1] });
      }
      segments.push({ from: this.checkpoints[this.checkpoints.length - 1], to: this.checkpoints[0] });

      const road = buildRoadMesh(segments, 24);
      this.scene.add(road);
    }

    // Checkpoint gates (no posts or streetlights on road)
    this.checkpoints.forEach((cp, i) => {
      const gateGeo = new THREE.BoxGeometry(26, 8, 1.5);
      const gateMat = new THREE.MeshStandardMaterial({
        color: i === 0 ? 0x00cc44 : 0x00aaff,
        metalness: 0.4,
        roughness: 0.3,
        transparent: true,
        opacity: 0.6,
      });
      const gate = new THREE.Mesh(gateGeo, gateMat);
      gate.position.set(cp.x, 4, cp.z);
      if (i < this.checkpoints.length - 1) {
        const dir = new THREE.Vector3().subVectors(this.checkpoints[i + 1], cp);
        gate.rotation.y = Math.atan2(dir.x, dir.z);
      }
      gate.castShadow = true;
      gate.receiveShadow = true;
      this.scene.add(gate);
      this.checkpointMeshes.push(gate);
    });

    // Obstacles
    if (this.map.obstacles) {
      this.map.obstacles.forEach((obs: any) => {
        const w = obs.w || 8;
        const h = obs.h || 6;
        const d = obs.d || 8;
        const geo = new THREE.BoxGeometry(w, h, d);
        const mat = new THREE.MeshStandardMaterial({
          color: 0xcc3333,
          metalness: 0.3,
          roughness: 0.6,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(obs.x || 0, h / 2, obs.z || 0);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.scene.add(mesh);

        const box = new THREE.Box3().setFromObject(mesh);
        this.obstacleBoxes.push(box);
      });
    }

    this.addScenery();
    this.addParcourElements();
  }

  private addScenery() {
    const buildingTex = createBuildingTexture();
    const rng = (min: number, max: number) => Math.random() * (max - min) + min;

    for (let i = 0; i < 80; i++) {
      const w = rng(10, 30);
      const h = rng(15, 60);
      const d = rng(10, 30);
      const x = rng(-800, 800);
      const z = rng(-800, 800);

      // Check distance to ALL road segments (not just checkpoints)
      if (this.isNearRoad(x, z, 35)) continue;

      const buildingGroup = new THREE.Group();
      const baseMat = new THREE.MeshStandardMaterial({
        map: buildingTex.clone(),
        roughness: 0.75,
        metalness: 0.15,
        color: new THREE.Color().setHSL(rng(0, 0.1), rng(0.02, 0.08), rng(0.3, 0.5)),
      });

      const buildingType = Math.random();

      if (buildingType < 0.3) {
        // Stepped/tapered building (narrower at top)
        const floors = Math.floor(rng(2, 4));
        let cw = w;
        let cd = d;
        let cy = 0;
        for (let f = 0; f < floors; f++) {
          const fh = h / floors;
          const geo = new THREE.BoxGeometry(cw, fh, cd);
          const mesh = new THREE.Mesh(geo, baseMat.clone());
          mesh.position.y = cy + fh / 2;
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          buildingGroup.add(mesh);
          cy += fh;
          cw *= 0.8;
          cd *= 0.8;
        }
      } else if (buildingType < 0.55) {
        // L-shaped building
        const geo1 = new THREE.BoxGeometry(w, h, d * 0.5);
        const mesh1 = new THREE.Mesh(geo1, baseMat.clone());
        mesh1.position.set(0, h / 2, d * 0.25);
        mesh1.castShadow = true;
        mesh1.receiveShadow = true;
        buildingGroup.add(mesh1);

        const h2 = h * rng(0.5, 0.8);
        const geo2 = new THREE.BoxGeometry(w * 0.5, h2, d);
        const mesh2 = new THREE.Mesh(geo2, baseMat.clone());
        mesh2.position.set(w * 0.25, h2 / 2, 0);
        mesh2.castShadow = true;
        mesh2.receiveShadow = true;
        buildingGroup.add(mesh2);
      } else if (buildingType < 0.75) {
        // Cylinder tower
        const geo = new THREE.CylinderGeometry(w * 0.4, w * 0.45, h, 12);
        const mesh = new THREE.Mesh(geo, baseMat.clone());
        mesh.position.y = h / 2;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        buildingGroup.add(mesh);

        // Dome top
        const domeGeo = new THREE.SphereGeometry(w * 0.42, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2);
        const domeMat = new THREE.MeshStandardMaterial({
          color: 0x445566, metalness: 0.4, roughness: 0.3,
        });
        const dome = new THREE.Mesh(domeGeo, domeMat);
        dome.position.y = h;
        dome.castShadow = true;
        buildingGroup.add(dome);
      } else {
        // Standard box with rooftop detail
        const geo = new THREE.BoxGeometry(w, h, d);
        const mesh = new THREE.Mesh(geo, baseMat.clone());
        mesh.position.y = h / 2;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        buildingGroup.add(mesh);

        // Rooftop structure (AC unit / antenna)
        if (Math.random() > 0.5) {
          const roofGeo = new THREE.BoxGeometry(w * 0.3, h * 0.1, d * 0.3);
          const roofMat = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.5, roughness: 0.5 });
          const roof = new THREE.Mesh(roofGeo, roofMat);
          roof.position.y = h + h * 0.05;
          roof.castShadow = true;
          buildingGroup.add(roof);
        }
      }

      buildingGroup.position.set(x, 0, z);
      this.scene.add(buildingGroup);

      // Compute collision box for the whole group
      const box = new THREE.Box3().setFromObject(buildingGroup);
      this.collisionBoxes.push(box);
    }

    // Decorative trees along the road (safe distance away)
    for (let i = 0; i < 80; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = rng(50, 400);
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;

      if (this.isNearRoad(x, z, 20)) continue;

      // Tree trunk
      const trunkGeo = new THREE.CylinderGeometry(0.3, 0.5, 4, 6);
      const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c3d1a, roughness: 0.9 });
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.set(x, 2, z);
      trunk.castShadow = true;
      this.scene.add(trunk);

      // Tree crown - use cone for variety
      const isCone = Math.random() > 0.5;
      const crownSize = rng(2, 4);
      const crownGeo = isCone
        ? new THREE.ConeGeometry(crownSize, crownSize * 2, 6)
        : new THREE.SphereGeometry(crownSize, 8, 6);
      const crownMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(0.28 + rng(-0.05, 0.05), 0.6, rng(0.2, 0.35)),
        roughness: 0.9,
      });
      const crown = new THREE.Mesh(crownGeo, crownMat);
      crown.position.set(x, isCone ? 5.5 + rng(0, 1) : 5 + rng(0, 1), z);
      crown.castShadow = true;
      this.scene.add(crown);
    }

    // Streetlights along road edges
    for (let i = 0; i < this.roadSegments.length; i++) {
      const seg = this.roadSegments[i];
      const dx = seg.tx - seg.fx;
      const dz = seg.tz - seg.fz;
      const segLen = Math.sqrt(dx * dx + dz * dz);
      const perpX = -dz / segLen;
      const perpZ = dx / segLen;

      const spacing = 60;
      const count = Math.floor(segLen / spacing);
      for (let j = 1; j < count; j++) {
        const t = j / count;
        const sx = seg.fx + dx * t;
        const sz = seg.fz + dz * t;
        const side = j % 2 === 0 ? 1 : -1;
        const lx = sx + perpX * side * 14;
        const lz = sz + perpZ * side * 14;

        // Pole
        const poleGeo = new THREE.CylinderGeometry(0.15, 0.15, 6, 6);
        const poleMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.6, roughness: 0.3 });
        const pole = new THREE.Mesh(poleGeo, poleMat);
        pole.position.set(lx, 3, lz);
        this.scene.add(pole);

        // Light bulb
        const lightGeo = new THREE.SphereGeometry(0.4, 6, 6);
        const lightMat = new THREE.MeshBasicMaterial({ color: 0xffee88 });
        const light = new THREE.Mesh(lightGeo, lightMat);
        light.position.set(lx, 6.2, lz);
        this.scene.add(light);
      }
    }
  }

  private addParcourElements() {
    for (let i = 0; i < this.roadSegments.length; i++) {
      const seg = this.roadSegments[i];
      const dx = seg.tx - seg.fx;
      const dz = seg.tz - seg.fz;
      const segLen = Math.sqrt(dx * dx + dz * dz);
      const angle = Math.atan2(dx, dz);

      // Ramps on long straight segments
      if (segLen > 150) {
        const midX = (seg.fx + seg.tx) / 2;
        const midZ = (seg.fz + seg.tz) / 2;
        this.createRamp(midX, midZ, angle);
      }

      // Speed boosts - more frequent: every segment over 60 units
      if (segLen > 60) {
        const t = 0.5;
        const bx = seg.fx + dx * t;
        const bz = seg.fz + dz * t;
        this.createSpeedBoost(bx, bz, angle);
      }

      // Extra boost at 25% into longer segments
      if (segLen > 120) {
        const t2 = 0.25;
        const bx2 = seg.fx + dx * t2;
        const bz2 = seg.fz + dz * t2;
        this.createSpeedBoost(bx2, bz2, angle);
      }
    }
  }

  private createRamp(x: number, z: number, angle: number) {
    // Ramp base
    const rampGeo = new THREE.BoxGeometry(12, 2, 10);
    const rampMat = new THREE.MeshStandardMaterial({
      color: 0xff6600, metalness: 0.4, roughness: 0.5,
    });
    const ramp = new THREE.Mesh(rampGeo, rampMat);
    ramp.position.set(x, 1, z);
    ramp.rotation.y = angle;
    ramp.castShadow = true;
    ramp.receiveShadow = true;
    this.scene.add(ramp);

    // Side rails
    const dirX = Math.sin(angle);
    const dirZ = Math.cos(angle);
    const perpX = dirZ;
    const perpZ = -dirX;

    for (const side of [-1, 1]) {
      const railGeo = new THREE.BoxGeometry(0.5, 2.5, 10);
      const railMat = new THREE.MeshStandardMaterial({ color: 0xff8800, metalness: 0.5, roughness: 0.4 });
      const rail = new THREE.Mesh(railGeo, railMat);
      rail.position.set(x + perpX * side * 6.5, 1.5, z + perpZ * side * 6.5);
      rail.rotation.y = angle;
      rail.castShadow = true;
      this.scene.add(rail);
    }

    // Chevron arrows above ramp
    const arrowMat = new THREE.MeshBasicMaterial({ color: 0xffcc00 });
    for (let j = -1; j <= 1; j++) {
      const arrowGeo = new THREE.ConeGeometry(0.8, 1.5, 4);
      const arrow = new THREE.Mesh(arrowGeo, arrowMat);
      arrow.position.set(
        x + perpX * j * 3 + dirX * (-6),
        4,
        z + perpZ * j * 3 + dirZ * (-6)
      );
      arrow.rotation.x = -Math.PI / 2;
      arrow.rotation.z = -angle;
      this.scene.add(arrow);
    }

    this.rampZones.push({ x, z, radius: 8 });
  }

  private createSpeedBoost(x: number, z: number, angle: number) {
    // Glowing pad on ground
    const boostGeo = new THREE.PlaneGeometry(10, 12);
    const boostMat = new THREE.MeshBasicMaterial({
      color: 0x00ff88, transparent: true, opacity: 0.5, side: THREE.DoubleSide,
    });
    const boost = new THREE.Mesh(boostGeo, boostMat);
    boost.position.set(x, 0.08, z);
    boost.rotation.x = -Math.PI / 2;
    this.scene.add(boost);

    // Arrow indicators
    const dirX = Math.sin(angle);
    const dirZ = Math.cos(angle);
    const arrowGeo = new THREE.ConeGeometry(0.6, 1.2, 4);
    const arrowMat = new THREE.MeshBasicMaterial({ color: 0x00ffaa, transparent: true, opacity: 0.7 });
    for (let j = -2; j <= 2; j += 2) {
      const arrow = new THREE.Mesh(arrowGeo, arrowMat);
      arrow.position.set(x + dirX * j, 0.5, z + dirZ * j);
      arrow.rotation.x = -Math.PI / 2;
      arrow.rotation.z = -angle;
      this.scene.add(arrow);
    }

    this.boostZones.push({ x, z, radius: 7 });
  }

  private setupBots(count: number) {
    const names = ['Red Bull', 'Blue Flash', 'Gold Rush', 'Purple Rain', 'Cyan Storm', 'Orange Fury'];
    const botModels = [
      '/models/bmw_m4.glb',
      '/models/lamborghini_huracan.glb',
      '/models/mercedes_amg_one.glb',
      '/models/mercedes_amg_gt_black_series.glb',
      '/models/porsche_gt3_rs.glb',
      '/models/bmw_m4.glb',
    ];
    const startPos = this.checkpoints.length > 0 ? this.checkpoints[0] : new THREE.Vector3();
    const startRot = this.playerCar.rotation;

    for (let i = 0; i < Math.min(count, 6); i++) {
      const difficulty = 0.4 + Math.random() * 0.5;
      const bot = new BotCar(this.checkpoints, startPos, startRot, difficulty, names[i]);
      // Offset starting positions to avoid overlap
      bot.physics.position.x += (i + 1) * 5 * ((i % 2 === 0) ? 1 : -1);
      bot.physics.position.z -= (i + 1) * 3;

      // Load real GLB model for bot (fallback to box mesh)
      const modelPath = botModels[i % botModels.length];
      loadCarModel(modelPath).then((model) => {
        model.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(model);
        const size = new THREE.Vector3();
        box.getSize(size);
        const maxDim = Math.max(size.x, size.y, size.z);

        if (maxDim > 0) {
          const targetSize = 8;
          const scale = targetSize / maxDim;
          model.scale.setScalar(scale);
          model.updateMatrixWorld(true);
        }

        box.setFromObject(model);
        const center = new THREE.Vector3();
        box.getCenter(center);
        model.position.sub(center);
        model.position.y = box.min.y < 0 ? Math.abs(box.min.y) : -box.min.y;

        const carGroup = new THREE.Group();
        carGroup.add(model);

        bot.mesh = carGroup;
        this.scene.add(carGroup);
      }).catch(() => {
        // Fallback: box mesh
        const colors = [0xff2222, 0x2222ff, 0xffff22, 0xff22ff, 0x22ffff, 0xff8800];
        const mesh = createBotCarMesh(colors[i % colors.length]);
        bot.mesh = mesh;
        this.scene.add(mesh);
      });

      // Add nametag
      const nametag = createNametag(bot.name, '#ffaa00');
      bot.nametag = nametag;
      this.scene.add(nametag);

      this.bots.push(bot);
    }
  }

  private setupGhost(ghostData: GhostFrame[]) {
    this.ghostReplayer = new GhostReplayer(ghostData);
    const ghostMesh = createGhostCarMesh();
    this.ghostReplayer.mesh = ghostMesh;
    this.scene.add(ghostMesh);
  }

  private async loadCarMesh() {
    try {
      const model = await loadCarModel(this.modelPath);
      model.updateMatrixWorld(true);

      const box = new THREE.Box3().setFromObject(model);
      const size = new THREE.Vector3();
      box.getSize(size);
      const maxDim = Math.max(size.x, size.y, size.z);

      if (maxDim > 0) {
        const targetSize = 8;
        const scale = targetSize / maxDim;
        model.scale.setScalar(scale);
        model.updateMatrixWorld(true);
      }

      box.setFromObject(model);
      const center = new THREE.Vector3();
      box.getCenter(center);
      model.position.sub(center);
      model.position.y = box.min.y < 0 ? Math.abs(box.min.y) : -box.min.y;
      const carGroup = new THREE.Group();
      carGroup.add(model);
      carGroup.userData.isPlayerCar = true;

      this.carMesh = carGroup;
      this.scene.add(carGroup);

      // Add player nametag
      this.playerNametag = createNametag(this.playerName, '#4a9eff');
      this.scene.add(this.playerNametag);

      if (this.onModelLoaded) this.onModelLoaded();
    } catch (err) {
      console.error('Failed to load car model, using fallback box:', err);
      const group = new THREE.Group();
      const bodyGeo = new THREE.BoxGeometry(2.4, 1, 5);
      const bodyMat = new THREE.MeshStandardMaterial({ color: 0xff6600, metalness: 0.6, roughness: 0.3 });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.position.y = 0.5;
      body.castShadow = true;
      group.add(body);
      group.userData.isPlayerCar = true;
      this.carMesh = group;
      this.scene.add(group);

      // Add player nametag fallback
      this.playerNametag = createNametag(this.playerName, '#4a9eff');
      this.scene.add(this.playerNametag);
    }
  }

  update(deltaTime: number, playerInput: { forward: number; turn: number }) {
    // F1 countdown logic
    if (this.countdownActive) {
      this.countdownTime -= deltaTime;
      // Light up one light per second: 5 lights in 5 seconds
      this.countdownLights = Math.min(5, Math.max(0, Math.floor(5 - this.countdownTime)));

      if (this.countdownTime <= 0) {
        this.countdownActive = false;
        this.countdownLights = 0; // All lights off = GO!
      }

      // During countdown, don't accept input, still render
      this.playerCar.setInput(0, 0);
      this.playerCar.update(deltaTime);

      // Update car mesh position
      if (this.carMesh) {
        const carPos = this.playerCar.position;
        this.carMesh.position.set(carPos.x, carPos.y - 0.5, carPos.z);
        this.carMesh.rotation.y = this.playerCar.rotation;
      }

      // Camera during countdown
      const carPos = this.playerCar.position;
      const camCos = Math.cos(this.playerCar.rotation);
      const camSin = Math.sin(this.playerCar.rotation);
      const camTargetPos = new THREE.Vector3(
        carPos.x + this.cameraOffset.z * camSin + this.cameraOffset.x * camCos,
        carPos.y + this.cameraOffset.y,
        carPos.z + this.cameraOffset.z * camCos - this.cameraOffset.x * camSin
      );
      this.camera.position.copy(camTargetPos);
      const lookTarget = new THREE.Vector3(
        carPos.x + this.cameraLookOffset.x,
        carPos.y + this.cameraLookOffset.y,
        carPos.z + this.cameraLookOffset.z
      );
      this.smoothLookTarget.copy(lookTarget);
      this.camera.lookAt(this.smoothLookTarget);

      this.renderer.render(this.scene, this.camera);
      return;
    }

    if (!this.raceFinished) {
      this.raceTime += deltaTime;
    }

    this.playerCar.setInput(playerInput.forward, playerInput.turn);
    this.playerCar.update(deltaTime);

    // Record ghost data
    this.ghostRecorder.record(
      this.playerCar.position,
      this.playerCar.rotation,
      this.raceTime,
      deltaTime
    );

    const carPos = this.playerCar.position;
    const carRadius = this.playerCar.radius;

    // Collision with buildings/obstacles
    const allBoxes = [...this.collisionBoxes, ...this.obstacleBoxes];
    for (const box of allBoxes) {
      const closest = new THREE.Vector3();
      box.clampPoint(carPos, closest);
      closest.y = carPos.y;
      const dist = carPos.distanceTo(closest);
      if (dist < carRadius) {
        const pushDir = new THREE.Vector3().subVectors(carPos, closest);
        if (pushDir.length() < 0.001) pushDir.set(0, 0, 1);
        pushDir.normalize();
        carPos.addScaledVector(pushDir, carRadius - dist + 0.1);

        const dot = this.playerCar.velocity.dot(pushDir);
        if (dot < 0) {
          this.playerCar.velocity.addScaledVector(pushDir, -dot * 1.3);
          if (Math.abs(dot) > 5) {
            this.playerCar.takeDamage(Math.abs(dot) * 0.5);
          }
        }
      }
    }

    // Ramp zones - launch car upward
    if (this.playerCar.grounded) {
      for (const ramp of this.rampZones) {
        const dx = carPos.x - ramp.x;
        const dz = carPos.z - ramp.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist < ramp.radius && this.playerCar.getSpeedKmh() > 40) {
          this.playerCar.launch(12);
          break;
        }
      }
    }

    // Speed boost zones
    for (const boost of this.boostZones) {
      const dx = carPos.x - boost.x;
      const dz = carPos.z - boost.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < boost.radius) {
        const forward = new THREE.Vector3(
          Math.sin(this.playerCar.rotation), 0, Math.cos(this.playerCar.rotation)
        );
        this.playerCar.velocity.addScaledVector(forward, 30 * deltaTime);
      }
    }

    // Update car mesh (including Y position for jumps)
    if (this.carMesh) {
      this.carMesh.position.set(carPos.x, carPos.y - 0.5, carPos.z);
      this.carMesh.rotation.y = this.playerCar.rotation;
    }

    if (this.playerNametag) {
      this.playerNametag.position.set(carPos.x, 5, carPos.z);
    }

    // Checkpoint detection
    if (this.currentCheckpoint < this.checkpoints.length && !this.raceFinished) {
      const cpDist = new THREE.Vector2(
        carPos.x - this.checkpoints[this.currentCheckpoint].x,
        carPos.z - this.checkpoints[this.currentCheckpoint].z
      ).length();

      if (cpDist < 18) {
        if (this.checkpointMeshes[this.currentCheckpoint]) {
          (this.checkpointMeshes[this.currentCheckpoint].material as THREE.MeshStandardMaterial).color.setHex(0x44ff44);
          (this.checkpointMeshes[this.currentCheckpoint].material as THREE.MeshStandardMaterial).opacity = 0.3;
        }
        this.currentCheckpoint++;
        if (this.currentCheckpoint >= this.checkpoints.length) {
          this.raceFinished = true;
        }
      }
    }

    // Update bots
    for (const bot of this.bots) {
      bot.update(deltaTime, this.raceTime);
    }

    // Update ghost replayer
    if (this.ghostReplayer) {
      this.ghostReplayer.update(this.raceTime);
    }

    // Camera: copy exact position every frame — no drift, no zoom-out, always steady
    const cos = Math.cos(this.playerCar.rotation);
    const sin = Math.sin(this.playerCar.rotation);

    const camTargetX = carPos.x + this.baseCameraZ * sin;
    const camTargetY = carPos.y + this.baseCameraY;
    const camTargetZ = carPos.z + this.baseCameraZ * cos;

    // Directly copy — camera is always at the exact right spot, no drift possible
    this.camera.position.set(camTargetX, camTargetY, camTargetZ);

    // Smooth look-at target slightly to prevent micro-jitter
    const lookTarget = new THREE.Vector3(
      carPos.x,
      carPos.y + 1.5,
      carPos.z
    );
    this.smoothLookTarget.lerp(lookTarget, 0.2);
    this.camera.lookAt(this.smoothLookTarget);

    this.renderer.render(this.scene, this.camera);
  }

  getPlayerPosition(): number {
    if (this.bots.length === 0) return 1;
    let position = 1;
    for (const bot of this.bots) {
      if (bot.finished && !this.raceFinished) {
        position++;
      } else if (!bot.finished && !this.raceFinished) {
        if (bot.targetCheckpoint > this.currentCheckpoint) {
          position++;
        }
      }
    }
    return position;
  }

  private onWindowResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  dispose() {
    window.removeEventListener('resize', this.resizeHandler);

    this.scene.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        mesh.geometry?.dispose();
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        materials.forEach(m => {
          if ((m as THREE.MeshStandardMaterial).map) {
            (m as THREE.MeshStandardMaterial).map!.dispose();
          }
          m.dispose();
        });
      }
    });

    this.renderer.dispose();
    this.scene.clear();
  }
}

// ---- Landing page 3D scene (multi-car showcase) ----

const LANDING_MODELS = [
  '/models/porsche_gt3_rs.glb',
  '/models/lamborghini_huracan.glb',
  '/models/bmw_m4.glb',
];

export class LandingScene {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  private resizeHandler: () => void;
  private animationId = 0;
  private time = 0;
  private disposed = false;
  private currentCarGroup: THREE.Group | null = null;
  private loadedModels: THREE.Group[] = [];
  private currentModelIdx = 0;
  private switchTimer = 0;
  private switchInterval = 6;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a0f);

    this.camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    this.camera.position.set(6, 3, 8);
    this.camera.lookAt(0, 0.5, 0);

    this.setupLighting();
    this.setupScene();
    this.loadCars();

    this.resizeHandler = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    };
    window.addEventListener('resize', this.resizeHandler);

    this.animate();
  }

  private setupLighting() {
    const key = new THREE.SpotLight(0xffffff, 30);
    key.position.set(5, 8, 5);
    key.angle = 0.5;
    key.penumbra = 0.5;
    key.castShadow = true;
    key.shadow.mapSize.width = 1024;
    key.shadow.mapSize.height = 1024;
    this.scene.add(key);

    const fill = new THREE.SpotLight(0x4488ff, 15);
    fill.position.set(-5, 4, -3);
    fill.angle = 0.6;
    fill.penumbra = 0.8;
    this.scene.add(fill);

    const rim = new THREE.SpotLight(0xff4400, 10);
    rim.position.set(0, 3, -6);
    rim.angle = 0.7;
    rim.penumbra = 0.5;
    this.scene.add(rim);

    const ambient = new THREE.AmbientLight(0x111122, 1);
    this.scene.add(ambient);
  }

  private setupScene() {
    const groundGeo = new THREE.PlaneGeometry(50, 50);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x111115,
      roughness: 0.15,
      metalness: 0.8,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    const gridHelper = new THREE.GridHelper(30, 60, 0x222233, 0x111122);
    gridHelper.position.y = 0.01;
    (gridHelper.material as THREE.Material).transparent = true;
    (gridHelper.material as THREE.Material).opacity = 0.3;
    this.scene.add(gridHelper);
  }

  private async loadCars() {
    for (let i = 0; i < LANDING_MODELS.length; i++) {
      try {
        const model = await loadCarModel(LANDING_MODELS[i]);
        const scaled = this.scaleAndCenterModel(model);
        this.loadedModels.push(scaled);

        // Show first car immediately
        if (i === 0 && !this.disposed) {
          this.currentCarGroup = scaled;
          this.scene.add(scaled);
        }
      } catch (err) {
        console.error('Landing: Failed to load car model:', LANDING_MODELS[i], err);
      }
    }
  }

  private scaleAndCenterModel(model: THREE.Group): THREE.Group {
    model.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);

    if (maxDim > 0) {
      const targetSize = 7;
      const scale = targetSize / maxDim;
      model.scale.setScalar(scale);
      model.updateMatrixWorld(true);
    }

    box.setFromObject(model);
    const center = new THREE.Vector3();
    box.getCenter(center);
    model.position.sub(center);
    model.position.y = box.min.y < 0 ? Math.abs(box.min.y) : -box.min.y;

    const carGroup = new THREE.Group();
    carGroup.add(model);
    return carGroup;
  }

  private switchCar() {
    if (this.loadedModels.length <= 1 || this.disposed) return;

    // Remove current
    if (this.currentCarGroup) {
      this.scene.remove(this.currentCarGroup);
    }

    // Next model
    this.currentModelIdx = (this.currentModelIdx + 1) % this.loadedModels.length;
    this.currentCarGroup = this.loadedModels[this.currentModelIdx];
    this.scene.add(this.currentCarGroup);
  }

  private animate() {
    if (this.disposed) return;
    this.animationId = requestAnimationFrame(() => this.animate());

    this.time += 0.005;
    this.switchTimer += 0.005;

    if (this.switchTimer >= this.switchInterval * 0.005 * 60) {
      this.switchTimer = 0;
      this.switchCar();
    }

    const radius = 10;
    this.camera.position.x = Math.cos(this.time) * radius;
    this.camera.position.z = Math.sin(this.time) * radius;
    this.camera.position.y = 3 + Math.sin(this.time * 0.5) * 0.5;
    this.camera.lookAt(0, 0.8, 0);

    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.animationId);
    window.removeEventListener('resize', this.resizeHandler);

    this.scene.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        mesh.geometry?.dispose();
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        materials.forEach(m => {
          if ((m as THREE.MeshStandardMaterial).map) {
            (m as THREE.MeshStandardMaterial).map!.dispose();
          }
          m.dispose();
        });
      }
    });

    this.renderer.dispose();
    this.scene.clear();
  }
}

// ---- Garage 3D Preview Scene ----

export class GarageScene {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  private resizeHandler: () => void;
  private animationId = 0;
  private time = 0;
  private disposed = false;
  private currentCarGroup: THREE.Group | null = null;
  private platform: THREE.Group;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(
      45,
      canvas.clientWidth / canvas.clientHeight,
      0.1,
      100
    );
    this.camera.position.set(6, 3, 6);
    this.camera.lookAt(0, 0.5, 0);

    this.platform = new THREE.Group();
    this.scene.add(this.platform);

    this.setupLighting();
    this.setupPlatform();

    this.resizeHandler = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    };
    window.addEventListener('resize', this.resizeHandler);

    this.animate();
  }

  private setupLighting() {
    const key = new THREE.SpotLight(0xffffff, 40);
    key.position.set(0, 8, 5);
    key.angle = 0.6;
    key.penumbra = 0.8;
    key.castShadow = true;
    key.shadow.mapSize.width = 1024;
    key.shadow.mapSize.height = 1024;
    this.scene.add(key);

    const fill = new THREE.SpotLight(0xddddff, 20);
    fill.position.set(-5, 4, -4);
    fill.angle = 0.8;
    fill.penumbra = 0.5;
    this.scene.add(fill);

    const rim = new THREE.SpotLight(0xffaa55, 10);
    rim.position.set(5, 2, -6);
    rim.angle = 0.8;
    rim.penumbra = 0.5;
    this.scene.add(rim);

    const ambient = new THREE.AmbientLight(0x222233, 1.5);
    this.scene.add(ambient);
  }

  private setupPlatform() {
    // Platform removed to allow global background to show cleanly
  }

  public async setCarModel(modelPath: string) {
    if (this.currentCarGroup) {
      this.scene.remove(this.currentCarGroup);
      this.currentCarGroup = null;
    }

    try {
      const model = await loadCarModel(modelPath);
      model.updateMatrixWorld(true);

      const box = new THREE.Box3().setFromObject(model);
      const size = new THREE.Vector3();
      box.getSize(size);
      const maxDim = Math.max(size.x, size.y, size.z);

      if (maxDim > 0) {
        const targetSize = 6.5;
        const scale = targetSize / maxDim;
        model.scale.setScalar(scale);
        model.updateMatrixWorld(true);
      }

      box.setFromObject(model);
      const center = new THREE.Vector3();
      box.getCenter(center);
      model.position.sub(center);
      model.position.y = box.min.y < 0 ? Math.abs(box.min.y) : -box.min.y;

      const group = new THREE.Group();
      group.add(model);

      this.currentCarGroup = group;
      this.scene.add(group);
    } catch (err) {
      console.error('GarageScene: Failed to load car model', err);
    }
  }

  private animate() {
    if (this.disposed) return;
    this.animationId = requestAnimationFrame(() => this.animate());

    this.time += 0.01;

    // Slow rotation of camera around the car
    const radius = 9;
    this.camera.position.x = Math.cos(this.time * 0.5) * radius;
    this.camera.position.z = Math.sin(this.time * 0.5) * radius;
    this.camera.position.y = 2.5 + Math.sin(this.time * 0.8) * 0.5;
    this.camera.lookAt(0, 0.8, 0);

    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.animationId);
    window.removeEventListener('resize', this.resizeHandler);

    this.scene.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        mesh.geometry?.dispose();
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        materials.forEach(m => {
          if ((m as THREE.MeshStandardMaterial).map) {
            (m as THREE.MeshStandardMaterial).map!.dispose();
          }
          m.dispose();
        });
      }
    });

    this.renderer.dispose();
    this.scene.clear();
  }
}
