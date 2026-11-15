import { ROLLER_RADIUS_M } from "../lib/dynoGeometry";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { SimSnapshot } from "../lib/physics";
import type { GraphicsQuality } from "../lib/store";
import type { Vehicle } from "../lib/vehicles";

export type CameraPreset = "cinematic" | "front" | "rear" | "side" | "engine" | "cockpit" | "cluster";

export const CAMERA_LABELS: { id: CameraPreset; label: string }[] = [
  { id: "cinematic", label: "Cinematic" },
  { id: "front", label: "Front" },
  { id: "rear", label: "Rear" },
  { id: "side", label: "Side" },
  { id: "engine", label: "Engine bay" },
  { id: "cockpit", label: "Cockpit" },
  { id: "cluster", label: "Cluster" },
];

interface CarSceneProps {
  vehicle: Vehicle;
  state: SimSnapshot;
  camera: CameraPreset;
  cameraNonce: number;
  mode?: "dyno" | "studio";
  graphics: GraphicsQuality;
  headlights?: boolean;
  paintIndex?: number;
}

const ROLLER_R = ROLLER_RADIUS_M;

export default function CarScene({ vehicle, state, camera, cameraNonce, mode = "dyno", graphics, headlights = true, paintIndex = 0 }: CarSceneProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<SceneApi | null>(null);
  const stateRef = useRef(state);
  const [failed, setFailed] = useState(false);
  stateRef.current = state;

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    let api: SceneApi | null = null;
    try {
      api = createScene(mount, vehicle, mode, graphics, paintIndex, headlights);
      apiRef.current = api;
      api.setCamera(camera, true);
    } catch (error) {
      console.error("REALSHIFT 3D init failed", error);
      setFailed(true);
    }
    return () => {
      api?.dispose();
      apiRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicle.id, mode, graphics, paintIndex]);

  useEffect(() => {
    apiRef.current?.setCamera(camera, false);
  }, [camera, cameraNonce]);

  useEffect(() => {
    apiRef.current?.setHeadlights(headlights);
  }, [headlights]);

  useEffect(() => {
    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      apiRef.current?.update(stateRef.current);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#090c0b]">
      <div ref={mountRef} className="h-full w-full" />
      {failed && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[radial-gradient(circle_at_50%_30%,#19201b,#080a09)] p-6 text-center">
          <p className="font-mono text-[11px] tracking-[0.2em] text-[#c9f460]">WEBGL UNAVAILABLE</p>
          <p className="max-w-xs text-xs text-[#8b948c]">This device could not start the 3D renderer. All dyno telemetry and engine controls remain fully functional.</p>
        </div>
      )}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(0,0,0,0.45))]" />
    </div>
  );
}

interface SceneApi {
  dispose: () => void;
  setCamera: (preset: CameraPreset, instant: boolean) => void;
  setHeadlights: (on: boolean) => void;
  update: (state: SimSnapshot) => void;
}

function createScene(
  mount: HTMLDivElement,
  vehicle: Vehicle,
  mode: "dyno" | "studio",
  quality: GraphicsQuality,
  paintIndex: number,
  headlights: boolean,
): SceneApi {
  const renderer = new THREE.WebGLRenderer({ antialias: quality !== "performance", alpha: false, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, quality === "high" ? 2 : quality === "balanced" ? 1.5 : 1));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.16;
  renderer.shadowMap.enabled = quality !== "performance";
  renderer.shadowMap.type = THREE.PCFShadowMap;
  mount.appendChild(renderer.domElement);
  renderer.domElement.style.width = "100%";
  renderer.domElement.style.height = "100%";
  renderer.domElement.style.display = "block";

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(mode === "studio" ? "#0d1110" : "#0a0d0c");
  scene.fog = new THREE.FogExp2(mode === "studio" ? 0x0d1110 : 0x0a0d0c, 0.032);

  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 90);
  camera.position.set(6, 2.4, 6.6);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.minDistance = 2.2;
  controls.maxDistance = 15;
  controls.maxPolarAngle = Math.PI / 2 - 0.045;
  controls.target.set(0, 0.8, 0);
  controls.enablePan = false;

  const env = makeEnvironmentTexture();
  scene.environment = env;
  scene.environmentIntensity = 0.7;

  const hemi = new THREE.HemisphereLight(0xd7ecd9, 0x1b201b, 0.95);
  scene.add(hemi);
  const key = new THREE.SpotLight(0xfff3dc, 340, 28, 0.66, 0.55, 1.7);
  key.position.set(2.4, 7.6, 3.2);
  key.target.position.set(0, 0.4, 0);
  if (quality !== "performance") {
    key.castShadow = true;
    key.shadow.mapSize.set(quality === "high" ? 2048 : 1024, quality === "high" ? 2048 : 1024);
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.02;
  }
  scene.add(key, key.target);
  const rim = new THREE.SpotLight(0xbcd7ff, 180, 24, 0.7, 0.6, 1.6);
  rim.position.set(-4.2, 5.4, -4.6);
  rim.target.position.set(0, 0.8, 0);
  scene.add(rim, rim.target);
  const fill = new THREE.PointLight(0xd9ffe0, 22, 16, 2);
  fill.position.set(3, 2.4, -4);
  scene.add(fill);
  const front = new THREE.PointLight(0xffe9cf, 22, 12, 2);
  front.position.set(4.5, 2.1, 2.8);
  scene.add(front);
  const workLamp = new THREE.SpotLight(0xf2ffe0, 90, 16, 0.75, 0.5, 1.5);
  workLamp.position.set(-3.6, 4.4, 3.2);
  workLamp.target.position.set(0, 0.5, 0);
  scene.add(workLamp, workLamp.target);

  const room = buildRoom(vehicle, mode, quality);
  scene.add(room.group);

  const carBaseY = mode === "dyno" ? ROLLER_R + 0.02 : 0.02;
  const car = buildCar(vehicle, paintIndex, quality, carBaseY);
  car.group.position.y = carBaseY;
  scene.add(car.group);

  let exhaustTimer = 0;
  const particles: { mesh: THREE.Mesh; life: number; vy: number; vz: number }[] = [];
  if (mode === "dyno") {
    for (let i = 0; i < 10; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: 0xa8b0a8, transparent: true, opacity: 0, depthWrite: false });
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 8), mat);
      mesh.position.set(-vehicle.chassis.lengthMm / 2000 - 0.1, 0.3, 0.34);
      scene.add(mesh);
      particles.push({ mesh, life: 0, vy: 0.2, vz: 0.2 });
    }
  }

  const bed = mode === "dyno" ? buildDyno(vehicle) : null;
  if (bed) scene.add(bed.group);

  let tween: { fromPos: THREE.Vector3; toPos: THREE.Vector3; fromTarget: THREE.Vector3; toTarget: THREE.Vector3; t: number } | null = null;
  controls.addEventListener("start", () => {
    tween = null;
  });

  let wheelAngle = 0;
  let rollerAngle = 0;
  let last = performance.now();
  let clusterTick = 0;
  let interacting = false;
  controls.addEventListener("start", () => {
    interacting = true;
  });

  const setCamera = (preset: CameraPreset, instant: boolean) => {
    const L = vehicle.chassis.lengthMm / 1000;
    const W = vehicle.chassis.widthMm / 1000;
    const H = vehicle.chassis.heightMm / 1000;
    const driverSide = vehicle.country === "India" ? 0.33 : -0.33;
    let pos: THREE.Vector3;
    let look = new THREE.Vector3(0, H * 0.45, 0);
    const dynoY = carBaseY;
    switch (preset) {
      case "front":
        pos = new THREE.Vector3(L * 0.92, dynoY + 0.85, 0);
        look = new THREE.Vector3(0, dynoY + 0.55, 0);
        break;
      case "rear":
        pos = new THREE.Vector3(-L * 0.9, dynoY + 1.05, 0.2);
        look = new THREE.Vector3(0, dynoY + 0.55, 0);
        break;
      case "side":
        pos = new THREE.Vector3(0.1, dynoY + 1.05, W * 2.1);
        look = new THREE.Vector3(0, dynoY + 0.6, 0);
        break;
      case "engine":
        pos = new THREE.Vector3(L * 0.38, dynoY + 1.62, 0.85);
        look = new THREE.Vector3(L * 0.24, dynoY + 0.62, 0);
        break;
      case "cockpit":
        pos = new THREE.Vector3(-L * 0.06, dynoY + H * 0.79, driverSide * 1.15);
        look = new THREE.Vector3(L * 0.9, dynoY + H * 0.5, driverSide * 0.55);
        break;
      case "cluster":
        pos = new THREE.Vector3(L * 0.02, dynoY + H * 0.73, driverSide * 0.95);
        look = new THREE.Vector3(L * 0.24, dynoY + H * 0.66, driverSide * 0.5);
        break;
      default:
        pos = new THREE.Vector3(L * 1.12, dynoY + H * 1.02 + 0.5, W * 1.95);
        look = new THREE.Vector3(0, dynoY + H * 0.38, 0);
    }
    const interior = preset === "cockpit" || preset === "cluster" || preset === "engine";
    controls.enabled = !interior;
    car.setCutaway(preset === "engine");
    car.setCockpitVisibility(preset === "cockpit" || preset === "cluster");
    if (instant) {
      camera.position.copy(pos);
      camera.lookAt(look);
      controls.target.copy(look);
      controls.update();
      return;
    }
    tween = {
      fromPos: camera.position.clone(),
      toPos: pos,
      fromTarget: controls.target.clone(),
      toTarget: look,
      t: 0,
    };
  };

  const resize = () => {
    const w = mount.clientWidth || 800;
    const h = mount.clientHeight || 500;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  resize();
  const observer = new ResizeObserver(resize);
  observer.observe(mount);

  car.headlightOn = headlights;
  car.applyLights(headlights, 0, false);

  const update = (state: SimSnapshot) => {
    const now = performance.now();
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const dir = state.gear === -1 ? -1 : 1;
    const speedMs = (state.speedKph / 3.6) * (state.engineOn || state.speedKph > 0 ? 1 : 0);
    wheelAngle += ((speedMs * dir) / ROLLER_R) * dt * (ROLLER_R / (car.wheelRadius || ROLLER_R));
    rollerAngle += ((speedMs * dir) / ROLLER_R) * dt;
    car.spinWheels(wheelAngle, state.steer);
    if (bed) bed.spin(rollerAngle);
    car.applyLights(headlights, state.brake, state.gear === -1);
    car.vibrate(now, state);

    // Exhaust puffs
    if (mode === "dyno") {
      const active = state.engineOn && (state.rpm > 1200 || state.throttle > 0.15);
      exhaustTimer -= dt;
      if (active && exhaustTimer <= 0) {
        exhaustTimer = 0.14;
        const free = particles.find((p) => p.life <= 0);
        if (free) {
          free.life = 1;
          free.mesh.position.set(-vehicle.chassis.lengthMm / 2000 - 0.08, carBaseY + 0.24, 0.34);
          (free.mesh.material as THREE.MeshBasicMaterial).opacity = 0.16;
          free.mesh.scale.setScalar(0.6);
        }
      }
      for (const p of particles) {
        if (p.life > 0) {
          p.life -= dt * 1.5;
          p.mesh.position.y += dt * (0.22 + p.life * 0.2);
          p.mesh.position.z += dt * 0.22;
          p.mesh.position.x -= dt * 0.35;
          p.mesh.scale.addScalar(dt * 0.7);
          (p.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, p.life * 0.16);
        } else {
          (p.mesh.material as THREE.MeshBasicMaterial).opacity = 0;
        }
      }
    }

    // Live cluster texture, updated at a modest rate
    clusterTick += dt;
    if (clusterTick > 0.1 && car.clusterCanvas) {
      clusterTick = 0;
      drawCluster(car.clusterCanvas, state);
      car.clusterTexture && (car.clusterTexture.needsUpdate = true);
    }

    if (tween) {
      tween.t = Math.min(1, tween.t + dt / 0.85);
      const e = 1 - Math.pow(1 - tween.t, 3);
      camera.position.lerpVectors(tween.fromPos, tween.toPos, e);
      controls.target.lerpVectors(tween.fromTarget, tween.toTarget, e);
      if (tween.t >= 1) tween = null;
    } else if (mode === "studio" && !interacting) {
      car.group.rotation.y += dt * 0.09;
      controls.target.set(0, 0.7, 0);
    }
    controls.update();
    renderer.render(scene, camera);
  };

  const dispose = () => {
    observer.disconnect();
    controls.dispose();
    renderer.dispose();
    scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
      else mat?.dispose();
    });
    env.dispose();
    if (renderer.domElement.parentElement === mount) mount.removeChild(renderer.domElement);
  };

  return {
    dispose,
    setCamera,
    setHeadlights: (on: boolean) => {
      headlights = on;
      car.headlightOn = on;
      car.applyLights(on, 0, false);
    },
    update,
  };
}

function makeEnvironmentTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext("2d")!;
  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, "#26302a");
  grad.addColorStop(0.36, "#101512");
  grad.addColorStop(0.52, "#2d3531");
  grad.addColorStop(1, "#070908");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 512);
  ctx.fillStyle = "#e8f4dc";
  for (let i = 0; i < 5; i++) {
    ctx.globalAlpha = 0.8;
    ctx.fillRect(80 + i * 200, 90, 88, 15);
  }
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = "#b8ffca";
  ctx.fillRect(0, 210, 1024, 3);
  const texture = new THREE.CanvasTexture(canvas);
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function makeConcreteTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#232825";
  ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 5000; i++) {
    const v = 25 + Math.random() * 36;
    ctx.fillStyle = `rgba(${v},${v + 3},${v},${0.35})`;
    ctx.fillRect(Math.random() * 512, Math.random() * 512, Math.random() * 2.5, Math.random() * 2.5);
  }
  ctx.strokeStyle = "rgba(8,10,8,0.5)";
  ctx.lineWidth = 2;
  ctx.strokeRect(4, 4, 504, 504);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function makeSignTexture(title: string, sub: string, width = 1024, height = 256) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#101512";
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = "#2b342c";
  ctx.lineWidth = 4;
  ctx.strokeRect(6, 6, width - 12, height - 12);
  ctx.fillStyle = "#d6f26b";
  ctx.font = "700 96px 'Space Grotesk', Arial, sans-serif";
  ctx.fillText(title, 48, height * 0.58);
  ctx.fillStyle = "#8b988d";
  ctx.font = "500 26px 'JetBrains Mono', monospace";
  ctx.fillText(sub, 52, height * 0.82);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function buildRoom(vehicle: Vehicle, mode: "dyno" | "studio", quality: GraphicsQuality) {
  const group = new THREE.Group();
  const concrete = makeConcreteTexture();
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(26, 22),
    new THREE.MeshStandardMaterial({ map: concrete, color: 0x6b756c, roughness: 0.85, metalness: 0.12 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  floor.receiveShadow = true;
  group.add(floor);

  const wallMat = new THREE.MeshStandardMaterial({ color: mode === "studio" ? 0x1a211d : 0x262d28, roughness: 0.92, metalness: 0.04 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x141916, roughness: 0.8, metalness: 0.2 });
  const back = new THREE.Mesh(new THREE.BoxGeometry(24, 6.4, 0.3), wallMat);
  back.position.set(0, 3.2, -5.6);
  back.receiveShadow = true;
  group.add(back);
  const left = new THREE.Mesh(new THREE.BoxGeometry(0.3, 6.4, 20), wallMat);
  left.position.set(-7.6, 3.2, 0);
  group.add(left);
  const right = left.clone();
  right.position.x = 7.6;
  group.add(right);

  // Wall base trim + accent line
  const trim = new THREE.Mesh(new THREE.BoxGeometry(24, 0.55, 0.12), darkMat);
  trim.position.set(0, 0.3, -5.42);
  group.add(trim);
  const accent = new THREE.Mesh(
    new THREE.BoxGeometry(24, 0.03, 0.05),
    new THREE.MeshBasicMaterial({ color: 0xc9f460 }),
  );
  accent.position.set(0, 2.2, -5.4);
  group.add(accent);

  // Brand wall panel
  const signTex = makeSignTexture("REALSHIFT", "CHASSIS DYNAMOMETER · BAY 01");
  signTex.anisotropy = 4;
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(4.9, 1.22),
    new THREE.MeshBasicMaterial({ map: signTex }),
  );
  sign.position.set(-2.7, 3.9, -5.39);
  group.add(sign);

  const sideSign = new THREE.Mesh(
    new THREE.PlaneGeometry(2.9, 0.72),
    new THREE.MeshBasicMaterial({ map: makeSignTexture("DYNO CELL", `${vehicle.make.toUpperCase()} · ${vehicle.model.toUpperCase()}`) }),
  );
  sideSign.position.set(4.4, 3.3, -5.38);
  group.add(sideSign);

  // Ceiling trusses & light panels
  const trussMat = new THREE.MeshStandardMaterial({ color: 0x31392f, roughness: 0.5, metalness: 0.65 });
  for (let i = -1; i <= 1; i++) {
    const truss = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 18), trussMat);
    truss.position.set(i * 5.2, 5.7, 0);
    group.add(truss);
  }
  for (let i = -1; i <= 1; i++) {
    const cross = new THREE.Mesh(new THREE.BoxGeometry(20, 0.13, 0.13), trussMat);
    cross.position.set(0, 5.7, i * 4.4);
    group.add(cross);
  }
  const lampMat = new THREE.MeshStandardMaterial({ color: 0xf8ffe9, emissive: 0xf4ffd8, emissiveIntensity: 2.6, roughness: 0.4 });
  const lampPositions = [
    [2.6, 5.5, 1.8],
    [-2.6, 5.5, -1.2],
    [5.4, 5.5, -3.4],
  ];
  for (const [x, y, z] of lampPositions) {
    const fixture = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.06, 0.34), lampMat);
    fixture.position.set(x, y, z);
    group.add(fixture);
    const housing = new THREE.Mesh(new THREE.BoxGeometry(2.03, 0.1, 0.46), trussMat);
    housing.position.set(x, y + 0.08, z);
    group.add(housing);
  }

  // Tool cabinets, tyre stacks, trolley
  const cabinetRed = new THREE.MeshStandardMaterial({ color: 0x7c2020, roughness: 0.42, metalness: 0.5 });
  const cabinet = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.1, 0.62), cabinetRed);
  cabinet.position.set(-4.9, 0.55, -5.16);
  cabinet.castShadow = true;
  cabinet.receiveShadow = true;
  group.add(cabinet);
  for (let i = 0; i < 5; i++) {
    const drawer = new THREE.Mesh(new THREE.BoxGeometry(1.92, 0.02, 0.05), new THREE.MeshStandardMaterial({ color: 0x2a2929, metalness: 0.7, roughness: 0.3 }));
    drawer.position.set(-4.9, 0.16 + i * 0.2, -4.82);
    group.add(drawer);
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.025, 0.02), new THREE.MeshStandardMaterial({ color: 0xb9bdb6, metalness: 0.9, roughness: 0.25 }));
    handle.position.set(-4.9, 0.16 + i * 0.2, -4.78);
    group.add(handle);
  }
  const shelf = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.06, 0.5), darkMat);
  shelf.position.set(-5.2, 2.1, -5.3);
  group.add(shelf);
  const tyreMat = new THREE.MeshStandardMaterial({ color: 0x141614, roughness: 0.95 });
  const tyreGeo = new THREE.TorusGeometry(0.33, 0.12, 10, 22);
  for (let i = 0; i < 4; i++) {
    const tyre = new THREE.Mesh(tyreGeo, tyreMat);
    tyre.rotation.x = Math.PI / 2;
    tyre.position.set(4.9 + (i % 2) * 0.2, 0.14 + i * 0.23, -5.2 + (i > 1 ? 0.7 : 0));
    tyre.scale.setScalar(1 - i * 0.01);
    group.add(tyre);
  }
  const extinguisher = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.6, 14), new THREE.MeshStandardMaterial({ color: 0xa5241f, roughness: 0.4, metalness: 0.3 }));
  extinguisher.position.set(2.4, 0.34, -5.2);
  group.add(extinguisher);
  const cart = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.08, 0.65), trussMat);
  cart.position.set(4.6, 0.92, -3.7);
  group.add(cart);
  for (const dx of [-0.48, 0.48]) {
    for (const dz of [-0.25, 0.25]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.9, 6), trussMat);
      leg.position.set(4.6 + dx, 0.46, -3.7 + dz);
      group.add(leg);
    }
  }
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.92, 0.55),
    new THREE.MeshBasicMaterial({ map: makeSignTexture("LIVE", `${vehicle.make} ${vehicle.model}`) }),
  );
  screen.position.set(4.6, 1.2, -3.37);
  screen.rotation.x = -0.55;
  group.add(screen);

  if (mode === "studio") {
    const disc = new THREE.Mesh(
      new THREE.CylinderGeometry(3.2, 3.2, 0.06, 64),
      new THREE.MeshStandardMaterial({ color: 0x1b221d, metalness: 0.55, roughness: 0.35 }),
    );
    disc.position.y = 0.02;
    disc.receiveShadow = true;
    group.add(disc);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(3.16, 0.012, 6, 96), new THREE.MeshBasicMaterial({ color: 0xc9f460 }));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.06;
    group.add(ring);
    const cyclorama = new THREE.Mesh(
      new THREE.CylinderGeometry(9.4, 9.4, 7, 48, 1, true),
      new THREE.MeshStandardMaterial({ color: 0x141a16, roughness: 0.95, side: THREE.BackSide }),
    );
    cyclorama.position.set(0, 3.4, -1.6);
    group.add(cyclorama);
  }
  void quality;
  return { group };
}

function buildDyno(vehicle: Vehicle) {
  const group = new THREE.Group();
  const steel = new THREE.MeshStandardMaterial({ color: 0x2b312d, roughness: 0.42, metalness: 0.82 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x141815, roughness: 0.7, metalness: 0.35 });
  const hazard = new THREE.MeshStandardMaterial({ color: 0xd7be34, roughness: 0.6, metalness: 0.25 });
  const rollerMat = new THREE.MeshStandardMaterial({ color: 0x565e58, roughness: 0.26, metalness: 0.95 });
  const W = vehicle.chassis.widthMm / 1000;
  const L = vehicle.chassis.lengthMm / 1000;
  const wb = vehicle.chassis.wheelbaseMm / 1000;
  const wheelX = wb / 2;
  const deckWidth = W + 0.44;

  // Pit surround decking
  const deckY = 0.09;
  const frontDeck = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.05, deckWidth), dark);
  frontDeck.position.set(0, deckY, 0);
  group.add(frontDeck);
  for (const x of [-(wheelX + 0.42), wheelX + 0.42, 0.0]) {
    const segment = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.05, deckWidth), dark);
    segment.position.set(x, deckY, 0);
    group.add(segment);
  }
  const ramp = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.05, deckWidth), dark);
  ramp.position.set(wheelX + 0.82, deckY - 0.01, 0);
  ramp.rotation.z = -0.06;
  group.add(ramp);
  for (const zSide of [-1, 1]) {
    const skirt = new THREE.Mesh(new THREE.BoxGeometry(L + 1.5, 0.12, 0.07), steel);
    skirt.position.set(0, 0.07, (zSide * deckWidth) / 2);
    group.add(skirt);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(L + 1.5, 0.02, 0.02), hazard);
    stripe.position.set(0, 0.14, (zSide * deckWidth) / 2 + 0.03 * zSide);
    group.add(stripe);
  }

  const rollers: THREE.Group[] = [];
  for (const axleX of [-wheelX, wheelX]) {
    for (const offset of [-0.29, 0.29]) {
      const spin = new THREE.Group();
      spin.position.set(axleX + offset, 0.045, 0);
      const roller = new THREE.Mesh(new THREE.CylinderGeometry(ROLLER_R, ROLLER_R, deckWidth - 0.04, 34, 1), rollerMat);
      roller.rotation.x = Math.PI / 2;
      roller.castShadow = true;
      spin.add(roller);
      for (let e = 0; e < 4; e++) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(ROLLER_R + 0.004, 0.016, 6, 34), new THREE.MeshStandardMaterial({ color: 0xa7b3a9, metalness: 0.92, roughness: 0.2 }));
        ring.rotation.y = Math.PI / 2;
        ring.position.z = -deckWidth / 2 + 0.14 + e * ((deckWidth - 0.28) / 3);
        spin.add(ring);
      }
      group.add(spin);
      rollers.push(spin);
    }
  }
  // Frame under rollers + side rails so the bed reads as hardware
  const frame = new THREE.Mesh(new THREE.BoxGeometry(wb + 1.9, 0.26, deckWidth + 0.16), new THREE.MeshStandardMaterial({ color: 0x1d2320, metalness: 0.6, roughness: 0.55 }));
  frame.position.set(0, -0.1, 0);
  frame.receiveShadow = true;
  group.add(frame);
  for (const side of [-1, 1]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(wb + 1.9, 0.12, 0.14), steel);
    rail.position.set(0, 0.1, side * (deckWidth / 2 + 0.06));
    group.add(rail);
    const hazardLine = new THREE.Mesh(new THREE.BoxGeometry(wb + 1.9, 0.02, 0.03), hazard);
    hazardLine.position.set(0, 0.165, side * (deckWidth / 2 + 0.06));
    group.add(hazardLine);
  }
  for (const side of [-1, 1]) {
    const endCap = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.3, deckWidth + 0.18), steel);
    endCap.position.set(wheelX + 0.82, 0.02, side * 0);
    group.add(endCap);
  }

  // Dyno control cabinet with screen
  const cabinet = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.35, 0.45), dark);
  cabinet.position.set(-2.5, 0.68, 2.6);
  cabinet.castShadow = true;
  cabinet.receiveShadow = true;
  group.add(cabinet);
  const monitor = new THREE.Mesh(
    new THREE.PlaneGeometry(0.7, 0.46),
    new THREE.MeshBasicMaterial({ map: makeSignTexture("DYNO", `${vehicle.dyno.peakPowerHp} HP REFERENCE`) }),
  );
  monitor.position.set(-2.5, 1.05, 2.82);
  group.add(monitor);
  const lights = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.08, 0.05), new THREE.MeshBasicMaterial({ color: 0xc9f460 }));
  lights.position.set(-2.5, 0.93, 2.83);
  group.add(lights);

  // Exhaust extraction hood
  const hoseMat = new THREE.MeshStandardMaterial({ color: 0x3c433c, roughness: 0.8 });
  const hood = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.23, 0.5, 16, 1, true), hoseMat);
  hood.position.set(-L / 2 - 0.45, 0.46, 0.45);
  group.add(hood);
  const hose = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 1.5, 12), hoseMat);
  hose.position.set(-L / 2 - 1.05, 1.6, 0.9);
  hose.rotation.z = 0.18;
  hose.rotation.x = -0.2;
  group.add(hose);
  const fan = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.4, 0.65), dark);
  fan.position.set(-4.7, 0.7, -1.9);
  group.add(fan);
  const fanBlade = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.05, 6, 24), steel);
  fanBlade.position.set(-4.2, 0.8, -1.9);
  fanBlade.rotation.y = Math.PI / 2;
  group.add(fanBlade);
  const fanHub = new THREE.Mesh(new THREE.CircleGeometry(0.35, 20), new THREE.MeshStandardMaterial({ color: 0x0b0e0c, roughness: 1 }));
  fanHub.position.set(-4.96, 0.8, -1.9);
  fanHub.rotation.y = Math.PI / 2;
  group.add(fanHub);

  return {
    group,
    spin: (angle: number) => {
      rollers.forEach((r, i) => {
        r.rotation.z = -angle * (i % 2 === 0 ? 1 : 0.96);
      });
    },
  };
}

function buildCar(v: Vehicle, paintIndex: number, quality: GraphicsQuality, baseY: number) {
  const group = new THREE.Group();
  const L = v.chassis.lengthMm / 1000;
  const W = v.chassis.widthMm / 1000;
  const H = v.chassis.heightMm / 1000;
  const wb = v.chassis.wheelbaseMm / 1000;
  const wheelRadius = Math.max(0.29, (v.chassis.wheelDiameterIn * 0.0254) / 2 + 0.095);
  const tyreWidth = v.bodyStyle === "Pickup" ? 0.31 : v.bodyStyle === "SUV" ? 0.29 : v.bodyStyle === "Sports" ? 0.30 : 0.25;
  const track = W / 2 - tyreWidth / 2 + 0.012;
  const isPickup = v.bodyStyle === "Pickup";
  const isRoadster = v.bodyStyle === "Roadster";
  const tall = v.bodyStyle === "SUV" || isPickup;
  const lowSlung = v.bodyStyle === "Sports" || v.bodyStyle === "Coupe";
  const clearance = (tall ? 0.23 : lowSlung ? 0.115 : 0.145) * H;
  const beltline = clearance + (H - clearance) * (tall ? 0.58 : isRoadster ? 0.56 : 0.5);
  const bodyDepth = W - 0.055;

  const paintHex = v.paint[paintIndex % v.paint.length]?.hex ?? "#444";
  const paint = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(paintHex),
    metalness: 0.58,
    roughness: 0.28,
    clearcoat: 0.92,
    clearcoatRoughness: 0.14,
    envMapIntensity: 1.05,
  });
  const glass = new THREE.MeshPhysicalMaterial({
    color: 0x0a1012,
    metalness: 0.32,
    roughness: 0.08,
    transparent: true,
    opacity: 0.86,
    envMapIntensity: 1.6,
    side: THREE.DoubleSide,
  });
  const trim = new THREE.MeshStandardMaterial({ color: 0x121614, roughness: 0.58, metalness: 0.42 });
  const blackPlastic = new THREE.MeshStandardMaterial({ color: 0x0c0f0d, roughness: 0.78, metalness: 0.2 });
  const rubber = new THREE.MeshStandardMaterial({ color: 0x0f1110, roughness: 0.96, metalness: 0.02 });
  const rimMat = new THREE.MeshStandardMaterial({ color: 0xb4bab6, roughness: 0.22, metalness: 0.96 });
  const chrome = new THREE.MeshStandardMaterial({ color: 0xcdd2cb, roughness: 0.16, metalness: 1 });
  const interior = new THREE.MeshStandardMaterial({ color: 0x202420, roughness: 0.9 });
  const headlightMat = new THREE.MeshStandardMaterial({ color: 0xdde5d4, emissive: 0xfff4d6, emissiveIntensity: 0.05, roughness: 0.1, metalness: 0.3 });
  const tailMat = new THREE.MeshStandardMaterial({ color: 0x7c1712, emissive: 0xff2418, emissiveIntensity: 0.4, roughness: 0.16, metalness: 0.2 });
  const reverseMat = new THREE.MeshStandardMaterial({ color: 0xd8dbd0, emissive: 0xf5fff2, emissiveIntensity: 0, roughness: 0.2 });
  const shellGroup: THREE.Object3D[] = [];

  // ---------- Side profile with real wheel arch cut-outs ----------
  const shape = new THREE.Shape();
  const nose = L / 2;
  const tail = -L / 2;
  const deckY = clearance + (beltline - clearance) * 0.94;
  const hoodY = clearance + (beltline - clearance) * (tall ? 0.96 : 0.82);
  const cowl = L * (tall ? 0.17 : 0.16);
  const rearBase = tall ? -L * 0.34 : lowSlung ? -L * 0.32 : v.bodyStyle === "Sedan" ? -L * 0.31 : -L * 0.33;
  const noseY = clearance + (beltline - clearance) * (tall ? 0.74 : 0.5);
  shape.moveTo(tail, clearance * 0.86);
  shape.lineTo(tail + 0.02, deckY);
  if (isPickup) {
    shape.lineTo(tail + 0.05, deckY + 0.02);
    shape.lineTo(rearBase - 0.12, deckY + 0.02);
    shape.lineTo(rearBase, beltline);
    shape.lineTo(rearBase + 0.22, beltline);
    shape.lineTo(cowl, cowl > rearBase ? beltline : beltline);
  } else {
    shape.lineTo(tail + 0.16, deckY);
    shape.quadraticCurveTo(rearBase + L * 0.12, beltline * 0.995, rearBase, beltline * 0.985);
    shape.lineTo(cowl, beltline * 0.995);
  }
  shape.quadraticCurveTo(nose - L * 0.08, hoodY, nose - L * 0.015, hoodY * 0.995);
  shape.quadraticCurveTo(nose, hoodY * 0.985, nose, noseY);
  shape.lineTo(nose - 0.015, clearance + (beltline - clearance) * 0.16);
  shape.quadraticCurveTo(nose - L * 0.03, clearance * 0.92, nose - L * 0.08, clearance * 0.9);
  shape.lineTo(tail + 0.04, clearance * 0.86);
  shape.closePath();

  const archRadius = wheelRadius + 0.055;
  for (const archX of [-wb / 2, wb / 2]) {
    const hole = new THREE.Path();
    const archCenterY = wheelRadius + 0.012;
    hole.absarc(archX, archCenterY, archRadius, Math.PI, 0, true);
    hole.lineTo(archX + archRadius, clearance * 0.875);
    hole.lineTo(archX - archRadius, clearance * 0.875);
    hole.closePath();
    shape.holes.push(hole);
  }

  const bodyGeo = new THREE.ExtrudeGeometry(shape, {
    depth: bodyDepth,
    bevelEnabled: true,
    bevelSize: 0.026,
    bevelThickness: 0.03,
    bevelSegments: quality === "performance" ? 1 : 2,
    curveSegments: 8,
  });
  bodyGeo.translate(0, 0, -bodyDepth / 2);
  bodyGeo.computeVertexNormals();
  const body = new THREE.Mesh(bodyGeo, paint);
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);
  shellGroup.push(body);

  // wheel arch lips
  for (const archX of [-wb / 2, wb / 2]) {
    for (const side of [-1, 1]) {
      const lip = new THREE.Mesh(new THREE.TorusGeometry(archRadius + 0.005, 0.018, 5, 20, Math.PI), blackPlastic);
      lip.position.set(archX, wheelRadius + 0.012, side * (bodyDepth / 2 - 0.006));
      group.add(lip);
    }
  }

  // Side sills / skirts
  for (const side of [-1, 1]) {
    const sill = new THREE.Mesh(new THREE.BoxGeometry(wb * 0.72, 0.055, 0.055), blackPlastic);
    sill.position.set(0, clearance * 0.72, side * (W / 2 - 0.035));
    group.add(sill);
    shellGroup.push(sill);
  }

  // Door shut-lines, handles and shoulder detail
  for (const side of [-1, 1]) {
    const seamMat = new THREE.MeshBasicMaterial({ color: 0x050806, transparent: true, opacity: 0.55 });
    const doorFront = new THREE.Mesh(new THREE.BoxGeometry(0.009, (beltline - clearance) * 0.86, 0.004), seamMat);
    doorFront.position.set(cowl * 0.62, clearance + (beltline - clearance) * 0.5, side * (bodyDepth / 2 + 0.002));
    group.add(doorFront);
    const doorRear = new THREE.Mesh(new THREE.BoxGeometry(0.009, (beltline - clearance) * 0.86, 0.004), seamMat);
    doorRear.position.set(rearBase * 0.62, clearance + (beltline - clearance) * 0.48, side * (bodyDepth / 2 + 0.002));
    group.add(doorRear);
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.022, 0.03), side > 0 ? chrome : chrome);
    handle.position.set(cowl * 0.2, beltline - 0.06, side * (bodyDepth / 2 + 0.006));
    group.add(handle);
    const shoulder = new THREE.Mesh(new THREE.BoxGeometry(wb * 0.98, 0.012, 0.004), new THREE.MeshBasicMaterial({ color: 0xf3f7e9, transparent: true, opacity: 0.16 }));
    shoulder.position.set(0, beltline - 0.14, side * (bodyDepth / 2 + 0.002));
    group.add(shoulder);
  }

  // Bonnet shut-lines & side crease
  const crease = new THREE.Mesh(new THREE.BoxGeometry(wb * 0.94, 0.008, 0.004), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.32 }));
  for (const side of [-1, 1]) {
    const line = crease.clone();
    line.position.set(0, beltline - 0.055, side * (bodyDepth / 2));
    group.add(line);
  }

  // ---------- Greenhouse ----------
  const roofFront = cowl + (rearBase - cowl) * 0.09;
  const roofRear = rearBase + (cowl - rearBase) * 0.2;
  const roofY = clearance + (H - clearance) * (tall ? 0.995 : 0.985);
  const cabinW = bodyDepth * 0.87;
  const glassMat = glass;
  const windowTop = roofY - 0.045;
  const sideZ = cabinW / 2;

  const quad = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, d: THREE.Vector3, mat: THREE.Material) => {
    const geo = new THREE.BufferGeometry();
    const verts = new Float32Array([
      a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z,
      a.x, a.y, a.z, c.x, c.y, c.z, d.x, d.y, d.z,
    ]);
    geo.setAttribute("position", new THREE.BufferAttribute(verts, 3));
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = false;
    return mesh;
  };

  let cabin: THREE.Mesh | null = null;
  if (!isRoadster) {
    // roof panel
    const roofPanel = new THREE.Mesh(new THREE.BoxGeometry(Math.abs(roofFront - roofRear) + 0.03, 0.055, cabinW + 0.015), paint);
    roofPanel.position.set((roofFront + roofRear) / 2, roofY, 0);
    roofPanel.castShadow = true;
    group.add(roofPanel);
    shellGroup.push(roofPanel);
    const roofInset = new THREE.Mesh(new THREE.BoxGeometry(Math.abs(roofFront - roofRear) * 0.72, 0.008, cabinW * 0.6), new THREE.MeshStandardMaterial({ color: 0x090d0a, roughness: 0.65 }));
    roofInset.position.set((roofFront + roofRear) / 2, roofY + 0.033, 0);
    group.add(roofInset);

    // pillars
    const pillar = (x1: number, y1: number, x2: number, y2: number, z: number, thickness = 0.062) => {
      const len = Math.hypot(x2 - x1, y2 - y1) + 0.05;
      const beam = new THREE.Mesh(new THREE.BoxGeometry(len, thickness, thickness * 0.8), paint);
      beam.position.set((x1 + x2) / 2, (y1 + y2) / 2, z);
      beam.rotation.z = Math.atan2(y2 - y1, x2 - x1);
      beam.castShadow = true;
      group.add(beam);
      shellGroup.push(beam);
    };
    for (const side of [-1, 1]) {
      pillar(cowl, beltline, roofFront, windowTop, side * (sideZ + 0.012), 0.07);
      pillar(rearBase, beltline, roofRear, windowTop, side * (sideZ + 0.012), 0.07);
      const bX = cowl + (rearBase - cowl) * 0.5;
      pillar(bX, beltline, bX - 0.02, windowTop, side * (sideZ + 0.01), 0.055);
      // side glass, split by the B-pillar
      const gFront = quad(
        new THREE.Vector3(cowl - 0.005, beltline + 0.01, side * sideZ),
        new THREE.Vector3(roofFront + 0.02, windowTop, side * sideZ),
        new THREE.Vector3(bX + 0.01, windowTop, side * sideZ),
        new THREE.Vector3(bX + 0.01, beltline + 0.01, side * sideZ),
        glassMat,
      );
      const gRear = quad(
        new THREE.Vector3(bX - 0.03, beltline + 0.01, side * sideZ),
        new THREE.Vector3(bX - 0.03, windowTop, side * sideZ),
        new THREE.Vector3(roofRear - 0.01, windowTop, side * sideZ),
        new THREE.Vector3(rearBase + 0.03, beltline + 0.01, side * sideZ),
        glassMat,
      );
      group.add(gFront, gRear);
      shellGroup.push(gFront, gRear);
      // chrome belt line trim
      const beltTrim = new THREE.Mesh(new THREE.BoxGeometry(Math.abs(cowl - rearBase) + 0.04, 0.018, 0.016), chrome);
      beltTrim.position.set((cowl + rearBase) / 2, beltline + 0.006, side * (sideZ + 0.014));
      group.add(beltTrim);
    }
    // windscreen
    const wind = quad(
      new THREE.Vector3(cowl, beltline + 0.015, -cabinW * 0.47),
      new THREE.Vector3(roofFront, windowTop, -cabinW * 0.47),
      new THREE.Vector3(roofFront, windowTop, cabinW * 0.47),
      new THREE.Vector3(cowl, beltline + 0.015, cabinW * 0.47),
      glassMat,
    );
    group.add(wind);
    shellGroup.push(wind);
    // rear screen
    const rear = quad(
      new THREE.Vector3(rearBase + 0.01, beltline + 0.015, -cabinW * 0.45),
      new THREE.Vector3(roofRear, windowTop, -cabinW * 0.45),
      new THREE.Vector3(roofRear, windowTop, cabinW * 0.45),
      new THREE.Vector3(rearBase + 0.01, beltline + 0.015, cabinW * 0.45),
      glassMat,
    );
    group.add(rear);
    shellGroup.push(rear);
    // simple roof lining so glass doesn't read as a hole
    const liner = new THREE.Mesh(new THREE.BoxGeometry(Math.abs(roofFront - roofRear) * 0.92, 0.012, cabinW * 0.86), new THREE.MeshStandardMaterial({ color: 0x171b17, roughness: 0.95 }));
    liner.position.set((roofFront + roofRear) / 2, windowTop - 0.006, 0);
    group.add(liner);
    cabin = roofPanel;
  } else {
    // Roadster: low screen + roll hoops
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(bodyDepth * 0.76, 0.26), glass);
    screen.position.set(cowl - 0.04, beltline + 0.13, 0);
    screen.rotation.set(0, Math.PI / 2, 0.34);
    group.add(screen);
    shellGroup.push(screen);
    for (const side of [-1, 1]) {
      const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.024, 6, 16, Math.PI), chrome);
      hoop.position.set(rearBase + 0.16, beltline + 0.01, side * 0.3);
      group.add(hoop);
    }
  }
  void cabin;

  // ---------- Pickup bed ----------
  if (isPickup) {
    const bedFloor = new THREE.Mesh(new THREE.BoxGeometry(L * 0.38, 0.06, bodyDepth * 0.86), blackPlastic);
    bedFloor.position.set(-L * 0.26, deckY - 0.03, 0);
    group.add(bedFloor);
    for (const side of [-1, 1]) {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(L * 0.4, 0.3, 0.055), paint);
      wall.position.set(-L * 0.27, deckY + 0.13, side * (bodyDepth / 2 - 0.03));
      wall.castShadow = true;
      group.add(wall);
      shellGroup.push(wall);
    }
    const gate = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.3, bodyDepth * 0.9), paint);
    gate.position.set(-L / 2 + 0.025, deckY + 0.13, 0);
    group.add(gate);
    shellGroup.push(gate);
  }

  // ---------- Front fascia ----------
  const grilleY = noseY - (beltline - clearance) * 0.12;
  const grilleW = bodyDepth * (tall ? 0.52 : 0.44);
  const grilleH = (beltline - clearance) * (tall ? 0.34 : 0.24);
  const grille = new THREE.Mesh(new THREE.BoxGeometry(0.035, grilleH, grilleW), blackPlastic);
  grille.position.set(nose + 0.006, grilleY, 0);
  group.add(grille);
  const grilleRing = new THREE.Mesh(new THREE.BoxGeometry(0.024, grilleH + 0.035, grilleW + 0.035), trim);
  grilleRing.position.set(nose - 0.004, grilleY, 0);
  group.add(grilleRing);
  if (v.make === "BMW") {
    for (const z of [-grilleW * 0.25, grilleW * 0.25]) {
      const kidney = new THREE.Mesh(new THREE.BoxGeometry(0.032, grilleH - 0.01, grilleW * 0.4), chrome);
      kidney.position.set(nose + 0.018, grilleY, z);
      group.add(kidney);
      const inset = new THREE.Mesh(new THREE.BoxGeometry(0.034, grilleH - 0.025, grilleW * 0.35), blackPlastic);
      inset.position.set(nose + 0.022, grilleY, z);
      group.add(inset);
    }
  } else if (v.make === "Volkswagen" || v.make === "Maruti Suzuki" || tall) {
    for (let i = 0; i < 3; i++) {
      const slat = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.012, grilleW * 0.96), chrome);
      slat.position.set(nose + 0.02, grilleY - grilleH * 0.3 + i * grilleH * 0.3, 0);
      group.add(slat);
    }
  } else {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.032, grilleH * 0.9, grilleW * 0.94), new THREE.MeshStandardMaterial({ color: 0x080b09, metalness: 0.6, roughness: 0.45 }));
    mesh.position.set(nose + 0.018, grilleY, 0);
    group.add(mesh);
  }
  const badge = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.012, 18), chrome);
  badge.rotation.z = Math.PI / 2;
  badge.position.set(nose + 0.03, grilleY + grilleH * 0.05, 0);
  group.add(badge);

  const lowerIntake = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.1, bodyDepth * 0.6), blackPlastic);
  lowerIntake.position.set(nose - 0.005, clearance + 0.11, 0);
  group.add(lowerIntake);
  const splitter = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.035, bodyDepth * 0.94), blackPlastic);
  splitter.position.set(nose - 0.07, clearance * 0.82, 0);
  group.add(splitter);
  shellGroup.push(splitter);

  // ---------- Lamps ----------
  for (const side of [-1, 1]) {
    const lensW = bodyDepth * 0.2;
    const lens = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.085, lensW), headlightMat);
    lens.position.set(nose + 0.015, hoodY - (beltline - clearance) * 0.16, side * bodyDepth * 0.31);
    lens.rotation.z = -0.1;
    group.add(lens);
    const housing = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.105, lensW + 0.03), blackPlastic);
    housing.position.set(nose + 0.004, hoodY - (beltline - clearance) * 0.16, side * bodyDepth * 0.31);
    group.add(housing);
    const drl = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.012, lensW * 0.96), new THREE.MeshBasicMaterial({ color: 0xe8fbe9 }));
    drl.position.set(nose + 0.027, hoodY - (beltline - clearance) * 0.23, TAU_SAFE(side) * bodyDepth * 0.31);
    group.add(drl);
  }

  // Tail lamps
  const tailY = deckY - 0.02;
  if (v.make === "Porsche") {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.05, bodyDepth * 0.88), tailMat);
    bar.position.set(tail + 0.015, tailY, 0);
    group.add(bar);
  } else if (v.make === "Ford") {
    for (let i = 0; i < 3; i++) {
      for (const side of [-1, 1]) {
        const bar = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.16, 0.042), tailMat);
        bar.position.set(tail + 0.008, tailY, side * (bodyDepth * 0.28 + i * 0.075));
        group.add(bar);
      }
    }
  } else {
    for (const side of [-1, 1]) {
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.095, bodyDepth * 0.24), tailMat);
      lamp.position.set(tail + 0.006, tailY, side * bodyDepth * 0.32);
      group.add(lamp);
      const reverse = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.032, bodyDepth * 0.1), reverseMat);
      reverse.position.set(tail + 0.008, tailY - 0.07, side * bodyDepth * 0.32);
      group.add(reverse);
    }
  }
  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.11, 0.36), new THREE.MeshStandardMaterial({ color: 0xd2d3c1, roughness: 0.55 }));
  plate.position.set(tail - 0.005, clearance + 0.19, 0);
  group.add(plate);

  // Mirrors with arms
  for (const side of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.03, 0.1), blackPlastic);
    arm.position.set(cowl - 0.04, beltline + 0.06, side * (W / 2 - 0.015));
    group.add(arm);
    const housing = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.07, 0.17), paint);
    housing.position.set(cowl - 0.06, beltline + 0.11, side * (W / 2 + 0.045));
    housing.castShadow = true;
    group.add(housing);
    shellGroup.push(housing);
    const mirrorGlass = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.05), new THREE.MeshStandardMaterial({ color: 0x9aa6a0, metalness: 0.9, roughness: 0.1 }));
    mirrorGlass.position.set(cowl - 0.115, beltline + 0.11, side * (W / 2 + 0.045));
    mirrorGlass.rotation.y = -Math.PI / 2;
    group.add(mirrorGlass);
  }

  // Exhaust tips
  const exhaustCount = v.engine.cylinders >= 8 ? 4 : v.make === "Porsche" ? 2 : 2;
  for (let i = 0; i < exhaustCount; i++) {
    const z = exhaustCount === 4 ? (i < 2 ? -0.34 - i * 0.1 : 0.34 + (i - 2) * 0.1) : (i === 0 ? -0.26 : 0.26);
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.048, 0.12, 14, 1, true), chrome);
    pipe.rotation.z = Math.PI / 2;
    pipe.position.set(tail - 0.055, clearance * 0.82, z * bodyDepth);
    group.add(pipe);
  }
  const diffuser = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.075, bodyDepth * 0.72), blackPlastic);
  diffuser.position.set(tail + 0.053, clearance * 0.8, 0);
  group.add(diffuser);

  // ---------- Wheels ----------
  const wheels: THREE.Group[] = [];
  const frontPivots: THREE.Group[] = [];
  const spokeCount = v.make === "Porsche" ? 5 : tall ? 6 : v.make === "Ford" ? 5 : 6;
  for (const x of [-wb / 2, wb / 2]) {
    for (const side of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.position.set(x, wheelRadius, side * track);
      const spin = new THREE.Group();
      pivot.add(spin);
      const tyre = new THREE.Mesh(new THREE.TorusGeometry(wheelRadius - tyreWidth * 0.48, tyreWidth * 0.5, 12, 34), rubber);
      tyre.castShadow = true;
      spin.add(tyre);
      const face = new THREE.Mesh(new THREE.CylinderGeometry(wheelRadius * 0.72, wheelRadius * 0.72, tyreWidth * 0.92, 28), new THREE.MeshStandardMaterial({ color: 0x171b18, roughness: 0.85 }));
      face.rotation.x = Math.PI / 2;
      spin.add(face);
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(wheelRadius * 0.67, wheelRadius * 0.67, tyreWidth * 0.7, 24), rimMat);
      barrel.rotation.x = Math.PI / 2;
      spin.add(barrel);
      for (let s = 0; s < spokeCount; s++) {
        const spoke = new THREE.Mesh(new THREE.BoxGeometry(wheelRadius * 1.16, 0.036, tyreWidth * 0.42), rimMat);
        spoke.rotation.z = (s / spokeCount) * Math.PI;
        spoke.position.z = side * tyreWidth * 0.28;
        spin.add(spoke);
      }
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(wheelRadius * 0.17, wheelRadius * 0.17, tyreWidth * 0.8, 16), chrome);
      hub.rotation.x = Math.PI / 2;
      spin.add(hub);
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(wheelRadius * 0.52, wheelRadius * 0.52, tyreWidth * 0.2, 24), new THREE.MeshStandardMaterial({ color: 0x51574f, metalness: 0.9, roughness: 0.5 }));
      disc.rotation.x = Math.PI / 2;
      spin.add(disc);
      const caliper = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.15, 0.06), new THREE.MeshStandardMaterial({ color: 0x8f822e, metalness: 0.5, roughness: 0.4 }));
      caliper.position.set(-wheelRadius * 0.18, wheelRadius * 0.35, side * tyreWidth * 0.12);
      pivot.add(caliper);
      group.add(pivot);
      wheels.push(spin);
      if (x > 0) frontPivots.push(pivot);
    }
  }

  // ---------- Interior ----------
  if (!isPickup) {
    const seatsZ = [W * 0.2, -W * 0.2];
    for (const z of seatsZ) {
      const base = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.1, 0.34), interior);
      base.position.set(rearBase + 0.34, beltline + 0.045, z);
      group.add(base);
      const backrest = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.42, 0.33), interior);
      backrest.position.set(rearBase + 0.14, beltline + 0.24, z);
      backrest.rotation.z = -0.16;
      group.add(backrest);
    }
    const dash = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.13, cabinW * 0.84), interior);
    dash.position.set(cowl - 0.16, beltline + 0.06, 0);
    group.add(dash);
    const driverZ = v.country === "India" ? W * 0.2 : -W * 0.2;
    const column = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.22, 10), trim);
    column.rotation.z = Math.PI / 2 - 0.22;
    column.position.set(cowl - 0.27, beltline + 0.17, driverZ);
    group.add(column);
    const steering = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.017, 8, 24), interior);
    steering.rotation.y = Math.PI / 2;
    steering.position.set(cowl - 0.36, beltline + 0.21, driverZ);
    group.add(steering);
    const clusterCanvas = document.createElement("canvas");
    clusterCanvas.width = 256;
    clusterCanvas.height = 128;
    const clusterTexture = new THREE.CanvasTexture(clusterCanvas);
    clusterTexture.colorSpace = THREE.SRGBColorSpace;
    drawCluster(clusterCanvas, null);
    clusterTexture.needsUpdate = true;
    const cluster = new THREE.Mesh(new THREE.PlaneGeometry(0.21, 0.105), new THREE.MeshBasicMaterial({ map: clusterTexture }));
    cluster.position.set(cowl - 0.235, beltline + 0.245, driverZ);
    cluster.rotation.y = -Math.PI / 2;
    cluster.rotation.x = 0.12;
    group.add(cluster);
    group.userData.cluster = { canvas: clusterCanvas, texture: clusterTexture };
    if (isRoadster) {
      for (const obj of [steering, dash]) obj.position.y += 0.02;
    }
  }

  // ---------- Engine bay ----------
  const engineGroup = new THREE.Group();
  const blockMat = new THREE.MeshStandardMaterial({ color: 0x333630, roughness: 0.55, metalness: 0.65 });
  const engineBlock = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.3, 0.46), blockMat);
  engineBlock.position.set(cowl * 0.72, beltline - 0.12, 0);
  engineGroup.add(engineBlock);
  const camCover = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.075, 0.38), new THREE.MeshStandardMaterial({ color: paintHex, metalness: 0.6, roughness: 0.36 }));
  camCover.position.set(cowl * 0.72, beltline + 0.065, 0);
  engineGroup.add(camCover);
  const plenum = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.4, 12), blackPlastic);
  plenum.rotation.z = Math.PI / 2;
  plenum.position.set(cowl * 0.72, beltline + 0.14, -0.04);
  engineGroup.add(plenum);
  if (v.sound.turbo) {
    const turbo = new THREE.Mesh(new THREE.SphereGeometry(0.1, 14, 10), new THREE.MeshStandardMaterial({ color: 0x6b5e4f, metalness: 0.85, roughness: 0.32 }));
    turbo.position.set(cowl * 0.72, beltline - 0.11, 0.24);
    engineGroup.add(turbo);
    const snail = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.032, 8, 18), chrome);
    snail.position.set(cowl * 0.72, beltline - 0.11, 0.3);
    engineGroup.add(snail);
  }
  const battery = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.14, 0.23), blackPlastic);
  battery.position.set(cowl * 1.28, beltline - 0.055, W * 0.27);
  engineGroup.add(battery);
  const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, W * 0.72, 8), chrome);
  strut.rotation.x = Math.PI / 2;
  strut.position.set(cowl * 1.14, beltline + 0.04, 0);
  engineGroup.add(strut);
  engineGroup.visible = false;
  group.add(engineGroup);

  // Headlight illumination
  const spotLeft = new THREE.SpotLight(0xfff1cf, 0, 15, 0.42, 0.6, 1.4);
  spotLeft.position.set(nose + 0.05, hoodY - (beltline - clearance) * 0.16, bodyDepth * 0.31);
  spotLeft.target.position.set(nose + 4, 0.15, bodyDepth * 0.6);
  group.add(spotLeft, spotLeft.target);
  const spotRight = spotLeft.clone();
  spotRight.position.z = -bodyDepth * 0.31;
  spotRight.target.position.z = -bodyDepth * 0.6;
  group.add(spotRight, spotRight.target);

  const cutawaySet = new Set<THREE.Object3D>(shellGroup);
  let headlightOn = false;

  const spinWheels = (angle: number, steer: number) => {
    wheels.forEach((wheel) => {
      wheel.rotation.z = angle;
    });
    frontPivots.forEach((pivot) => {
      pivot.rotation.y = -steer * 0.26;
    });
  };

  const applyLights = (on: boolean, brake: number, reversing: boolean) => {
    headlightOn = on;
    headlightMat.emissiveIntensity = on ? 3.2 : 0.05;
    spotLeft.intensity = on ? 24 : 0;
    spotRight.intensity = on ? 24 : 0;
    tailMat.emissiveIntensity = brake > 0.05 ? 2.6 : 0.4;
    reverseMat.emissiveIntensity = reversing ? 2.4 : 0;
  };

  const vibrate = (now: number, state: SimSnapshot) => {
    if (!state.engineOn) {
      group.position.x *= 0.9;
      group.position.y = baseY;
      return;
    }
    const amp = 0.0006 + (state.rpm / 8000) * 0.0016;
    group.position.x = Math.sin(now * 0.043) * amp;
    group.position.y = baseY + Math.sin(now * 0.061) * amp * 0.7;
  };

  const clusterData = group.userData.cluster as { canvas: HTMLCanvasElement; texture: THREE.CanvasTexture } | undefined;

  return {
    group,
    clusterCanvas: clusterData?.canvas ?? null,
    clusterTexture: clusterData?.texture ?? null,
    wheelRadius,
    headlightOn,
    setCutaway: (active: boolean) => {
      cutawaySet.forEach((obj) => {
        obj.visible = !active;
      });
      engineGroup.visible = active;
    },
    setCockpitVisibility: (_active: boolean) => {
      // Glass is left transparent so cockpit framing stays readable.
    },
    spinWheels,
    applyLights,
    vibrate,
  };
}

function TAU_SAFE(side: number) {
  return side;
}

function drawCluster(canvas: HTMLCanvasElement, state: SimSnapshot | null) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;
  ctx.fillStyle = "#090c0a";
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "#2b332c";
  ctx.lineWidth = 3;
  ctx.strokeRect(3, 3, w - 6, h - 6);
  ctx.fillStyle = "#cfed64";
  ctx.font = "700 44px 'JetBrains Mono', monospace";
  ctx.fillText(state ? `${Math.round(state.rpm)}` : "0", 16, 58);
  ctx.fillStyle = "#7e8b7f";
  ctx.font = "500 14px 'JetBrains Mono', monospace";
  ctx.fillText("RPM", 16, 78);
  const gear = state ? (state.gear === -1 ? "R" : state.gear === 0 ? "N" : String(state.gear)) : "N";
  ctx.fillStyle = "#eef5e7";
  ctx.font = "700 58px 'Space Grotesk', Arial";
  ctx.fillText(gear, w - 68, 62);
  ctx.font = "500 14px 'JetBrains Mono', monospace";
  ctx.fillStyle = "#7e8b7f";
  ctx.fillText("GEAR", w - 68, 82);
  const ratio = state ? Math.min(1, state.rpm / state.redline) : 0;
  ctx.fillStyle = "#242b25";
  ctx.fillRect(16, h - 28, w - 32, 8);
  const gradient = ctx.createLinearGradient(16, 0, w - 32, 0);
  gradient.addColorStop(0, "#8fbf4b");
  gradient.addColorStop(0.78, "#cfed64");
  gradient.addColorStop(1, "#e0603a");
  ctx.fillStyle = gradient;
  ctx.fillRect(16, h - 28, (w - 32) * ratio, 8);
  ctx.fillStyle = "#7e8b7f";
  ctx.font = "500 12px 'JetBrains Mono', monospace";
  ctx.fillText(state ? `LIM ${state.limiterRpm}` : "LIMITER", w - 124, h - 38);
}
