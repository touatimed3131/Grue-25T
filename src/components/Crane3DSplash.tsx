import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';

export interface Crane3DSplashProps {
  /** Duration of the cinematic camera orbit in milliseconds (default: 2200ms). */
  durationMs?: number;
  /** Optional callback fired once the 2.2s cinematic orbit completes. */
  onComplete?: () => void;
  /** Show minimal luxury typography & hairline progress overlay (default: true). */
  showOverlay?: boolean;
  /** Optional title displayed in the minimal overlay. */
  title?: string;
  /** Optional subtitle displayed in the minimal overlay. */
  subtitle?: string;
  /** Optional additional wrapper classes. */
  className?: string;
}

// Module-scoped reusable vectors (zero GC allocations inside render loop)
const _camTarget = new THREE.Vector3(0, 1.55, 0.25);
const _lookAtVec = new THREE.Vector3();

function detectSoftwareWebGL(): boolean {
  try {
    const probeCanvas = document.createElement('canvas');
    const gl = probeCanvas.getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function easeOutQuart(t: number): number {
  return 1 - Math.pow(1 - t, 4);
}

/** Procedural luxury obsidian stage floor texture with subtle metallic gold & slate grid */
function createStageGridTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    // Deep obsidian base
    ctx.fillStyle = '#070B14';
    ctx.fillRect(0, 0, size, size);

    // Subtle radial sheen
    const grad = ctx.createRadialGradient(
      size / 2,
      size / 2,
      30,
      size / 2,
      size / 2,
      size * 0.52
    );
    grad.addColorStop(0, 'rgba(245, 158, 11, 0.08)');
    grad.addColorStop(0.45, 'rgba(30, 41, 59, 0.16)');
    grad.addColorStop(1, 'rgba(7, 11, 20, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    // Fine sub-grid
    const subStep = size / 16;
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.07)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 16; i++) {
      const p = i * subStep;
      ctx.beginPath();
      ctx.moveTo(p, 0);
      ctx.lineTo(p, size);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, p);
      ctx.lineTo(size, p);
      ctx.stroke();
    }

    // Major metallic gold/amber accent grid
    const majorStep = size / 4;
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.16)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i <= 4; i++) {
      const p = i * majorStep;
      ctx.beginPath();
      ctx.moveTo(p, 0);
      ctx.lineTo(p, size);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, p);
      ctx.lineTo(size, p);
      ctx.stroke();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(8, 8);
  texture.anisotropy = maxAnisotropy;
  texture.needsUpdate = true;
  return texture;
}

/** Procedural diagonal safety chevron texture for counterweight & bumper accents */
function createChevronTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(0, 0, size, size);

    ctx.fillStyle = '#F59E0B';
    const stripeWidth = 32;
    for (let x = -size; x < size * 2; x += stripeWidth * 2) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + stripeWidth, 0);
      ctx.lineTo(x + stripeWidth - size, size);
      ctx.lineTo(x - size, size);
      ctx.closePath();
      ctx.fill();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 1);
  texture.anisotropy = maxAnisotropy;
  texture.needsUpdate = true;
  return texture;
}

/** Procedural rubber tire tread bump/color texture */
function createTireTreadTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const width = 256;
  const height = 128;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    ctx.fillStyle = '#12161F';
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = '#1E2430';
    for (let y = 0; y < height; y += 16) {
      ctx.fillRect(8, y + 2, width * 0.4, 9);
      ctx.fillRect(width * 0.54, y + 7, width * 0.4, 9);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 6);
  texture.anisotropy = maxAnisotropy;
  texture.needsUpdate = true;
  return texture;
}

/** Soft radial ground contact shadow texture */
function createContactShadowTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    const grad = ctx.createRadialGradient(
      size / 2,
      size / 2,
      size * 0.08,
      size / 2,
      size / 2,
      size * 0.5
    );
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.85)');
    grad.addColorStop(0.55, 'rgba(0, 0, 0, 0.45)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

export const Crane3DSplash: React.FC<Crane3DSplashProps> = ({
  durationMs = 2200,
  onComplete,
  showOverlay = true,
  title = 'GRUE MOBILE 25T',
  subtitle = 'ALL-TERRAIN CRANE SYSTEM',
  className = '',
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const progressBarRef = useRef<HTMLDivElement | null>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareWebGL();
    const disposables: Array<{ dispose: () => void }> = [];
    const track = <T extends { dispose: () => void }>(res: T): T => {
      disposables.push(res);
      return res;
    };

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // 1. Renderer
    const renderer = track(
      new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
      })
    );
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    container.appendChild(renderer.domElement);

    const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();

    // 2. Scene & Fog
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x070b14);
    scene.fog = new THREE.FogExp2(0x070b14, 0.032);

    // 3. Studio IBL Environment Map
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envRT = track(pmremGenerator.fromScene(roomEnv, 0.04));
    scene.environment = envRT.texture;
    roomEnv.dispose();
    pmremGenerator.dispose();

    // 4. Camera
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 120);

    // 5. Metallic Gold / Obsidian Lighting Rig
    const hemiLight = new THREE.HemisphereLight(0x4f6d9a, 0x070b14, 0.9);
    hemiLight.position.set(0, 18, 0);
    scene.add(hemiLight);

    // Key warm gold-white light
    const keyLight = new THREE.DirectionalLight(0xffe099, 3.1);
    keyLight.position.set(7.5, 11.5, 6.5);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 32;
    const d = 8.5;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    // Cool slate fill light
    const fillLight = new THREE.DirectionalLight(0x7aa2d8, 0.95);
    fillLight.position.set(-8, 5.5, -5);
    scene.add(fillLight);

    // Dramatic warm gold rim light behind the crane
    const rimSpot = new THREE.SpotLight(0xfbbf24, 55, 28, Math.PI / 4, 0.65, 1.8);
    rimSpot.position.set(-6.5, 7.2, 6.2);
    rimSpot.target.position.set(0, 1.5, 0);
    scene.add(rimSpot);
    scene.add(rimSpot.target);

    // Overhead luxury studio softbox (skip on software WebGL)
    if (!isSoftwareGl) {
      RectAreaLightUniformsLib.init();
      const topStripLight = new THREE.RectAreaLight(0xffd27d, 4.2, 10, 2.2);
      topStripLight.position.set(0, 8.5, 0);
      topStripLight.lookAt(0, 1.4, 0);
      scene.add(topStripLight);
    }

    // 6. Procedural Textures & Luxury PBR Material Library
    const gridTexture = track(createStageGridTexture(maxAnisotropy));
    const chevronTexture = track(createChevronTexture(maxAnisotropy));
    const treadTexture = track(createTireTreadTexture(maxAnisotropy));
    const contactShadowTex = track(createContactShadowTexture());

    const stageFloorMat = track(
      new THREE.MeshPhysicalMaterial({
        color: 0x0b1120,
        map: gridTexture,
        metalness: 0.42,
        roughness: 0.24,
        clearcoat: 0.85,
        clearcoatRoughness: 0.16,
        reflectivity: 0.9,
      })
    );

    const goldRingMat = track(
      new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        emissive: 0xb45309,
        emissiveIntensity: 0.45,
        metalness: 0.92,
        roughness: 0.2,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      })
    );

    const craneGoldPaintMat = track(
      new THREE.MeshPhysicalMaterial({
        color: 0xf59e0b,
        metalness: 0.56,
        roughness: 0.22,
        clearcoat: 0.95,
        clearcoatRoughness: 0.12,
      })
    );

    const brushedGoldTrimMat = track(
      new THREE.MeshPhysicalMaterial({
        color: 0xd4af37,
        metalness: 0.94,
        roughness: 0.18,
        anisotropy: 0.75,
      })
    );

    const obsidianSteelMat = track(
      new THREE.MeshStandardMaterial({
        color: 0x161f30,
        metalness: 0.72,
        roughness: 0.34,
      })
    );

    const darkChassisMat = track(
      new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        metalness: 0.6,
        roughness: 0.46,
      })
    );

    const chromeMat = track(
      new THREE.MeshStandardMaterial({
        color: 0xf8fafc,
        metalness: 0.98,
        roughness: 0.08,
      })
    );

    const rubberTireMat = track(
      new THREE.MeshStandardMaterial({
        color: 0x141821,
        map: treadTexture,
        metalness: 0.05,
        roughness: 0.85,
      })
    );

    const glassMat = track(
      new THREE.MeshPhysicalMaterial({
        color: 0x091322,
        metalness: 0.1,
        roughness: 0.06,
        clearcoat: 1.0,
        clearcoatRoughness: 0.04,
        transparent: true,
        opacity: isSoftwareGl ? 0.48 : 0.72,
        reflectivity: 1.0,
      })
    );

    const chevronMat = track(
      new THREE.MeshStandardMaterial({
        map: chevronTexture,
        metalness: 0.25,
        roughness: 0.42,
      })
    );

    const headlightMat = track(
      new THREE.MeshStandardMaterial({
        color: 0xfffbeb,
        emissive: 0xfde68a,
        emissiveIntensity: 2.2,
        roughness: 0.15,
      })
    );

    const beaconAmberMat = track(
      new THREE.MeshStandardMaterial({
        color: 0xfbbf24,
        emissive: 0xf59e0b,
        emissiveIntensity: 1.9,
        roughness: 0.2,
      })
    );

    const cableMat = track(
      new THREE.MeshStandardMaterial({
        color: 0x94a3b8,
        metalness: 0.88,
        roughness: 0.28,
      })
    );

    // Helper for adding shadowed meshes cleanly
    const addMesh = (
      parent: THREE.Object3D,
      geo: THREE.BufferGeometry,
      mat: THREE.Material,
      castShadow = true,
      receiveShadow = true
    ) => {
      track(geo);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = castShadow;
      mesh.receiveShadow = receiveShadow;
      parent.add(mesh);
      return mesh;
    };

    // 7. Luxury Obsidian Reflective Stage Floor
    const floorMesh = addMesh(
      scene,
      new THREE.CircleGeometry(36, 64),
      stageFloorMat,
      false,
      true
    );
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.y = 0;

    // Subtle concentric gold stage rings (offset slightly via polygonOffset)
    const outerStageRing = addMesh(
      scene,
      new THREE.RingGeometry(4.65, 4.71, 96),
      goldRingMat,
      false,
      false
    );
    outerStageRing.rotation.x = -Math.PI / 2;
    outerStageRing.position.y = 0.008;

    const innerStageRing = addMesh(
      scene,
      new THREE.RingGeometry(3.62, 3.65, 96),
      goldRingMat,
      false,
      false
    );
    innerStageRing.rotation.x = -Math.PI / 2;
    innerStageRing.position.y = 0.008;

    // Soft grounded contact shadow plane under the crane
    const contactShadowMat = track(
      new THREE.MeshBasicMaterial({
        map: contactShadowTex,
        transparent: true,
        opacity: 0.65,
        depthWrite: false,
      })
    );
    const contactShadowPlane = addMesh(
      scene,
      new THREE.PlaneGeometry(8.2, 4.8),
      contactShadowMat,
      false,
      false
    );
    contactShadowPlane.rotation.x = -Math.PI / 2;
    contactShadowPlane.position.set(0.15, 0.012, 0);

    // 8. Composite 3D Mobile Wheeled Crane (Grounded at y = 0)
    // Orientation: Front of carrier points toward +X, Rear toward -X, Width along Z.
    const craneRoot = new THREE.Group();
    scene.add(craneRoot);

    const wheelRadius = 0.44;
    const wheelWidth = 0.28;
    const trackHalfWidth = 0.94; // Z offset left/right
    const axleXs = [2.25, 0.85, -0.75, -2.0]; // 4 axles (8 wheels)

    // 8A. Carrier Frame & 4 Axles / 8 Wheels
    const carrierGroup = new THREE.Group();
    craneRoot.add(carrierGroup);

    // Main chassis twin longitudinal beams + central deck
    addMesh(
      carrierGroup,
      new THREE.BoxGeometry(5.8, 0.34, 1.44),
      darkChassisMat
    ).position.set(0.1, 0.62, 0);

    // Upper carrier steel diamond-deck plating
    addMesh(
      carrierGroup,
      new THREE.BoxGeometry(5.6, 0.08, 1.62),
      obsidianSteelMat
    ).position.set(0.08, 0.82, 0);

    // Gold side trim skirts along the carrier
    [-0.82, 0.82].forEach((zSide) => {
      addMesh(
        carrierGroup,
        new THREE.BoxGeometry(4.3, 0.14, 0.05),
        craneGoldPaintMat
      ).position.set(-0.2, 0.72, zSide);
    });

    // Rear chevron safety bumper
    addMesh(
      carrierGroup,
      new THREE.BoxGeometry(0.18, 0.3, 1.66),
      chevronMat
    ).position.set(-2.82, 0.56, 0);

    // Front bumper with headlights & gold tow bar
    addMesh(
      carrierGroup,
      new THREE.BoxGeometry(0.24, 0.34, 1.68),
      obsidianSteelMat
    ).position.set(3.04, 0.54, 0);

    [-0.62, 0.62].forEach((zLamp) => {
      addMesh(
        carrierGroup,
        new THREE.BoxGeometry(0.06, 0.12, 0.24),
        headlightMat,
        false,
        false
      ).position.set(3.15, 0.58, zLamp);
    });

    // Shared wheel geometries (reused across all 8 wheels)
    const tireGeo = track(new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelWidth, 28));
    tireGeo.rotateX(Math.PI / 2);

    const tireShoulderGeo = track(new THREE.TorusGeometry(wheelRadius - 0.05, 0.055, 10, 28));

    const rimGeo = track(new THREE.CylinderGeometry(0.24, 0.24, wheelWidth + 0.02, 20));
    rimGeo.rotateX(Math.PI / 2);

    const hubCapGeo = track(new THREE.CylinderGeometry(0.11, 0.13, wheelWidth + 0.07, 16));
    hubCapGeo.rotateX(Math.PI / 2);

    const axleBeamGeo = track(new THREE.CylinderGeometry(0.085, 0.085, trackHalfWidth * 2, 12));
    axleBeamGeo.rotateX(Math.PI / 2);

    const lugGeo = track(new THREE.CylinderGeometry(0.016, 0.016, 0.03, 8));
    lugGeo.rotateX(Math.PI / 2);

    axleXs.forEach((axX) => {
      // Heavy axle differential tube
      addMesh(carrierGroup, axleBeamGeo, darkChassisMat).position.set(axX, wheelRadius, 0);

      // Left and right wheels per axle (4 axles * 2 = 8 wheels)
      [-trackHalfWidth, trackHalfWidth].forEach((zPos) => {
        const wheelGroup = new THREE.Group();
        wheelGroup.position.set(axX, wheelRadius, zPos);
        carrierGroup.add(wheelGroup);

        const tireMesh = new THREE.Mesh(tireGeo, rubberTireMat);
        tireMesh.castShadow = true;
        tireMesh.receiveShadow = true;
        wheelGroup.add(tireMesh);

        // Outer & inner tire bevel shoulders
        const sign = Math.sign(zPos);
        const shoulderOut = new THREE.Mesh(tireShoulderGeo, rubberTireMat);
        shoulderOut.position.z = sign * (wheelWidth * 0.36);
        wheelGroup.add(shoulderOut);

        const rimMesh = new THREE.Mesh(rimGeo, brushedGoldTrimMat);
        rimMesh.castShadow = true;
        wheelGroup.add(rimMesh);

        const hubMesh = new THREE.Mesh(hubCapGeo, obsidianSteelMat);
        wheelGroup.add(hubMesh);

        // 6 radial wheel lug bolts
        for (let l = 0; l < 6; l++) {
          const angle = (l / 6) * Math.PI * 2;
          const lug = new THREE.Mesh(lugGeo, chromeMat);
          lug.position.set(
            Math.cos(angle) * 0.17,
            Math.sin(angle) * 0.17,
            sign * (wheelWidth * 0.52)
          );
          wheelGroup.add(lug);
        }

        // Wheel arch fender mounted above tire
        addMesh(
          carrierGroup,
          new THREE.BoxGeometry(0.92, 0.06, 0.34),
          obsidianSteelMat
        ).position.set(axX, 0.93, zPos);
      });
    });

    // 4 Deployable Outrigger Stabilizer Jacks (grounded cleanly at y = 0)
    const outriggerXs = [1.55, -1.42];
    outriggerXs.forEach((ox) => {
      [-1, 1].forEach((side) => {
        // Transverse outrigger box beam
        addMesh(
          carrierGroup,
          new THREE.BoxGeometry(0.22, 0.2, 0.65),
          craneGoldPaintMat
        ).position.set(ox, 0.56, side * 1.05);

        // Chrome hydraulic stabilizer cylinder
        addMesh(
          carrierGroup,
          new THREE.CylinderGeometry(0.065, 0.065, 0.54, 14),
          chromeMat
        ).position.set(ox, 0.31, side * 1.3);

        // Grounded steel stabilizer pad (bottom flush at y = 0)
        addMesh(
          carrierGroup,
          new THREE.CylinderGeometry(0.18, 0.2, 0.05, 16),
          obsidianSteelMat
        ).position.set(ox, 0.025, side * 1.3);
      });
    });

    // 8B. Front Carrier Truck Cab (ExtrudeGeometry with sloped windshield profile)
    const cabGroup = new THREE.Group();
    cabGroup.position.set(1.92, 0.86, 0);
    carrierGroup.add(cabGroup);

    const cabShape = new THREE.Shape();
    cabShape.moveTo(0.0, 0.0);
    cabShape.lineTo(1.16, 0.0);
    cabShape.lineTo(1.18, 0.42);
    cabShape.lineTo(0.95, 0.94); // Sloped aerodynamic windshield
    cabShape.lineTo(0.14, 0.96);
    cabShape.lineTo(0.0, 0.82);
    cabShape.closePath();

    const cabExtrudeGeo = new THREE.ExtrudeGeometry(cabShape, {
      depth: 1.54,
      bevelEnabled: true,
      bevelThickness: 0.04,
      bevelSize: 0.04,
      bevelSegments: 3,
    });
    cabExtrudeGeo.translate(0, 0, -0.77);
    addMesh(cabGroup, cabExtrudeGeo, craneGoldPaintMat);

    // Front recessed sloped windshield glass
    const windshieldMesh = addMesh(
      cabGroup,
      new THREE.BoxGeometry(0.05, 0.46, 1.36),
      glassMat,
      false,
      false
    );
    windshieldMesh.position.set(1.06, 0.68, 0);
    windshieldMesh.rotation.z = 0.4;

    // Side cab windows (Left & Right)
    [-0.78, 0.78].forEach((zWin) => {
      addMesh(
        cabGroup,
        new THREE.BoxGeometry(0.68, 0.38, 0.04),
        glassMat,
        false,
        false
      ).position.set(0.55, 0.66, zWin);

      // Side mirror arm & housing
      addMesh(
        cabGroup,
        new THREE.BoxGeometry(0.06, 0.22, 0.08),
        obsidianSteelMat
      ).position.set(0.94, 0.62, zWin + Math.sign(zWin) * 0.14);
    });

    // Front grille slats
    addMesh(
      cabGroup,
      new THREE.BoxGeometry(0.06, 0.24, 1.12),
      obsidianSteelMat
    ).position.set(1.18, 0.24, 0);

    // Roof amber warning lightbar
    [-0.42, 0.42].forEach((zB) => {
      addMesh(
        cabGroup,
        new THREE.CylinderGeometry(0.055, 0.065, 0.09, 14),
        beaconAmberMat,
        false,
        false
      ).position.set(0.45, 1.03, zB);
    });

    // 8C. Upper Rotating Superstructure (Turntable, Operator Cabin, Counterweights & Boom)
    const slewingRingGroup = new THREE.Group();
    slewingRingGroup.position.set(-0.55, 0.86, 0);
    craneRoot.add(slewingRingGroup);

    // Turntable slew bearing drum
    addMesh(
      slewingRingGroup,
      new THREE.CylinderGeometry(0.76, 0.8, 0.22, 32),
      obsidianSteelMat
    ).position.set(0, 0.11, 0);

    addMesh(
      slewingRingGroup,
      new THREE.CylinderGeometry(0.79, 0.79, 0.05, 32),
      brushedGoldTrimMat
    ).position.set(0, 0.12, 0);

    // Rotating upper deck platform
    const upperDeckGroup = new THREE.Group();
    upperDeckGroup.position.set(0, 0.22, 0);
    // Slight initial angle so we can perform a sleek 12-deg cinematic slew settle
    upperDeckGroup.rotation.y = 0.22;
    slewingRingGroup.add(upperDeckGroup);

    // Main superstructure chassis plate
    addMesh(
      upperDeckGroup,
      new THREE.BoxGeometry(2.85, 0.24, 1.56),
      obsidianSteelMat
    ).position.set(-0.32, 0.12, 0);

    // Side machinery cowling (Gold painted engine bay)
    addMesh(
      upperDeckGroup,
      new THREE.BoxGeometry(1.75, 0.72, 0.74),
      craneGoldPaintMat
    ).position.set(-0.35, 0.58, -0.34);

    // Chrome exhaust stack rising behind engine hood
    addMesh(
      upperDeckGroup,
      new THREE.CylinderGeometry(0.055, 0.06, 0.72, 14),
      chromeMat
    ).position.set(-1.05, 1.1, -0.52);

    // Heavy Rear Counterweight Stack (with metallic gold trim & chevron stripe)
    const cwShape = new THREE.Shape();
    cwShape.moveTo(0, 0);
    cwShape.lineTo(0.86, 0);
    cwShape.lineTo(0.92, 0.65);
    cwShape.lineTo(0.18, 0.78);
    cwShape.lineTo(0, 0.58);
    cwShape.closePath();

    const cwGeo = new THREE.ExtrudeGeometry(cwShape, {
      depth: 1.52,
      bevelEnabled: true,
      bevelThickness: 0.04,
      bevelSize: 0.04,
      bevelSegments: 2,
    });
    cwGeo.translate(-1.95, 0.24, -0.76);
    addMesh(upperDeckGroup, cwGeo, obsidianSteelMat);

    // Gold counterweight trim plate
    addMesh(
      upperDeckGroup,
      new THREE.BoxGeometry(0.08, 0.42, 1.48),
      brushedGoldTrimMat
    ).position.set(-1.96, 0.56, 0);

    // Side Operator Crane Cabin (left side +Z)
    const opCabGroup = new THREE.Group();
    opCabGroup.position.set(0.32, 0.24, 0.48);
    upperDeckGroup.add(opCabGroup);

    const opShape = new THREE.Shape();
    opShape.moveTo(-0.55, 0);
    opShape.lineTo(0.55, 0);
    opShape.lineTo(0.68, 0.62);
    opShape.lineTo(0.5, 1.12);
    opShape.lineTo(-0.52, 1.12);
    opShape.lineTo(-0.58, 0.85);
    opShape.closePath();

    const opGeo = new THREE.ExtrudeGeometry(opShape, {
      depth: 0.62,
      bevelEnabled: true,
      bevelThickness: 0.03,
      bevelSize: 0.03,
      bevelSegments: 2,
    });
    opGeo.translate(0, 0, -0.31);
    addMesh(opCabGroup, opGeo, craneGoldPaintMat);

    // Operator cabin panoramic glass front & side
    const opFrontGlass = addMesh(
      opCabGroup,
      new THREE.BoxGeometry(0.04, 0.74, 0.52),
      glassMat,
      false,
      false
    );
    opFrontGlass.position.set(0.58, 0.72, 0);
    opFrontGlass.rotation.z = 0.18;

    addMesh(
      opCabGroup,
      new THREE.BoxGeometry(0.84, 0.68, 0.04),
      glassMat,
      false,
      false
    ).position.set(0.02, 0.72, 0.32);

    // Boom A-frame pivot pedestal
    addMesh(
      upperDeckGroup,
      new THREE.BoxGeometry(0.76, 0.88, 0.58),
      obsidianSteelMat
    ).position.set(-0.55, 0.68, -0.18);

    // 8D. Telescopic Hydraulic Boom Lifting a Hook Block
    const boomPivot = new THREE.Group();
    boomPivot.position.set(-0.62, 1.02, -0.18);
    // Elevated boom angle (~42 degrees upward toward +X)
    boomPivot.rotation.z = 0.73;
    upperDeckGroup.add(boomPivot);

    // Base boom section (heavy beveled steel + gold paint)
    addMesh(
      boomPivot,
      new THREE.BoxGeometry(3.25, 0.44, 0.42),
      craneGoldPaintMat
    ).position.set(1.42, 0, 0);

    // Boom stage 2 (extended)
    addMesh(
      boomPivot,
      new THREE.BoxGeometry(2.45, 0.36, 0.34),
      craneGoldPaintMat
    ).position.set(3.25, 0, 0);

    // Boom stage 3 (extended)
    addMesh(
      boomPivot,
      new THREE.BoxGeometry(1.95, 0.28, 0.26),
      brushedGoldTrimMat
    ).position.set(4.55, 0, 0);

    // Boom stage 4 (inner tip section)
    addMesh(
      boomPivot,
      new THREE.BoxGeometry(1.45, 0.22, 0.2),
      obsidianSteelMat
    ).position.set(5.55, 0, 0);

    // Collar trim rings between telescopic stages
    [2.98, 4.4, 5.45].forEach((xCollar, idx) => {
      const s = 0.46 - idx * 0.07;
      addMesh(
        boomPivot,
        new THREE.BoxGeometry(0.09, s, s),
        obsidianSteelMat
      ).position.set(xCollar, 0, 0);
    });

    // Twin hydraulic luffing lift cylinder (lower superstructure to boom belly)
    // Positioned at midpoint between superstructure bracket and boom underside
    const cylBarrel = addMesh(
      boomPivot,
      new THREE.CylinderGeometry(0.085, 0.085, 1.35, 16),
      obsidianSteelMat
    );
    cylBarrel.position.set(1.12, -0.38, 0);
    cylBarrel.rotation.z = Math.PI / 2 - 0.34;

    const cylRod = addMesh(
      boomPivot,
      new THREE.CylinderGeometry(0.055, 0.055, 1.15, 16),
      chromeMat
    );
    cylRod.position.set(1.85, -0.18, 0);
    cylRod.rotation.z = Math.PI / 2 - 0.34;

    // Boom Head Sheave Assembly at Tip (x = 6.28)
    const tipX = 6.28;
    addMesh(
      boomPivot,
      new THREE.BoxGeometry(0.38, 0.36, 0.28),
      craneGoldPaintMat
    ).position.set(tipX, -0.02, 0);

    const sheaveGeo = track(new THREE.CylinderGeometry(0.16, 0.16, 0.06, 20));
    sheaveGeo.rotateX(Math.PI / 2);
    [-0.07, 0.07].forEach((zSh) => {
      addMesh(boomPivot, sheaveGeo, brushedGoldTrimMat).position.set(tipX + 0.14, -0.08, zSh);
    });

    // Winch Drum behind boom pivot + top hoist wire running to tip
    const winchDrum = addMesh(
      boomPivot,
      new THREE.CylinderGeometry(0.17, 0.17, 0.36, 20),
      obsidianSteelMat
    );
    winchDrum.rotation.x = Math.PI / 2;
    winchDrum.position.set(-0.22, 0.24, 0);

    const topWire = addMesh(
      boomPivot,
      new THREE.CylinderGeometry(0.012, 0.012, 6.45, 8),
      cableMat,
      false,
      false
    );
    topWire.rotation.z = Math.PI / 2;
    topWire.position.set(3.0, 0.24, 0);

    // 8E. Vertical Hoist Cables + Weighted Hook Block Hanging Plumb Downward
    // Counter-rotate by -boomPivot.rotation.z so cable & hook hang vertically under gravity!
    const hookHangPivot = new THREE.Group();
    hookHangPivot.position.set(tipX + 0.16, -0.12, 0);
    hookHangPivot.rotation.z = -boomPivot.rotation.z;
    boomPivot.add(hookHangPivot);

    const cableLength = 2.35;
    [-0.055, 0.055].forEach((zC) => {
      addMesh(
        hookHangPivot,
        new THREE.CylinderGeometry(0.013, 0.013, cableLength, 8),
        cableMat
      ).position.set(0, -cableLength / 2, zC);
    });

    // Heavy Hook Block Assembly at bottom of hoist cables
    const hookBlockGroup = new THREE.Group();
    hookBlockGroup.position.set(0, -cableLength, 0);
    hookHangPivot.add(hookBlockGroup);

    // Chevron-striped steel sheave block housing
    addMesh(
      hookBlockGroup,
      new THREE.BoxGeometry(0.24, 0.34, 0.18),
      chevronMat
    ).position.set(0, 0, 0);

    // Brushed gold side plates on hook block
    [-0.095, 0.095].forEach((zPl) => {
      addMesh(
        hookBlockGroup,
        new THREE.BoxGeometry(0.2, 0.3, 0.025),
        brushedGoldTrimMat
      ).position.set(0, 0, zPl);
    });

    // Swivel clevis & collar
    addMesh(
      hookBlockGroup,
      new THREE.CylinderGeometry(0.045, 0.055, 0.12, 14),
      chromeMat
    ).position.set(0, -0.22, 0);

    // Forged curved J-Hook built with CatmullRomCurve3 + TubeGeometry
    const hookCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, -0.26, 0),
      new THREE.Vector3(0, -0.36, 0),
      new THREE.Vector3(0.09, -0.46, 0),
      new THREE.Vector3(0.02, -0.58, 0),
      new THREE.Vector3(-0.1, -0.55, 0),
      new THREE.Vector3(-0.12, -0.44, 0),
    ]);
    addMesh(
      hookBlockGroup,
      new THREE.TubeGeometry(hookCurve, 24, 0.032, 10, false),
      obsidianSteelMat
    );

    // Pre-warm shaders on hardware GPUs to prevent first-frame stutter
    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // 9. Cinematic Camera Orbit Animation (2.2 seconds default)
    const clock = new THREE.Clock();
    let frameId = 0;
    let disposed = false;
    let completed = false;

    const updateCameraAndRig = (elapsedSec: number) => {
      const durationSec = Math.max(0.5, durationMs / 1000);
      const rawT = Math.min(1, elapsedSec / durationSec);
      const eased = easeInOutCubic(rawT);
      const settleEased = easeOutQuart(rawT);

      // Cinematic orbit sweep: starts low front-3/4, sweeps smoothly around crane
      const startAngle = 0.68; // ~39 deg (front-right hero angle)
      const endAngle = -1.22; // ~-70 deg (sweeps past front across broadside)
      const idleDrift = rawT >= 1 ? (elapsedSec - durationSec) * 0.09 : 0;
      const angle = THREE.MathUtils.lerp(startAngle, endAngle, eased) - idleDrift;

      const radius = THREE.MathUtils.lerp(9.6, 8.15, eased);
      const heightY = THREE.MathUtils.lerp(2.25, 3.65, eased);

      camera.position.set(
        Math.cos(angle) * radius,
        heightY,
        Math.sin(angle) * radius
      );

      _lookAtVec.copy(_camTarget);
      _lookAtVec.y = THREE.MathUtils.lerp(1.35, 1.72, eased);
      camera.lookAt(_lookAtVec);

      // Subtle mechanical poise during the 2.2s cinematic sweep
      upperDeckGroup.rotation.y = THREE.MathUtils.lerp(0.26, 0.05, settleEased);
      hookBlockGroup.rotation.y = Math.sin(elapsedSec * 1.4) * 0.08 * (1 - rawT * 0.5);

      // Direct DOM update for smooth 60fps progress hairline with zero React re-renders
      if (progressBarRef.current) {
        progressBarRef.current.style.transform = `scaleX(${rawT.toFixed(4)})`;
      }

      if (rawT >= 1 && !completed) {
        completed = true;
        onCompleteRef.current?.();
      }
    };

    // Initial frame pose
    updateCameraAndRig(0);

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (!gl || typeof gl.fenceSync !== 'function') {
        frameId = window.setTimeout(cb, 80);
        return;
      }
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) {
          if (sync) gl.deleteSync(sync);
          return;
        }
        const state = sync ? gl.getSyncParameter(sync, gl.SYNC_STATUS) : gl.SIGNALED;
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    const tick = () => {
      if (disposed) return;
      const elapsed = clock.getElapsedTime();
      updateCameraAndRig(elapsed);
      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    };

    if (isSoftwareGl) {
      renderer.render(scene, camera);
      afterDraw(tick);
    } else {
      frameId = requestAnimationFrame(tick);
    }

    // 10. Responsive Resize Handling
    const handleResize = () => {
      if (!container || disposed) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      if (w <= 0 || h <= 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    const resizeObserver =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(handleResize) : null;
    resizeObserver?.observe(container);
    window.addEventListener('resize', handleResize);

    // 11. Strict Cleanup & Resource Disposal
    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      resizeObserver?.disconnect();
      window.removeEventListener('resize', handleResize);

      for (let i = disposables.length - 1; i >= 0; i--) {
        try {
          disposables[i].dispose();
        } catch {
          // Ignore already disposed resources
        }
      }

      if (renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [durationMs]);

  return (
    <div
      className={`relative w-full h-full min-h-[320px] bg-[#070B14] overflow-hidden select-none ${className}`}
    >
      {/* Isolated WebGL canvas mount */}
      <div ref={mountRef} className="absolute inset-0 w-full h-full" />

      {/* Minimal luxury bottom title & progress hairline (solid surface, zero backdrop-blur) */}
      {showOverlay && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 p-6 sm:p-8 flex flex-col items-center text-center">
          <div className="bg-[#0B1120]/90 border border-amber-500/25 rounded-2xl px-6 py-4 max-w-sm w-full shadow-2xl">
            <div className="flex items-center justify-center gap-2.5">
              <span className="px-2 py-0.5 rounded-md bg-amber-400 text-slate-950 font-extrabold text-xs tracking-wider">
                25T
              </span>
              <h1 className="text-sm sm:text-base font-extrabold tracking-[0.14em] text-amber-50 uppercase">
                {title}
              </h1>
            </div>
            <p className="text-[11px] font-semibold tracking-[0.2em] text-amber-400/80 mt-1 uppercase">
              {subtitle}
            </p>
            <div className="mt-3.5 h-1 w-full rounded-full bg-slate-800 overflow-hidden">
              <div
                ref={progressBarRef}
                className="h-full w-full origin-left scale-x-0 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-300"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Crane3DSplash;
