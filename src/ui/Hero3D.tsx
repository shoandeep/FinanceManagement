import { useEffect, useRef } from 'react';
import * as THREE from 'three';

/**
 * Lazy-loaded three.js hero — a Malaysian 50 sen coin at the centre, facing the
 * viewer (the "50" stays upright; it only tilts gently, never spinning edge-on),
 * encased in a procedural diamond-lattice "songket" shell, orbited by smaller gold
 * coins, with a drifting thread field + rising gold spark motes.
 *
 * The coin face is drawn onto an in-memory <canvas> (a CanvasTexture) — NO remote
 * textures/loaders — so it stays valid under the strict CSP. The face uses a flat
 * CircleGeometry so the texture maps upright. Built ONCE; theme changes are a
 * smooth colour lerp, not a rebuild. GPU resources + texture disposed on unmount.
 */

const GOLD = 0xe8b23a;
const GOLD_BRIGHT = 0xf6cf63;
const TAU = Math.PI * 2;

/** Draw the 50 sen obverse as struck metal — smooth raised rim, embossed
 *  hibiscus, "BANK NEGARA MALAYSIA", year, and a large "50 / SEN". */
function makeCoinTexture(): THREE.CanvasTexture {
  const S = 512;
  const cx = S / 2;
  const cy = S / 2;
  const R = 246;
  const cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const ctx = cv.getContext('2d')!;
  const ENGRAVE = '#8a6a22';

  // metallic gold field, lit from the top-left
  const g = ctx.createRadialGradient(cx - 85, cy - 95, 18, cx, cy, R + 30);
  g.addColorStop(0, '#fbe9af');
  g.addColorStop(0.45, '#e8c163');
  g.addColorStop(0.8, '#cda23f');
  g.addColorStop(1, '#a87f24');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, TAU);
  ctx.fill();

  // diagonal brushed sheen
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, TAU);
  ctx.clip();
  const sheen = ctx.createLinearGradient(0, 0, S, S);
  sheen.addColorStop(0, 'rgba(255,255,255,0.16)');
  sheen.addColorStop(0.5, 'rgba(255,255,255,0)');
  sheen.addColorStop(1, 'rgba(90,60,10,0.12)');
  ctx.fillStyle = sheen;
  ctx.fillRect(0, 0, S, S);
  ctx.restore();

  // smooth raised rim (no scallops)
  ctx.save();
  ctx.lineWidth = 11;
  const rim = ctx.createLinearGradient(0, cy - R, 0, cy + R);
  rim.addColorStop(0, '#fcebab');
  rim.addColorStop(1, '#956f1c');
  ctx.strokeStyle = rim;
  ctx.beginPath();
  ctx.arc(cx, cy, R - 7, 0, TAU);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(90,60,10,0.45)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, R - 16, 0, TAU);
  ctx.stroke();
  ctx.restore();

  // embossed engraving: a dark down-right shadow + a light up-left highlight,
  // both behind an ENGRAVE-coloured fill -> looks raised from the metal.
  const emboss = (draw: () => void) => {
    ctx.save();
    ctx.fillStyle = ENGRAVE;
    ctx.strokeStyle = ENGRAVE;
    ctx.shadowColor = 'rgba(70,46,8,0.6)';
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2.6;
    ctx.shadowBlur = 1;
    draw();
    ctx.restore();
    ctx.save();
    ctx.fillStyle = ENGRAVE;
    ctx.strokeStyle = ENGRAVE;
    ctx.shadowColor = 'rgba(255,247,212,0.65)';
    ctx.shadowOffsetX = -1.6;
    ctx.shadowOffsetY = -2;
    ctx.shadowBlur = 1;
    draw();
    ctx.restore();
  };

  // "BANK NEGARA MALAYSIA" — bottom arc, wrapping up the sides
  emboss(() => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.font = 'bold 27px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const str = 'BANK NEGARA MALAYSIA';
    const n = str.length;
    for (let i = 0; i < n; i++) {
      const a = (i - (n - 1) / 2) * 0.082;
      ctx.save();
      ctx.rotate(-a);
      ctx.translate(0, R - 32);
      ctx.rotate(Math.PI);
      ctx.fillText(str[i], 0, 0);
      ctx.restore();
    }
    ctx.restore();
  });

  // year, top-right
  emboss(() => {
    ctx.font = 'bold 28px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('2012', 332, 150);
  });

  // hibiscus (bunga raya), upper-left — five petals + curved stamen
  emboss(() => {
    ctx.save();
    ctx.translate(150, 202);
    ctx.lineWidth = 4;
    ctx.lineJoin = 'round';
    for (let i = 0; i < 5; i++) {
      ctx.save();
      ctx.rotate((i / 5) * TAU - 0.3);
      ctx.beginPath();
      ctx.moveTo(0, -6);
      ctx.quadraticCurveTo(-22, -26, -12, -52);
      ctx.quadraticCurveTo(0, -66, 12, -52);
      ctx.quadraticCurveTo(22, -26, 0, -6);
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    }
    ctx.beginPath();
    ctx.arc(0, 0, 7, 0, TAU);
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(3, -4);
    ctx.quadraticCurveTo(36, -32, 54, -60);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(56, -62, 5, 0, TAU);
    ctx.fill();
    ctx.restore();
  });

  // big "50" + "SEN", right of centre, chunky sans
  emboss(() => {
    ctx.font = '900 184px Arial, Helvetica, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('50', 300, 252);
  });
  emboss(() => {
    ctx.font = 'bold 52px Arial, Helvetica, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('SEN', 306, 350);
  });

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
    ambient: dark ? 0.55 : 1.05,
    latticeOpacity: dark ? 0.3 : 0.24,
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
    const key = new THREE.DirectionalLight(0xfff4e0, 1.4);
    key.position.set(3, 5, 7);
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

    // ----------------------------------------------- hero 50 sen coin (upright)
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
        emissiveIntensity: 0.22,
      }),
    );
    const edgeMat = track(
      new THREE.MeshStandardMaterial({ color: 0xd9a93a, metalness: 0.9, roughness: 0.32 }),
    );
    const COIN_R = 1.62;
    const COIN_H = 0.2;
    const faceGeo = track(new THREE.CircleGeometry(COIN_R, 72));
    const rimGeo = track(new THREE.CylinderGeometry(COIN_R, COIN_R, COIN_H, 72, 1, true));
    const front = new THREE.Mesh(faceGeo, faceMat);
    front.position.z = COIN_H / 2;
    const back = new THREE.Mesh(faceGeo, faceMat);
    back.position.z = -COIN_H / 2;
    back.rotation.y = Math.PI;
    const rim = new THREE.Mesh(rimGeo, edgeMat);
    rim.rotation.x = Math.PI / 2; // ring around the Z-facing coin
    const coinGroup = new THREE.Group();
    coinGroup.add(front, back, rim);
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
        const a0 = (s / seg) * TAU;
        const a1 = ((s + 1) / seg) * TAU;
        latticePts.push(Math.cos(a0) * rad, y, Math.sin(a0) * rad);
        latticePts.push(Math.cos(a1) * rad, y, Math.sin(a1) * rad);
      }
    }
    for (let s = 0; s < seg; s += 2) {
      for (let r = 0; r < rings; r++) {
        const phi0 = (r / rings) * Math.PI;
        const phi1 = ((r + 1) / rings) * Math.PI;
        const a0 = (s / seg) * TAU;
        const a1 = ((s + 1) / seg) * TAU;
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
    const orbitGeo = track(new THREE.CylinderGeometry(0.58, 0.58, 0.12, 40));
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
        radius: 3.7 + (i % 3) * 0.55,
        speed: 0.32 + (i % 3) * 0.1,
        phase: (i / COIN_COUNT) * TAU,
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
      targetRot.x = ((e.clientX - r.left) / r.width - 0.5) * 0.6;
      targetRot.y = ((e.clientY - r.top) / r.height - 0.5) * 0.6;
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
        // coin faces the viewer with the 50 upright — gentle tilt + bob only
        coinGroup.rotation.y = Math.sin(t * 0.5) * 0.2;
        coinGroup.rotation.x = Math.sin(t * 0.35) * 0.1;
        coinGroup.position.y = Math.sin(t * 0.7) * 0.08;
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
