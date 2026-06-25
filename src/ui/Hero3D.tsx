import { useEffect, useRef } from 'react';
import * as THREE from 'three';

/**
 * Lazy-loaded three.js hero: a slowly turning icosahedron framed by floating
 * "ringgit" coins and drifting particles. Pointer-reactive, theme-aware, and
 * disabled for users who prefer reduced motion. Cleans up all GPU resources on
 * unmount. (No eval / no remote assets — safe under the strict CSP.)
 */
export default function Hero3D({ dark }: { dark: boolean }) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const width = mount.clientWidth || 320;
    const height = mount.clientHeight || 280;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0, 9);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    mount.appendChild(renderer.domElement);

    // Lighting.
    scene.add(new THREE.AmbientLight(0xffffff, dark ? 0.5 : 0.8));
    const key = new THREE.DirectionalLight(0xffffff, 1.1);
    key.position.set(4, 6, 6);
    scene.add(key);
    const warm = new THREE.PointLight(0xfbbf24, 1.2, 50);
    warm.position.set(-5, -2, 4);
    scene.add(warm);

    const group = new THREE.Group();
    scene.add(group);

    // Central icosahedron (indigo) + wireframe overlay.
    const icoGeo = new THREE.IcosahedronGeometry(1.7, 0);
    const ico = new THREE.Mesh(
      icoGeo,
      new THREE.MeshStandardMaterial({
        color: 0x6366f1,
        metalness: 0.4,
        roughness: 0.25,
        transparent: true,
        opacity: 0.92,
        flatShading: true,
      }),
    );
    const wire = new THREE.LineSegments(
      new THREE.WireframeGeometry(icoGeo),
      new THREE.LineBasicMaterial({ color: 0xa5b4fc, transparent: true, opacity: 0.5 }),
    );
    ico.add(wire);
    group.add(ico);

    // Floating gold coins.
    const coinGeo = new THREE.CylinderGeometry(0.7, 0.7, 0.14, 48);
    const coinMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      metalness: 0.85,
      roughness: 0.28,
    });
    const coins: { mesh: THREE.Mesh; phase: number; speed: number; orbit: number }[] = [];
    const coinPositions = [
      [3.2, 1.4, 0.5],
      [-3.4, -1.1, -0.6],
      [2.6, -2.0, 1.2],
      [-2.8, 1.9, 0.8],
    ];
    coinPositions.forEach((p, i) => {
      const mesh = new THREE.Mesh(coinGeo, coinMat);
      mesh.position.set(p[0], p[1], p[2]);
      mesh.rotation.x = Math.PI / 2.4;
      group.add(mesh);
      coins.push({ mesh, phase: i * 1.7, speed: 0.6 + i * 0.12, orbit: p[1] });
    });

    // Drifting particle field.
    const PARTS = 140;
    const pPos = new Float32Array(PARTS * 3);
    for (let i = 0; i < PARTS; i++) {
      pPos[i * 3] = (Math.random() - 0.5) * 16;
      pPos[i * 3 + 1] = (Math.random() - 0.5) * 12;
      pPos[i * 3 + 2] = (Math.random() - 0.5) * 8 - 2;
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    const points = new THREE.Points(
      pGeo,
      new THREE.PointsMaterial({
        color: dark ? 0x818cf8 : 0x6366f1,
        size: 0.07,
        transparent: true,
        opacity: 0.7,
      }),
    );
    scene.add(points);

    // Pointer parallax.
    const target = { x: 0, y: 0 };
    const onPointer = (e: PointerEvent) => {
      const r = mount.getBoundingClientRect();
      target.x = ((e.clientX - r.left) / r.width - 0.5) * 0.6;
      target.y = ((e.clientY - r.top) / r.height - 0.5) * 0.6;
    };
    mount.addEventListener('pointermove', onPointer);

    const clock = new THREE.Clock();
    let raf = 0;
    const render = () => {
      const t = clock.getElapsedTime();
      if (!reduceMotion) {
        ico.rotation.y = t * 0.35;
        ico.rotation.x = Math.sin(t * 0.4) * 0.25;
        points.rotation.y = t * 0.04;
        coins.forEach((c) => {
          c.mesh.position.y = c.orbit + Math.sin(t * c.speed + c.phase) * 0.45;
          c.mesh.rotation.z = t * c.speed;
          c.mesh.rotation.y = t * 0.8 + c.phase;
        });
      }
      group.rotation.y += (target.x - group.rotation.y) * 0.05;
      group.rotation.x += (-target.y - group.rotation.x) * 0.05;
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
      icoGeo.dispose();
      coinGeo.dispose();
      pGeo.dispose();
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.material) {
          const mat = m.material;
          Array.isArray(mat) ? mat.forEach((x) => x.dispose()) : mat.dispose();
        }
      });
    };
  }, [dark]);

  return <div ref={mountRef} className="h-full w-full" />;
}
