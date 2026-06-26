import { useEffect, useRef } from 'react';
import * as THREE from 'three';

/**
 * Lazy-loaded three.js hero — a spinning Malaysian 50 sen coin at the centre,
 * encased in a procedural diamond-lattice "songket" shell, orbited by smaller
 * gold coins, with a drifting thread field + rising gold spark motes.
 *
 * The coin face is drawn onto an in-memory <canvas> (a CanvasTexture) — NO remote
 * textures/loaders, so it stays valid under the strict CSP. Built ONCE; theme
 * changes are a smooth colour lerp, not a rebuild. GPU resources are disposed and
 * the WebGL context released on unmount.
 */

const GOLD = 0xe8b23a;
const GOLD_BRIGHT = 0xf6cf63;

/** Draw a ~50-sen coin face (gold, "50 SEN", songket weave, arc legends). */
function makeCoinTexture(): THREE.CanvasTexture {
  const S = 512;
  const cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const ctx = cv.getContext('2d')!;
  const cx = S / 2;
  const cy = S / 2;
  const R = 250;

  // metallic gold disc
  const g = ctx.createRadialGradient(cx - 70, cy - 80, 30, cx, cy, R);
  g.addColorStop(0, '#f8e3a0');
  g.addColorStop(0.45, '#e6bb56');
  g.addColorStop(0.82, '#c8962f');
  g.addColorStop(1, '#a3761f');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.fill();

  // faint songket diamond weave, clipped to the disc
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, R - 8, 0, Math.PI * 2);
  ctx.clip();
  ctx.strokeStyle = 'rgba(110,75,12,0.18)';
  ctx.lineWidth = 1.4;
  for (let x = -2 * R; x <= 2 * R; x += 26) {
    ctx.beginPath();
    ctx.moveTo(cx + x, cy - R);
    ctx.lineTo(cx + x + 2 * R, cy + R);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + x, cy - R);
    ctx.lineTo(cx + x - 2 * R, cy + R);
    ctx.stroke();
  }
  ctx.restore();

  // rims + beaded inner ring
  ctx.strokeStyle = '#8a6418';
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.arc(cx, cy, R - 9, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = '#f3d989';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, R - 19, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#7a5713';
  for (let i = 0; i < 76; i++) {
    const a = (i / 76) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * (R - 30), cy + Math.sin(a) * (R - 30), 2.1, 0, Math.PI * 2);
    ctx.fill();
  }

  // arc legends
  const arc = (str: string, radius: number, base: number, cw: boolean, font: string) => {
    ctx.save();
    ctx.fillStyle = '#6b4d11';
    ctx.font = font;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.translate(cx, cy);
    const step = 0.092;
    const n = str.length;
    for (let i = 0; i < n; i++) {
      const a = base + (i - (n - 1) / 2) * step * (cw ? 1 : -1);
      ctx.save();
      ctx.rotate(a);
      ctx.translate(0, -radius);
      if (!cw) ctx.rotate(Math.PI);
      ctx.fillText(str[i], 0, 0);
      ctx.restore();
    }
    ctx.restore();
  };
  arc('BANK NEGARA MALAYSIA', R - 50, 0, true, 'bold 27px Georgia, serif');
  arc('RINGGIT MALAYSIA', R - 50, Math.PI, false, 'bold 27px Georgia, serif');

  // central "50" with a soft emboss, and "SEN"
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '900 196px Georgia, serif';
  ctx.fillStyle = 'rgba(255,245,205,0.55)';
  ctx.fillText('50', cx - 3, cy - 21);
  ctx.fillStyle = '#5a3f0d';
  ctx.fillText('50', cx, cy - 18);
  ctx.font = 'bold 54px Georgia, serif';
  ctx.fillStyle = '#5a3f0d';
  ctx.fillText('SEN', cx, cy + 92);

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

interface Targets {
  teal: THREE.Color;
  fog: THREE.Color;
  points: THREE.Color;
  fogDensity: number;
  ambient: number;
  latticeOpacity: number;
  coinEmissive: number;
}

function targetsFor(dark: boolean): Targets {
  return {
    teal: new THREE.Color(dark ? 0x2dd4bf : 0x17b39c),
    fog: new THREE.Color(dark ? 0x07100f : 0xf5eedd),
    points: new THREE.Color(dark ? 0x2dd4bf : 0xcf9f3a),
    fogDensity: dark ? 0.035 : 0.024,
    ambient: dark ? 0.5 : 1.0,
    latticeOpacity: dark ? 0.32 : 0.26,
    coinEmissive: dark ? 0.12 : 0.26,
  };
}

export default function Hero3D({ dark }: { dark: boolean }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef<Targets>(targetsFor(dark));

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

    // lights
    const ambient = new THREE.AmbientLight(0xffffff, init.ambient);
    scene.add(ambient);
    const key = new THREE.DirectionalLight(0xfff4e0, 1.35);
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
    const textures: THREE.Texture[] = [];
    const track = <T extends THREE.BufferGeometry | THREE.Material>(x: T): T => {
      if (x instanceof THREE.BufferGeometry) geometries.push(x);
      else materials.push(x);
      return x;
    };

    const group = new THREE.Group();
    scene.add(group);

    // ----------------------------------------------- hero 50 sen coin
    const coinTex = makeCoinTexture();
    textures.push(coinTex);
    const faceMat = track(
      new THREE.MeshStandardMaterial({
        map: coinTex,
        color: 0xffffff,
        metalness: 0.35,
        roughness: 0.5,
        emissive: 0xffffff,
        emissiveMap: coinTex,
        emissiveIntensity: 0.2,
      }),
    );
    const edgeMat = track(
      new THREE.MeshStandardMaterial({ color: 0xd9a93a, metalness: 0.9, roughness: 0.32 }),
    );
    const coinGeo = track(new THREE.CylinderGeometry(1.6, 1.6, 0.2, 80));
    const heroCoin = new THREE.Mesh(coinGeo, [edgeMat, faceMat, faceMat]);
    heroCoin.rotation.x = Math.PI / 2; // flat face toward the camera
    const coinGroup = new THREE.Group();
    coinGroup.add(heroCoin);
    group.add(coinGroup);

    // -------------------------------------- songket diamond-lattice shell
    const latticePts: number[] = [];
    const R = 2.85;
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
    const orbitGeo = track(new THREE.CylinderGeometry(0.6, 0.6, 0.12, 40));
    const orbitMat = track(
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
      const mesh = new THREE.Mesh(orbitGeo, orbitMat);
      mesh.rotation.x = Math.PI / 2.3;
      group.add(mesh);
      coins.push({
        mesh,
        radius: 3.6 + (i % 3) * 0.55,
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
      new THREE.PointsMaterial({ color: init.points.clone(), size: 0.055, transparent: true, opacity: 0.6, sizeAttenuation: true }),
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
        new THREE.PointsMaterial({ color: GOLD_BRIGHT, size: 0.1, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }),
      ),
    );
    scene.add(sparks);

    // pointer parallax
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

      // smooth theme lerp (snaps under reduced motion)
      const tg = targetRef.current;
      const k = reduceMotion ? 1 : 0.08;
      latticeMat.opacity += (tg.latticeOpacity - latticeMat.opacity) * k;
      orbitMat.emissiveIntensity += (tg.coinEmissive - orbitMat.emissiveIntensity) * k;
      pointsMat.color.lerp(tg.points, k);
      fog.color.lerp(tg.fog, k);
      fog.density += (tg.fogDensity - fog.density) * k;
      ambient.intensity += (tg.ambient - ambient.intensity) * k;
      tealFill.color.lerp(tg.teal, k);

      if (!reduceMotion) {
        // spin the coin like a flipping ringgit
        coinGroup.rotation.y = t * 0.7;
        coinGroup.rotation.z = Math.sin(t * 0.35) * 0.08;
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
      renderer.forceContextLoss();
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      textures.forEach((tx) => tx.dispose());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={mountRef} className="h-full w-full" />;
}
