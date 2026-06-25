import { useEffect, useRef } from 'react';
import * as THREE from 'three';

/**
 * Lazy-loaded three.js hero — a "songket" centrepiece for first-time visitors.
 *
 * A slowly turning faceted ringgit "gem" core wrapped in a woven gold thread knot,
 * encased in a procedural diamond-lattice shell (the kain motif), orbited by gold
 * coins, with a drifting thread field + rising gold spark motes. Pointer-reactive,
 * theme-aware, reduced-motion friendly.
 *
 * The scene is built ONCE. Theme changes are NOT a teardown/rebuild — the loop
 * smoothly lerps the theme-dependent colours/intensities toward the new target, so
 * toggling light/dark glides instead of snapping. Everything is generated in code
 * (no remote assets — strict-CSP safe); GPU resources are disposed and the WebGL
 * context released on unmount.
 */

const GOLD = 0xe8b23a;
const GOLD_BRIGHT = 0xf6cf63;

interface Targets {
  core: THREE.Color;
  teal: THREE.Color;
  fog: THREE.Color;
  points: THREE.Color;
  fogDensity: number;
  ambient: number;
  coreEmissive: number;
  latticeOpacity: number;
  coinEmissive: number;
}

function targetsFor(dark: boolean): Targets {
  return {
    core: new THREE.Color(dark ? 0x0e2b2b : 0x1f9e88), // luminous jade in light
    teal: new THREE.Color(dark ? 0x2dd4bf : 0x17b39c),
    fog: new THREE.Color(dark ? 0x07100f : 0xf5eedd),
    points: new THREE.Color(dark ? 0x2dd4bf : 0xcf9f3a),
    fogDensity: dark ? 0.035 : 0.024,
    ambient: dark ? 0.45 : 1.0,
    coreEmissive: dark ? 0.18 : 0.14,
    latticeOpacity: dark ? 0.32 : 0.26,
    coinEmissive: dark ? 0.1 : 0.24,
  };
}

export default function Hero3D({ dark }: { dark: boolean }) {
  const mountRef = useRef<HTMLDivElement>(null);
  // Theme targets the render loop lerps toward (updated when `dark` changes).
  const targetRef = useRef<Targets>(targetsFor(dark));

  // Smoothly retarget colours on theme change — NO rebuild.
  useEffect(() => {
    targetRef.current = targetsFor(dark);
  }, [dark]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const width = mount.clientWidth || 320;
    const height = mount.clientHeight || 280;
    const init = targetRef.current;

    const scene = new THREE.Scene();
    const fog = new THREE.FogExp2(init.fog.getHex(), init.fogDensity);
    scene.fog = fog;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0, 9.5);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    mount.appendChild(renderer.domElement);

    // ---------------------------------------------------------------- lights
    const ambient = new THREE.AmbientLight(0xffffff, init.ambient);
    scene.add(ambient);
    const key = new THREE.DirectionalLight(0xfff4e0, 1.25);
    key.position.set(4, 6, 6);
    scene.add(key);
    const goldRim = new THREE.PointLight(GOLD_BRIGHT, 2.0, 60);
    goldRim.position.set(-5, -2, 5);
    scene.add(goldRim);
    const tealFill = new THREE.PointLight(init.teal.getHex(), 1.4, 60);
    tealFill.position.set(5, -3, -2);
    scene.add(tealFill);

    const geometries: THREE.BufferGeometry[] = [];
    const materials: THREE.Material[] = [];
    const track = <T extends THREE.BufferGeometry | THREE.Material>(x: T): T => {
      if (x instanceof THREE.BufferGeometry) geometries.push(x);
      else materials.push(x);
      return x;
    };

    const group = new THREE.Group();
    scene.add(group);

    // ---------------------------------------------- faceted ringgit core gem
    const coreGeo = track(new THREE.IcosahedronGeometry(1.55, 1));
    const coreMat = track(
      new THREE.MeshStandardMaterial({
        color: init.core.clone(),
        metalness: 0.55,
        roughness: 0.3,
        flatShading: true,
        emissive: init.teal.clone(),
        emissiveIntensity: init.coreEmissive,
      }),
    );
    const core = new THREE.Mesh(coreGeo, coreMat);
    group.add(core);

    // Woven gold thread knot wrapping the core.
    const knotGeo = track(new THREE.TorusKnotGeometry(1.95, 0.058, 220, 12, 2, 3));
    const knot = new THREE.Mesh(
      knotGeo,
      track(
        new THREE.MeshStandardMaterial({
          color: GOLD,
          metalness: 0.95,
          roughness: 0.22,
          emissive: new THREE.Color(GOLD),
          emissiveIntensity: 0.12,
        }),
      ),
    );
    group.add(knot);

    // -------------------------------------- songket diamond-lattice shell
    const latticePts: number[] = [];
    const R = 2.7;
    const rings = 9;
    const seg = 48;
    for (let r = 1; r < rings; r++) {
      const phi = (r / rings) * Math.PI;
      const y = Math.cos(phi) * R;
      const rad = Math.sin(phi) * R;
      for (let s = 0; s < seg; s++) {
        const a0 = (s / seg) * Math.PI * 2;
        const a1 = ((s + 1) / seg) * Math.PI * 2;
        latticePts.push(Math.cos(a0) * rad, y, Math.sin(a0) * rad);
        latticePts.push(Math.cos(a1) * rad, y, Math.sin(a1) * rad);
      }
    }
    for (let s = 0; s < seg; s += 2) {
      for (let r = 0; r < rings; r++) {
        const phi0 = (r / rings) * Math.PI;
        const phi1 = ((r + 1) / rings) * Math.PI;
        const a0 = (s / seg) * Math.PI * 2;
        const a1 = ((s + 1) / seg) * Math.PI * 2;
        const p0 = [Math.cos(a0) * Math.sin(phi0) * R, Math.cos(phi0) * R, Math.sin(a0) * Math.sin(phi0) * R];
        const p1 = [Math.cos(a1) * Math.sin(phi1) * R, Math.cos(phi1) * R, Math.sin(a1) * Math.sin(phi1) * R];
        latticePts.push(p0[0], p0[1], p0[2], p1[0], p1[1], p1[2]);
      }
    }
    const latticeGeo = track(new THREE.BufferGeometry());
    latticeGeo.setAttribute('position', new THREE.Float32BufferAttribute(latticePts, 3));
    const latticeMat = track(
      new THREE.LineBasicMaterial({ color: GOLD, transparent: true, opacity: init.latticeOpacity }),
    );
    const lattice = new THREE.LineSegments(latticeGeo, latticeMat);
    group.add(lattice);

    // ---------------------------------------------------- orbiting gold coins
    const coinGeo = track(new THREE.CylinderGeometry(0.62, 0.62, 0.12, 40));
    const coinMat = track(
      new THREE.MeshStandardMaterial({
        color: GOLD_BRIGHT,
        metalness: 0.92,
        roughness: 0.26,
        emissive: new THREE.Color(GOLD),
        emissiveIntensity: init.coinEmissive,
      }),
    );
    const coins: { mesh: THREE.Mesh; radius: number; speed: number; phase: number; tilt: number; yBob: number }[] = [];
    const COIN_COUNT = 6;
    for (let i = 0; i < COIN_COUNT; i++) {
      const mesh = new THREE.Mesh(coinGeo, coinMat);
      mesh.rotation.x = Math.PI / 2.3;
      group.add(mesh);
      coins.push({
        mesh,
        radius: 3.4 + (i % 3) * 0.55,
        speed: 0.32 + (i % 3) * 0.1,
        phase: (i / COIN_COUNT) * Math.PI * 2,
        tilt: (i % 2 ? 1 : -1) * (0.5 + (i % 3) * 0.25),
        yBob: 0.3 + (i % 2) * 0.25,
      });
    }

    // ------------------------------------------------- drifting thread field
    const PARTS = 220;
    const pPos = new Float32Array(PARTS * 3);
    for (let i = 0; i < PARTS; i++) {
      pPos[i * 3] = (Math.random() - 0.5) * 18;
      pPos[i * 3 + 1] = (Math.random() - 0.5) * 13;
      pPos[i * 3 + 2] = (Math.random() - 0.5) * 9 - 2;
    }
    const pGeo = track(new THREE.BufferGeometry());
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    const pointsMat = track(
      new THREE.PointsMaterial({
        color: init.points.clone(),
        size: 0.055,
        transparent: true,
        opacity: 0.6,
        sizeAttenuation: true,
      }),
    );
    const points = new THREE.Points(pGeo, pointsMat);
    scene.add(points);

    // ------------------------------------------------ rising gold spark motes
    const SPARKS = 70;
    const sPos = new Float32Array(SPARKS * 3);
    const sSeed = new Float32Array(SPARKS);
    for (let i = 0; i < SPARKS; i++) {
      sPos[i * 3] = (Math.random() - 0.5) * 11;
      sPos[i * 3 + 1] = (Math.random() - 0.5) * 9;
      sPos[i * 3 + 2] = (Math.random() - 0.5) * 6;
      sSeed[i] = Math.random() * 100;
    }
    const sGeo = track(new THREE.BufferGeometry());
    sGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
    const sparks = new THREE.Points(
      sGeo,
      track(
        new THREE.PointsMaterial({
          color: GOLD_BRIGHT,
          size: 0.1,
          transparent: true,
          opacity: 0.85,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      ),
    );
    scene.add(sparks);

    // -------------------------------------------------------- pointer parallax
    const targetRot = { x: 0, y: 0 };
    const onPointer = (e: PointerEvent) => {
      const r = mount.getBoundingClientRect();
      targetRot.x = ((e.clientX - r.left) / r.width - 0.5) * 0.7;
      targetRot.y = ((e.clientY - r.top) / r.height - 0.5) * 0.7;
    };
    mount.addEventListener('pointermove', onPointer);

    const start = performance.now();
    let raf = 0;
    const render = () => {
      const t = (performance.now() - start) / 1000;

      // --- smooth theme lerp (snaps instantly under reduced motion) ----------
      const tg = targetRef.current;
      const k = reduceMotion ? 1 : 0.08;
      coreMat.color.lerp(tg.core, k);
      coreMat.emissive.lerp(tg.teal, k);
      coreMat.emissiveIntensity += (tg.coreEmissive - coreMat.emissiveIntensity) * k;
      latticeMat.opacity += (tg.latticeOpacity - latticeMat.opacity) * k;
      coinMat.emissiveIntensity += (tg.coinEmissive - coinMat.emissiveIntensity) * k;
      pointsMat.color.lerp(tg.points, k);
      fog.color.lerp(tg.fog, k);
      fog.density += (tg.fogDensity - fog.density) * k;
      ambient.intensity += (tg.ambient - ambient.intensity) * k;
      tealFill.color.lerp(tg.teal, k);

      if (!reduceMotion) {
        core.rotation.y = t * 0.3;
        core.rotation.x = Math.sin(t * 0.4) * 0.22;
        knot.rotation.y = -t * 0.22;
        knot.rotation.z = t * 0.16;
        lattice.rotation.y = t * 0.08;
        lattice.rotation.x = Math.sin(t * 0.2) * 0.15;
        points.rotation.y = t * 0.035;

        coins.forEach((c) => {
          const a = t * c.speed + c.phase;
          c.mesh.position.set(
            Math.cos(a) * c.radius,
            Math.sin(a * 1.3) * c.yBob + Math.sin(t * c.speed + c.phase) * 0.3,
            Math.sin(a) * c.radius * c.tilt * 0.5,
          );
          c.mesh.rotation.z = t * c.speed * 2;
          c.mesh.rotation.y = t * 1.1 + c.phase;
        });

        const arr = sGeo.attributes.position.array as Float32Array;
        for (let i = 0; i < SPARKS; i++) {
          arr[i * 3 + 1] += 0.006 + (sSeed[i] % 1) * 0.004;
          arr[i * 3] += Math.sin(t * 0.5 + sSeed[i]) * 0.002;
          if (arr[i * 3 + 1] > 4.6) arr[i * 3 + 1] = -4.6;
        }
        sGeo.attributes.position.needsUpdate = true;
      }
      group.rotation.y += (targetRot.x - group.rotation.y) * 0.05;
      group.rotation.x += (-targetRot.y - group.rotation.x) * 0.05;
      renderer.render(scene, camera);
      raf = requestAnimationFrame(render);
    };
    render();

    const onResize = () => {
      const w = mount.clientWidth || width;
      const h = mount.clientHeight || height;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(mount);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      mount.removeEventListener('pointermove', onPointer);
      renderer.domElement.remove();
      renderer.dispose();
      // Release the GPU context so repeated mount/unmount can't exhaust the
      // browser's WebGL context limit. (Required — do not remove.)
      renderer.forceContextLoss();
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
    };
    // Build ONCE — theme changes are handled by the lerp above, not a rebuild.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={mountRef} className="h-full w-full" />;
}
