import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import type * as THREE from "three";
import { Minus, Plus, RotateCcw } from "lucide-react";
import { cn } from "@/lib/cn";
import type { DotFieldGuide } from "@/components/ui";

/**
 * The 3D counterpart of `DotField`: every site is a sphere in an orbitable box.
 * X and Y carry the same layout as the 2D field; Z (depth) and sphere size are
 * extra measures the caller picks. Spheres are one instanced mesh, so a few
 * thousand stay cheap, and a layout or filter change glides them to their new
 * place instead of rebuilding the scene.
 */

export interface Dot3 {
  id: string;
  /** 0–1 across the box (same as the 2D field). */
  x: number;
  /** 0–1 down the box (same as the 2D field; 0 is the top). */
  y: number;
  /** 0–1 front to back. */
  z: number;
  /** 0–1 → sphere radius. */
  size: number;
  /** Tailwind background class that names the color (a token color). */
  tone: string;
  active: boolean;
  label: string;
}

export interface DotField3DProps {
  dots: Dot3[];
  rows?: DotFieldGuide[];
  columns?: DotFieldGuide[];
  /** Draw a faint line per column along the floor. */
  columnLines?: boolean;
  zLabels: { low: string; high: string; title: string };
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  renderTooltip?: (id: string) => ReactNode;
  /** Called once if WebGL cannot start, so the caller can fall back to 2D. */
  onUnavailable?: () => void;
  /** Pixels at the top covered by overlaid UI; the scene is framed in the space below. */
  topInset?: number;
  className?: string;
}

const W = 10;
const H = 5.5;
const D = 6.5;
const BASE_RADIUS = 0.055;

const toWorld = (dot: { x: number; y: number; z: number }, out: [number, number, number]) => {
  out[0] = (dot.x - 0.5) * W;
  out[1] = (0.5 - dot.y) * H;
  out[2] = (0.5 - dot.z) * D;
};

/** Sphere radius multiplier for a 0–1 size; area grows roughly linearly with the measure. */
const sizeScale = (size: number) => 0.5 + 2.4 * Math.sqrt(Math.min(1, Math.max(0, size)));

export function DotField3D({
  dots,
  rows = [],
  columns = [],
  columnLines = false,
  zLabels,
  selectedId,
  onSelect,
  renderTooltip,
  onUnavailable,
  topInset = 0,
  className,
}: DotField3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const colRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const zLowRef = useRef<HTMLSpanElement>(null);
  const zHighRef = useRef<HTMLSpanElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);

  const propsRef = useRef({ topInset, dots, rows, columns, columnLines, selectedId, onSelect, onUnavailable });
  propsRef.current = { topInset, dots, rows, columns, columnLines, selectedId, onSelect, onUnavailable };
  const syncDots = useRef<(() => void) | null>(null);
  const syncGuides = useRef<(() => void) | null>(null);
  const syncSelection = useRef<(() => void) | null>(null);
  const zoomBy = useRef<((factor: number) => void) | null>(null);
  const resetView = useRef<(() => void) | null>(null);
  const count = dots.length;

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount || count === 0) return;

    let disposed = false;
    let raf = 0;
    let teardown: (() => void) | undefined;

    (async () => {
      const THREE = await import("three");
      const { OrbitControls } = await import("three/examples/jsm/controls/OrbitControls.js");
      if (disposed) return;

      let renderer: THREE.WebGLRenderer;
      try {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      } catch {
        propsRef.current.onUnavailable?.();
        return;
      }
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setClearColor(0x000000, 0);
      renderer.domElement.style.display = "block";
      mount.appendChild(renderer.domElement);

      /* Any CSS color (including oklch tokens) → THREE.Color, via a 1px canvas. */
      const probe = document.createElement("canvas");
      probe.width = probe.height = 1;
      const probeCtx = probe.getContext("2d", { willReadFrequently: true })!;
      const resolve = (css: string, into: THREE.Color) => {
        probeCtx.clearRect(0, 0, 1, 1);
        probeCtx.fillStyle = "#000";
        probeCtx.fillStyle = css;
        probeCtx.fillRect(0, 0, 1, 1);
        const [r, g, b] = probeCtx.getImageData(0, 0, 1, 1).data;
        return into.setRGB(r! / 255, g! / 255, b! / 255, THREE.SRGBColorSpace);
      };
      const toneCache = new Map<string, THREE.Color>();
      const toneColor = (tone: string) => {
        let color = toneCache.get(tone);
        if (!color) {
          const el = document.createElement("span");
          el.className = tone;
          el.style.display = "none";
          mount.appendChild(el);
          color = resolve(getComputedStyle(el).backgroundColor, new THREE.Color());
          el.remove();
          toneCache.set(tone, color);
        }
        return color;
      };
      const surface = new THREE.Color();
      const lineColor = new THREE.Color();
      const primary = new THREE.Color();
      const readTheme = () => {
        const probeEl = document.createElement("span");
        probeEl.className = "bg-surface";
        probeEl.style.display = "none";
        mount.appendChild(probeEl);
        resolve(getComputedStyle(probeEl).backgroundColor, surface);
        probeEl.className = "bg-primary";
        resolve(getComputedStyle(probeEl).backgroundColor, primary);
        probeEl.remove();
        resolve(getComputedStyle(mount).color, lineColor);
        toneCache.clear();
      };
      readTheme();

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 200);
      const target = new THREE.Vector3(0, 0, 0);
      scene.add(new THREE.AmbientLight(0xffffff, 1.35));
      const sun = new THREE.DirectionalLight(0xffffff, 1.6);
      sun.position.set(-6, 10, 9);
      scene.add(sun);

      /* Box frame + guide lines (rebuilt when the layout's guides change) */
      const frameMaterial = new THREE.LineBasicMaterial({ transparent: true, opacity: 0.32 });
      const guideMaterial = new THREE.LineBasicMaterial({ transparent: true, opacity: 0.14 });
      const frameGeometry = new THREE.BufferGeometry();
      {
        const a = [-W / 2, -H / 2, -D / 2];
        const b = [W / 2, H / 2, D / 2];
        const p: number[] = [];
        const edge = (x1: number, y1: number, z1: number, x2: number, y2: number, z2: number) => p.push(x1, y1, z1, x2, y2, z2);
        // floor
        edge(a[0]!, a[1]!, a[2]!, b[0]!, a[1]!, a[2]!);
        edge(b[0]!, a[1]!, a[2]!, b[0]!, a[1]!, b[2]!);
        edge(b[0]!, a[1]!, b[2]!, a[0]!, a[1]!, b[2]!);
        edge(a[0]!, a[1]!, b[2]!, a[0]!, a[1]!, a[2]!);
        // back wall + left wall uprights
        edge(a[0]!, a[1]!, a[2]!, a[0]!, b[1]!, a[2]!);
        edge(b[0]!, a[1]!, a[2]!, b[0]!, b[1]!, a[2]!);
        edge(a[0]!, a[1]!, b[2]!, a[0]!, b[1]!, b[2]!);
        edge(a[0]!, b[1]!, a[2]!, b[0]!, b[1]!, a[2]!);
        edge(a[0]!, b[1]!, a[2]!, a[0]!, b[1]!, b[2]!);
        frameGeometry.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
      }
      scene.add(new THREE.LineSegments(frameGeometry, frameMaterial));
      let guideGeometry: THREE.BufferGeometry | null = null;
      let guideLines: THREE.LineSegments | null = null;
      const rebuildGuides = () => {
        const { rows: rowGuides, columns: colGuides, columnLines: showColumns } = propsRef.current;
        const p: number[] = [];
        for (const row of rowGuides) {
          const y = (0.5 - row.at) * H;
          p.push(-W / 2, y, -D / 2, W / 2, y, -D / 2, -W / 2, y, -D / 2, -W / 2, y, D / 2);
        }
        if (showColumns) {
          for (const col of colGuides) {
            const x = (col.at - 0.5) * W;
            p.push(x, -H / 2, -D / 2, x, -H / 2, D / 2);
          }
        }
        guideGeometry?.dispose();
        if (guideLines) scene.remove(guideLines);
        guideGeometry = new THREE.BufferGeometry();
        guideGeometry.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
        guideLines = new THREE.LineSegments(guideGeometry, guideMaterial);
        scene.add(guideLines);
        dirty = true;
      };

      /* Spheres */
      const geometry = new THREE.SphereGeometry(1, 14, 10);
      const material = new THREE.MeshStandardMaterial({ roughness: 0.4, metalness: 0.05 });
      const mesh = new THREE.InstancedMesh(geometry, material, count);
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.frustumCulled = false;
      mesh.setColorAt(0, new THREE.Color());
      scene.add(mesh);

      const pos = new Float32Array(count * 3);
      const goalPos = new Float32Array(count * 3);
      const rad = new Float32Array(count);
      const goalRad = new Float32Array(count);
      const active = new Uint8Array(count);
      const indexById = new Map<string, number>();
      const scratch: [number, number, number] = [0, 0, 0];
      const matrix = new THREE.Matrix4();
      const color = new THREE.Color();
      let firstSync = true;
      let dirty = true;
      let moving = true;

      const applyDots = () => {
        const list = propsRef.current.dots;
        indexById.clear();
        for (let i = 0; i < count; i++) {
          const dot = list[i];
          if (!dot) continue;
          indexById.set(dot.id, i);
          toWorld(dot, scratch);
          goalPos.set(scratch, i * 3);
          active[i] = dot.active ? 1 : 0;
          goalRad[i] = BASE_RADIUS * sizeScale(dot.size) * (dot.active ? 1 : 0.4);
          color.copy(toneColor(dot.tone));
          if (!dot.active) color.lerp(surface, 0.86);
          mesh.setColorAt(i, color);
          if (firstSync) {
            // First paint: rise from the floor, small, so the cloud blooms in.
            pos.set([scratch[0], -H / 2, scratch[2]], i * 3);
            rad[i] = 0;
          }
        }
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
        if (firstSync && reduceMotion) {
          pos.set(goalPos);
          rad.set(goalRad);
        }
        firstSync = false;
        moving = true;
        applySelection();
      };

      /* Selected + hovered markers */
      const ringGeometry = new THREE.SphereGeometry(1, 20, 14);
      const selectedMarker = new THREE.Mesh(ringGeometry, new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.28, depthWrite: false }));
      const hoverMarker = new THREE.Mesh(ringGeometry, new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.4, depthWrite: false }));
      selectedMarker.visible = hoverMarker.visible = false;
      selectedMarker.renderOrder = hoverMarker.renderOrder = 2;
      scene.add(selectedMarker, hoverMarker);
      let selectedIndex = -1;
      let hoverIndex = -1;
      function applySelection() {
        const id = propsRef.current.selectedId;
        selectedIndex = id ? (indexById.get(id) ?? -1) : -1;
        dirty = true;
      }
      const syncMarkers = () => {
        const place = (marker: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>, index: number, grow: number, tint: THREE.Color) => {
          marker.visible = index >= 0;
          if (index < 0) return;
          marker.position.set(pos[index * 3]!, pos[index * 3 + 1]!, pos[index * 3 + 2]!);
          marker.scale.setScalar(Math.max(rad[index]!, BASE_RADIUS * 0.8) * grow);
          marker.material.color.copy(tint);
        };
        place(selectedMarker, selectedIndex, 2.1, primary);
        place(hoverMarker, hoverIndex, 1.7, lineColor);
      };

      const refreshTheme = () => {
        readTheme();
        frameMaterial.color.copy(lineColor);
        guideMaterial.color.copy(lineColor);
        applyDots();
      };
      refreshTheme();
      const themeObserver = new MutationObserver(refreshTheme);
      themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "data-theme"] });

      syncDots.current = applyDots;
      syncGuides.current = rebuildGuides;
      syncSelection.current = applySelection;
      rebuildGuides();

      /* Camera */
      const radius = Math.hypot(W, H, D) / 2;
      let azimuth = -0.5;
      const elevation = 0.38;
      const place = (az: number, distance: number) => {
        camera.position.set(
          Math.sin(az) * Math.cos(elevation) * distance,
          Math.sin(elevation) * distance,
          Math.cos(az) * Math.cos(elevation) * distance,
        );
        camera.lookAt(target);
      };
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.target.copy(target);
      controls.enableDamping = true;
      controls.enablePan = false;
      controls.enableZoom = true; // wheel, trackpad pinch, and touch pinch
      controls.zoomSpeed = 0.8;
      controls.minPolarAngle = 0.2;
      controls.maxPolarAngle = Math.PI / 2 + 0.25;
      controls.addEventListener("change", () => {
        dirty = true;
      });
      let distance = 20;
      let fitted = false;
      const fit = () => {
        const w = mount.clientWidth;
        const h = mount.clientHeight;
        if (w === 0 || h === 0) return;
        renderer.setSize(w, h);
        camera.aspect = w / h;
        const vFov = (camera.fov * Math.PI) / 180;
        const hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect);
        const inset = Math.min(propsRef.current.topInset, h * 0.4);
        const usable = (h - inset) / h;
        distance = (radius * 1.12) / Math.sin(Math.min(vFov * usable, hFov) / 2);
        camera.setViewOffset(w, h, 0, -inset / 2, w, h);
        camera.updateProjectionMatrix();
        const dir = camera.position.clone().sub(target).normalize();
        const current = camera.position.distanceTo(target);
        const kept = Math.min(Math.max(current, distance * 0.2), distance * 1.6);
        camera.position.copy(target).addScaledVector(dir, current > 0 && !fitted ? distance : kept);
        fitted = true;
        controls.minDistance = distance * 0.2;
        controls.maxDistance = distance * 1.6;
        dirty = true;
      };
      place(azimuth, distance);
      zoomBy.current = (factor) => {
        const next = Math.min(Math.max(camera.position.distanceTo(target) * factor, distance * 0.2), distance * 1.6);
        const dir = camera.position.clone().sub(target).normalize();
        camera.position.copy(target).addScaledVector(dir, next);
        dirty = true;
      };
      resetView.current = () => {
        place(azimuth, distance);
        dirty = true;
      };
      const ro = new ResizeObserver(fit);
      ro.observe(mount);
      fit();
      place(azimuth, distance);

      /* HTML labels follow their world anchors */
      const projected = new THREE.Vector3();
      const project = (x: number, y: number, z: number) => {
        projected.set(x, y, z).project(camera);
        return { x: (projected.x * 0.5 + 0.5) * mount.clientWidth, y: (-projected.y * 0.5 + 0.5) * mount.clientHeight };
      };
      const placeLabels = () => {
        const { rows: rowGuides, columns: colGuides } = propsRef.current;
        rowGuides.forEach((row, i) => {
          const el = rowRefs.current[i];
          if (!el) return;
          const p = project(-W / 2, (0.5 - row.at) * H, D / 2);
          el.style.transform = `translate(${p.x}px, ${p.y}px) translate(calc(-100% - 6px), -50%)`;
        });
        colGuides.forEach((col, i) => {
          const el = colRefs.current[i];
          if (!el) return;
          const p = project((col.at - 0.5) * W, -H / 2, D / 2);
          el.style.transform = `translate(${p.x}px, ${p.y}px) translate(-50%, 6px)`;
        });
        const low = project(W / 2, -H / 2, D / 2);
        const high = project(W / 2, -H / 2, -D / 2);
        if (zLowRef.current) zLowRef.current.style.transform = `translate(${low.x}px, ${low.y}px) translate(8px, 4px)`;
        if (zHighRef.current) zHighRef.current.style.transform = `translate(${high.x}px, ${high.y}px) translate(8px, -50%)`;
      };

      /* Hover / click */
      const raycaster = new THREE.Raycaster();
      const pointer = new THREE.Vector2();
      let pickQueued = false;
      let lastEvent: PointerEvent | null = null;
      const pick = (e: PointerEvent) => {
        const box = renderer.domElement.getBoundingClientRect();
        pointer.set(((e.clientX - box.left) / box.width) * 2 - 1, -((e.clientY - box.top) / box.height) * 2 + 1);
        raycaster.setFromCamera(pointer, camera);
        const hits = raycaster.intersectObject(mesh, false);
        for (const hit of hits) if (hit.instanceId !== undefined && active[hit.instanceId]) return hit.instanceId;
        return -1;
      };
      const setHover = (index: number, e?: PointerEvent) => {
        if (index !== hoverIndex) {
          hoverIndex = index;
          setHoverId(index >= 0 ? (propsRef.current.dots[index]?.id ?? null) : null);
          renderer.domElement.style.cursor = index >= 0 ? "pointer" : "grab";
          dirty = true;
        }
        const tip = tipRef.current;
        if (tip && e && index >= 0) {
          const box = mount.getBoundingClientRect();
          const left = e.clientX - box.left;
          const top = e.clientY - box.top;
          const x = left > box.width * 0.55 ? left - tip.offsetWidth - 14 : left + 14;
          const y = Math.min(Math.max(4, top - 8), Math.max(4, box.height - tip.offsetHeight - 4));
          tip.style.transform = `translate(${Math.max(4, x)}px, ${y}px)`;
        }
      };
      const onMove = (e: PointerEvent) => {
        if (e.buttons) return setHover(-1);
        lastEvent = e;
        if (pickQueued) return;
        pickQueued = true;
        requestAnimationFrame(() => {
          pickQueued = false;
          if (disposed || !lastEvent) return;
          setHover(pick(lastEvent), lastEvent);
        });
      };
      const onLeave = () => {
        lastEvent = null;
        setHover(-1);
      };
      let down: { x: number; y: number } | null = null;
      const onDown = (e: PointerEvent) => {
        down = { x: e.clientX, y: e.clientY };
      };
      const onUp = (e: PointerEvent) => {
        if (!down) return;
        const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
        down = null;
        if (moved > 4) return;
        const index = pick(e);
        const id = index >= 0 ? propsRef.current.dots[index]?.id : undefined;
        if (id) propsRef.current.onSelect?.(id);
      };
      renderer.domElement.style.cursor = "grab";
      renderer.domElement.addEventListener("pointermove", onMove);
      renderer.domElement.addEventListener("pointerleave", onLeave);
      renderer.domElement.addEventListener("pointerdown", onDown);
      renderer.domElement.addEventListener("pointerup", onUp);

      /* Render loop — idle when nothing moves, paused while off-screen */
      let visible = true;
      const io = new IntersectionObserver(([entry]) => {
        visible = entry!.isIntersecting;
        if (visible) dirty = true;
      });
      io.observe(mount);
      const animate = () => {
        if (disposed) return;
        raf = requestAnimationFrame(animate);
        if (!visible) return;
        controls.update();
        if (moving) {
          let settled = true;
          for (let i = 0; i < count; i++) {
            for (let k = 0; k < 3; k++) {
              const j = i * 3 + k;
              const d = goalPos[j]! - pos[j]!;
              if (Math.abs(d) > 0.0008) {
                pos[j] = pos[j]! + d * 0.12;
                settled = false;
              } else pos[j] = goalPos[j]!;
            }
            const dr = goalRad[i]! - rad[i]!;
            if (Math.abs(dr) > 0.0004) {
              rad[i] = rad[i]! + dr * 0.14;
              settled = false;
            } else rad[i] = goalRad[i]!;
            matrix.makeScale(rad[i]!, rad[i]!, rad[i]!);
            matrix.setPosition(pos[i * 3]!, pos[i * 3 + 1]!, pos[i * 3 + 2]!);
            mesh.setMatrixAt(i, matrix);
          }
          mesh.instanceMatrix.needsUpdate = true;
          if (settled) moving = false;
          dirty = true;
        }
        if (dirty) {
          dirty = false;
          syncMarkers();
          placeLabels();
          renderer.render(scene, camera);
        }
      };
      animate();

      teardown = () => {
        cancelAnimationFrame(raf);
        ro.disconnect();
        io.disconnect();
        themeObserver.disconnect();
        controls.dispose();
        renderer.domElement.removeEventListener("pointermove", onMove);
        renderer.domElement.removeEventListener("pointerleave", onLeave);
        renderer.domElement.removeEventListener("pointerdown", onDown);
        renderer.domElement.removeEventListener("pointerup", onUp);
        geometry.dispose();
        material.dispose();
        mesh.dispose();
        ringGeometry.dispose();
        selectedMarker.material.dispose();
        hoverMarker.material.dispose();
        frameGeometry.dispose();
        frameMaterial.dispose();
        guideGeometry?.dispose();
        guideMaterial.dispose();
        renderer.dispose();
        renderer.forceContextLoss();
        renderer.domElement.remove();
        syncDots.current = syncGuides.current = syncSelection.current = null;
        zoomBy.current = resetView.current = null;
      };
      if (disposed) teardown();
    })();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      teardown?.();
    };
  }, [count]);

  useEffect(() => {
    syncDots.current?.();
  }, [dots]);
  useEffect(() => {
    syncGuides.current?.();
  }, [rows, columns, columnLines]);
  useEffect(() => {
    syncSelection.current?.();
  }, [selectedId]);

  return (
    <div
      data-slot="dot-field-3d"
      className={cn("relative h-[28rem] overflow-hidden rounded-xl border border-border bg-surface/50 sm:h-[34rem]", className)}
    >
      <div ref={mountRef} className="absolute inset-0" />
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        {rows.map((row, i) => (
          <span
            key={row.id}
            ref={(el) => {
              rowRefs.current[i] = el;
            }}
            className="numeric absolute left-0 top-0 whitespace-nowrap font-mono text-[0.625rem] leading-none text-muted-foreground will-change-transform"
          >
            {row.label}
          </span>
        ))}
        {columns.map((column, i) => (
          <span
            key={column.id}
            ref={(el) => {
              colRefs.current[i] = el;
            }}
            title={column.title ?? column.label}
            className="absolute left-0 top-0 max-w-[4.5rem] truncate text-center text-[0.625rem] leading-tight text-muted-foreground will-change-transform"
          >
            {column.label}
          </span>
        ))}
        <span
          ref={zLowRef}
          className="absolute left-0 top-0 whitespace-nowrap font-mono text-[0.625rem] leading-none text-muted-foreground will-change-transform"
        >
          {zLabels.low}
        </span>
        <span
          ref={zHighRef}
          className="absolute left-0 top-0 whitespace-nowrap font-mono text-[0.625rem] leading-none text-muted-foreground will-change-transform"
        >
          {zLabels.high}
        </span>
        <span className="absolute bottom-2 right-3 rounded-md bg-surface/80 px-2 py-1 text-[0.625rem] text-muted-foreground">
          Depth: {zLabels.title} · drag to rotate, scroll or pinch to zoom
        </span>
        <div className="pointer-events-auto absolute bottom-12 right-3 flex flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-xs">
          {[
            { label: "Zoom in", icon: Plus, run: () => zoomBy.current?.(0.8) },
            { label: "Zoom out", icon: Minus, run: () => zoomBy.current?.(1.25) },
            { label: "Reset view", icon: RotateCcw, run: () => resetView.current?.() },
          ].map(({ label, icon: Icon, run }) => (
            <button
              key={label}
              type="button"
              aria-label={label}
              title={label}
              onClick={run}
              className="grid size-8 place-items-center text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-ring [&+&]:border-t [&+&]:border-border"
            >
              <Icon className="size-4" aria-hidden />
            </button>
          ))}
        </div>
        <div
          ref={tipRef}
          className={cn(
            "absolute left-0 top-0 z-10 w-56 rounded-lg border border-border bg-surface p-3 shadow-lg transition-opacity duration-150",
            hoverId && renderTooltip ? "opacity-100" : "opacity-0",
          )}
        >
          {hoverId && renderTooltip ? renderTooltip(hoverId) : null}
        </div>
      </div>
    </div>
  );
}
