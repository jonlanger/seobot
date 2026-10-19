import { useEffect, useRef } from "react";
import type * as THREE from "three";

/**
 * Hero 3D card grid — a real Three.js scene.
 *
 * A perspective grid of planes representing dashboard tiles. Some planes lift
 * toward the camera, some flicker, some fade — all driven in the animation loop.
 */
export function HeroGrid3D() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;
    let frame = 0;
    let cleanup: (() => void) | undefined;

    (async () => {
      const THREE = await import("three");
      if (cancelled || !containerRef.current) return;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
      camera.position.set(0, 4, 14);
      camera.lookAt(0, 0, 0);

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(container.clientWidth, container.clientHeight);
      container.appendChild(renderer.domElement);

      // Lights
      const ambient = new THREE.AmbientLight(0xffffff, 0.6);
      scene.add(ambient);
      const point = new THREE.PointLight(0x3b82f6, 1.2, 40);
      point.position.set(6, 8, 10);
      scene.add(point);

      // Grid of cards
      const cols = 6;
      const rows = 4;
      const spacingX = 1.6;
      const spacingY = 1.3;
      const meshes: THREE.Mesh[] = [];
      const materials: THREE.MeshStandardMaterial[] = [];

      const palette = [0x3b82f6, 0x22c55e, 0xa855f7, 0xf97316, 0x06b6d4, 0xeab308];

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const geometry = new THREE.PlaneGeometry(1.1, 0.85);
          const material = new THREE.MeshStandardMaterial({
            color: palette[(r + c) % palette.length],
            transparent: true,
            opacity: 0.85,
            roughness: 0.4,
            metalness: 0.1,
            side: THREE.DoubleSide,
          });
          const mesh = new THREE.Mesh(geometry, material);
          mesh.position.x = (c - (cols - 1) / 2) * spacingX;
          mesh.position.y = (r - (rows - 1) / 2) * spacingY;
          mesh.position.z = 0;
          // slight tilt for depth
          mesh.rotation.x = -0.18;
          mesh.rotation.y = 0.12;
          scene.add(mesh);
          meshes.push(mesh);
          materials.push(material);
        }
      }

      // Group rotation for a slow orbit
      const group = new THREE.Group();
      meshes.forEach((m) => {
        scene.remove(m);
        group.add(m);
      });
      scene.add(group);

      const clock = new THREE.Clock();

      const resize = () => {
        if (!container) return;
        const w = container.clientWidth;
        const h = container.clientHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      };
      const ro = new ResizeObserver(resize);
      ro.observe(container);

      const animate = () => {
        if (cancelled) return;
        const t = clock.getElapsedTime();

        group.rotation.y = Math.sin(t * 0.15) * 0.18;
        group.rotation.x = Math.sin(t * 0.1) * 0.08;

        meshes.forEach((mesh, i) => {
          const r = Math.floor(i / cols);
          const c = i % cols;
          const phase = i * 0.7;

          // lift: some cards rise toward the viewer
          if ((r + c) % 3 === 0) {
            mesh.position.z = Math.sin(t * 1.2 + phase) * 1.6;
          } else {
            mesh.position.z = 0;
          }

          // flicker: some cards toggle opacity
          const mat = materials[i];
          if ((r * c) % 4 === 0) {
            mat.opacity = Math.sin(t * 3 + phase) > 0 ? 0.9 : 0.2;
          } else if ((r + c) % 5 === 0) {
            // fade: smooth opacity pulse
            mat.opacity = 0.3 + 0.6 * (0.5 + 0.5 * Math.sin(t * 1.6 + phase));
          } else {
            mat.opacity = 0.85;
          }
        });

        renderer.render(scene, camera);
        frame = requestAnimationFrame(animate);
      };
      animate();

      cleanup = () => {
        cancelled = true;
        cancelAnimationFrame(frame);
        ro.disconnect();
        meshes.forEach((m) => {
          m.geometry.dispose();
        });
        materials.forEach((m) => m.dispose());
        renderer.dispose();
        if (container.contains(renderer.domElement)) {
          container.removeChild(renderer.domElement);
        }
      };
    })();

    return () => {
      cancelled = true;
      if (cleanup) cleanup();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative mx-auto h-[360px] w-full max-w-md overflow-hidden rounded-xl border border-border bg-surface sm:h-[420px]"
    />
  );
}