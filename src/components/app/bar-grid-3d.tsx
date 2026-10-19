import { useEffect, useRef } from "react";
import type * as THREE from "three";

/**
 * 3D bar grid — a Three.js heat-matrix where each cell is a bar whose height
 * (and colour intensity) encodes its value. Used by the dashboard's matrix
 * views (interactive: orbit, hover tooltip, click) and by the home hero
.
 *
 * Data changes (e.g. the Blocked / Allowed toggle) animate the bars to their
 * new heights instead of rebuilding the scene.
 */

export interface BarGrid3DProps {
  rowLabels: string[];
  colLabels: string[];
  /** `values[row][col]` — drives bar height. */
  values: number[][];
  /** Value that maps to full height. Defaults to the largest value. */
  max?: number;
  /** Bar hue at full intensity, as a CSS hex colour. */
  hue: string;
  tooltip?: (row: number, col: number) => string;
  onCellClick?: (row: number, col: number) => void;
  className?: string;
}

const BAR_MAX_HEIGHT = 6;
const BAR_SIZE = 0.78;

export function BarGrid3D({
  rowLabels,
  colLabels,
  values,
  max,
  hue,
  tooltip,
  onCellClick,
  className,
}: BarGrid3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const rowElRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const colElRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const propsRef = useRef({ values, max, hue, tooltip, onCellClick });
  propsRef.current = { values, max, hue, tooltip, onCellClick };
  const applyRef = useRef<(() => void) | null>(null);

  const rows = rowLabels.length;
  const cols = colLabels.length;

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount || rows === 0 || cols === 0) return;

    let disposed = false;
    let raf = 0;
    let teardown: (() => void) | undefined;

    (async () => {
      const THREE = await import("three");
      const { OrbitControls } = await import("three/examples/jsm/controls/OrbitControls.js");
      if (disposed) return;

      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 200);
      const target = new THREE.Vector3(0, BAR_MAX_HEIGHT * 0.22, 0);

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setClearColor(0x000000, 0);
      mount.appendChild(renderer.domElement);
      renderer.domElement.style.display = "block";

      scene.add(new THREE.AmbientLight(0xffffff, 0.75));
      const sun = new THREE.DirectionalLight(0xffffff, 1.1);
      sun.position.set(-6, 14, 9);
      scene.add(sun);
      const fill = new THREE.DirectionalLight(0xffffff, 0.35);
      fill.position.set(8, 4, -6);
      scene.add(fill);

      /* Floor grid — tinted from the page's text colour so it works in both themes. */
      const gridLines = new THREE.LineBasicMaterial({ transparent: true, opacity: 0.16 });
      const gridPoints: THREE.Vector3[] = [];
      for (let c = 0; c <= cols; c++) {
        const x = c - cols / 2;
        gridPoints.push(new THREE.Vector3(x, 0, -rows / 2), new THREE.Vector3(x, 0, rows / 2));
      }
      for (let r = 0; r <= rows; r++) {
        const z = r - rows / 2;
        gridPoints.push(new THREE.Vector3(-cols / 2, 0, z), new THREE.Vector3(cols / 2, 0, z));
      }
      const gridGeometry = new THREE.BufferGeometry().setFromPoints(gridPoints);
      const grid = new THREE.LineSegments(gridGeometry, gridLines);
      scene.add(grid);
      const syncGridColor = () => gridLines.color.set(getComputedStyle(mount).color);
      syncGridColor();
      const themeObserver = new MutationObserver(syncGridColor);
      themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "data-theme"] });

      /* Bars */
      const barGeometry = new THREE.BoxGeometry(BAR_SIZE, 1, BAR_SIZE);
      const bars: THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>[] = [];
      const current = new Float32Array(rows * cols);
      const goal = new Float32Array(rows * cols);
      const group = new THREE.Group();
      scene.add(group);
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const material = new THREE.MeshStandardMaterial({ roughness: 0.45, metalness: 0.05 });
          const bar = new THREE.Mesh(barGeometry, material);
          bar.position.set(c - cols / 2 + 0.5, 0, r - rows / 2 + 0.5);
          bar.userData = { r, c };
          group.add(bar);
          bars.push(bar);
        }
      }

      const low = new THREE.Color();
      const high = new THREE.Color();
      const tint = new THREE.Color();
      const applyData = () => {
        const p = propsRef.current;
        const peak = p.max ?? Math.max(1e-9, ...p.values.flat());
        high.set(p.hue);
        // Low end is the hue washed toward slate so small values stay legible but quiet.
        low.set(p.hue).lerp(tint.set(0x94a3b8), 0.7);
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const i = r * cols + c;
            const t = Math.min(1, Math.max(0, (p.values[r]?.[c] ?? 0) / peak));
            goal[i] = t;
            bars[i].material.color.copy(low).lerp(high, Math.pow(t, 0.8));
          }
        }
        if (reduceMotion) current.set(goal);
      };
      applyRef.current = applyData;
      applyData();

      /* Camera framing */
      const radius = Math.hypot(cols, rows) / 2 + BAR_MAX_HEIGHT * 0.25;
      const azimuth0 = 0.32;
      const elevation = 0.55;
      const place = (azimuth: number, distance: number) => {
        camera.position.set(
          target.x + Math.sin(azimuth) * Math.cos(elevation) * distance,
          target.y + Math.sin(elevation) * distance,
          target.z + Math.cos(azimuth) * Math.cos(elevation) * distance,
        );
        camera.lookAt(target);
      };
      let distance = 20;
      const fit = () => {
        const w = mount.clientWidth;
        const h = mount.clientHeight;
        if (w === 0 || h === 0) return;
        renderer.setSize(w, h);
        camera.aspect = w / h;
        const vFov = (camera.fov * Math.PI) / 180;
        const hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect);
        distance = (radius * 0.82) / Math.sin(Math.min(vFov, hFov) / 2);
        camera.updateProjectionMatrix();
        if (controls) {
          const dir = camera.position.clone().sub(target).normalize();
          camera.position.copy(target).addScaledVector(dir, distance);
          controls.minDistance = distance * 0.6;
          controls.maxDistance = distance * 1.4;
        } else {
          place(azimuth0, distance);
        }
      };

      let controls: InstanceType<typeof OrbitControls> | null = null;
      {
        controls = new OrbitControls(camera, renderer.domElement);
        controls.target.copy(target);
        controls.enableDamping = true;
        controls.enablePan = false;
        controls.enableZoom = false; // never trap page scroll
        controls.minPolarAngle = 0.25;
        controls.maxPolarAngle = Math.PI / 2 - 0.06;
        place(azimuth0, distance);
      }
      const ro = new ResizeObserver(fit);
      ro.observe(mount);
      fit();
      if (controls) place(azimuth0, distance);

      /* Labels follow their world anchors */
      const projected = new THREE.Vector3();
      const project = (x: number, z: number) => {
        projected.set(x, 0, z).project(camera);
        const w = mount.clientWidth;
        const h = mount.clientHeight;
        return { x: (projected.x * 0.5 + 0.5) * w, y: (-projected.y * 0.5 + 0.5) * h };
      };
      const placeLabels = () => {
        for (let r = 0; r < rows; r++) {
          const el = rowElRefs.current[r];
          if (!el) continue;
          const p = project(-cols / 2 - 0.7, r - rows / 2 + 0.5);
          el.style.transform = `translate(${p.x}px, ${p.y}px) translate(-100%, -50%)`;
        }
        for (let c = 0; c < cols; c++) {
          const el = colElRefs.current[c];
          if (!el) continue;
          const p = project(c - cols / 2 + 0.5, rows / 2 + 0.15);
          el.style.transform = `translate(${p.x}px, ${p.y}px) translate(-100%, 0) rotate(-35deg)`;
        }
      };

      /* Hover / click */
      const raycaster = new THREE.Raycaster();
      const pointer = new THREE.Vector2();
      let hovered = -1;
      let down: { x: number; y: number } | null = null;
      const setHover = (index: number, clientX = 0, clientY = 0) => {
        if (hovered >= 0 && hovered !== index) bars[hovered].material.emissive.setHex(0x000000);
        hovered = index;
        const tip = tipRef.current;
        if (index < 0) {
          renderer.domElement.style.cursor = controls ? "grab" : "";
          if (tip) tip.style.opacity = "0";
          return;
        }
        bars[index].material.emissive.setHex(0x333333);
        renderer.domElement.style.cursor = propsRef.current.onCellClick ? "pointer" : "grab";
        if (tip) {
          const r = Math.floor(index / cols);
          const c = index % cols;
          tip.textContent = propsRef.current.tooltip?.(r, c) ?? "";
          const box = mount.getBoundingClientRect();
          const x = Math.min(clientX - box.left + 14, box.width - tip.offsetWidth - 4);
          tip.style.transform = `translate(${Math.max(4, x)}px, ${Math.max(4, clientY - box.top - 34)}px)`;
          tip.style.opacity = "1";
        }
      };
      const pick = (e: PointerEvent) => {
        const box = renderer.domElement.getBoundingClientRect();
        pointer.set(((e.clientX - box.left) / box.width) * 2 - 1, -((e.clientY - box.top) / box.height) * 2 + 1);
        raycaster.setFromCamera(pointer, camera);
        const hit = raycaster.intersectObjects(bars, false)[0];
        return hit ? bars.indexOf(hit.object as (typeof bars)[number]) : -1;
      };
      const onMove = (e: PointerEvent) => {
        if (e.buttons) return setHover(-1);
        setHover(pick(e), e.clientX, e.clientY);
      };
      const onLeave = () => setHover(-1);
      const onDown = (e: PointerEvent) => {
        down = { x: e.clientX, y: e.clientY };
      };
      const onUp = (e: PointerEvent) => {
        if (!down) return;
        const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
        down = null;
        if (moved > 4) return;
        const index = pick(e);
        if (index >= 0) propsRef.current.onCellClick?.(Math.floor(index / cols), index % cols);
      };
      {
        renderer.domElement.style.cursor = "grab";
        renderer.domElement.addEventListener("pointermove", onMove);
        renderer.domElement.addEventListener("pointerleave", onLeave);
        renderer.domElement.addEventListener("pointerdown", onDown);
        renderer.domElement.addEventListener("pointerup", onUp);
      }

      /* Render loop — paused while off-screen */
      let visible = true;
      const io = new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
      });
      io.observe(mount);
      const clock = new THREE.Clock();
      const animate = () => {
        if (disposed) return;
        raf = requestAnimationFrame(animate);
        if (!visible) return;
        const t = clock.getElapsedTime();
        for (let i = 0; i < bars.length; i++) {
          // Stagger the first rise diagonally, then ease toward whatever the data says.
          const delay = reduceMotion ? 0 : ((i % cols) + Math.floor(i / cols)) * 0.025;
          if (t > delay) current[i] += (goal[i] - current[i]) * 0.1;
          const h = Math.max(0.04, current[i] * BAR_MAX_HEIGHT);
          bars[i].scale.y = h;
          bars[i].position.y = h / 2;
        }
        controls?.update();
        placeLabels();
        renderer.render(scene, camera);
      };
      animate();

      teardown = () => {
        cancelAnimationFrame(raf);
        ro.disconnect();
        io.disconnect();
        themeObserver.disconnect();
        controls?.dispose();
        renderer.domElement.removeEventListener("pointermove", onMove);
        renderer.domElement.removeEventListener("pointerleave", onLeave);
        renderer.domElement.removeEventListener("pointerdown", onDown);
        renderer.domElement.removeEventListener("pointerup", onUp);
        barGeometry.dispose();
        gridGeometry.dispose();
        gridLines.dispose();
        bars.forEach((b) => b.material.dispose());
        renderer.dispose();
        renderer.forceContextLoss();
        renderer.domElement.remove();
      };
      if (disposed) teardown();
    })();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      applyRef.current = null;
      teardown?.();
    };
  }, [rows, cols]);

  useEffect(() => {
    applyRef.current?.();
  }, [values, max, hue]);

  return (
    <div className={`relative ${className ?? ""}`}>
      <div ref={mountRef} className="absolute inset-0" />
      {(
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          {rowLabels.map((label, i) => (
            <span
              key={`r-${label}`}
              ref={(el) => {
                rowElRefs.current[i] = el;
              }}
              className="absolute left-0 top-0 whitespace-nowrap font-mono text-[10px] leading-none text-muted-foreground will-change-transform"
            >
              {label}
            </span>
          ))}
          {colLabels.map((label, i) => (
            <span
              key={`c-${label}`}
              ref={(el) => {
                colElRefs.current[i] = el;
              }}
              style={{ transformOrigin: "100% 0" }}
              className="absolute left-0 top-0 whitespace-nowrap font-mono text-[10px] leading-none text-muted-foreground will-change-transform"
            >
              {label}
            </span>
          ))}
          <div
            ref={tipRef}
            className="absolute left-0 top-0 max-w-[16rem] rounded-md border border-border bg-popover px-2 py-1 text-xs text-popover-foreground opacity-0 shadow-md transition-opacity"
          />
        </div>
      )}
    </div>
  );
}
