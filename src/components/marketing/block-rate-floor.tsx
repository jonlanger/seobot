import { useEffect, useRef } from "react";
import type * as T3 from "three";
import { cn } from "@/lib/cn";

/**
 * Hero backdrop — an abstracted Crawler × Vertical block-rate matrix.
 *
 * The whole hero is a field of flat tiles. Each real cell of the study's matrix
 * (crawler × vertical, % of sites blocking) becomes a soft hill in the field;
 * fine ridge lines trace the terrain, hairline spikes mark the strongest peaks,
 * and a few of those peaks carry data callouts. The pointer lifts nearby tiles,
 * nudges the camera, and expands the closest callout.
 *
 * Study data and Three.js load after first paint so neither joins the landing
 * page's main bundle.
 */

const GX = 72;
const GZ = 46;
const PEAK_HEIGHT = 3.1;
const TILE = 0.82;
/** Share of the field height used as the terrain's visible relief. */
const HS = 0.8;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smoothstep = (a: number, b: number, v: number) => {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const easeOut = (t: number) => 1 - Math.pow(1 - clamp01(t), 3);

/** Resolve any CSS colour (incl. oklch / var()) to an sRGB hex number via canvas. */
function resolveColor(value: string, host: HTMLElement): number {
  const probe = document.createElement("span");
  probe.style.color = value;
  host.appendChild(probe);
  const computed = getComputedStyle(probe).color;
  probe.remove();
  const ctx = document.createElement("canvas").getContext("2d");
  if (!ctx) return 0x888888;
  ctx.fillStyle = "#000";
  ctx.fillStyle = computed;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  return (r << 16) | (g << 8) | b;
}

interface Peak {
  label: string;
  pct: number;
  count: number;
  total: number;
  gx: number;
  gz: number;
}

export function BlockRateFloor({ className }: { className?: string }) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    let disposed = false;
    let teardown: (() => void) | undefined;

    (async () => {
      const [THREE, data] = await Promise.all([import("three"), import("@/lib/crawler-matrix")]);
      if (disposed) return;

      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const matrix = data.blockRateMatrix("block");
      const nC = data.CRAWLERS.length;
      const nV = data.VERTICALS.length;
      const totalSites = matrix[0]?.reduce((sum, c) => sum + c.total, 0) ?? 0;

      /* ---------- Height field from the real matrix ---------- */
      const peaks: Peak[] = [];
      for (let ci = 0; ci < nC; ci++) {
        for (let vi = 0; vi < nV; vi++) {
          const cell = matrix[ci][vi];
          peaks.push({
            label: `${data.CRAWLERS[ci]} × ${data.shortVertical(data.VERTICALS[vi])}`,
            pct: cell.pct,
            count: cell.count,
            total: cell.total,
            // R2 low-discrepancy scatter: evenly spread, organic, deterministic.
            gx: 5 + (((ci * nV + vi + 1) * 0.7548776662) % 1) * (GX - 10),
            gz: 5 + (((ci * nV + vi + 1) * 0.5698402909) % 1) * (GZ - 10),
          });
        }
      }
      const sigma = 1.7;
      const field = new Float32Array(GX * GZ);
      let fieldMax = 1e-6;
      for (let iz = 0; iz < GZ; iz++) {
        for (let ix = 0; ix < GX; ix++) {
          let h = 0;
          for (const p of peaks) {
            if (p.pct <= 0) continue;
            const dx = ix - p.gx;
            const dz = iz - p.gz;
            if (Math.abs(dx) > 7 || Math.abs(dz) > 7) continue;
            h += (p.pct / 100) * Math.exp(-(dx * dx + dz * dz) / (2 * sigma * sigma));
          }
          field[iz * GX + ix] = h;
          fieldMax = Math.max(fieldMax, h);
        }
      }
      for (let i = 0; i < field.length; i++) field[i] = (field[i] / fieldMax) * PEAK_HEIGHT;
      const norm = (ix: number, iz: number) => field[iz * GX + ix] / PEAK_HEIGHT;
      const wx = (ix: number) => ix - GX / 2 + 0.5;
      const wz = (iz: number) => iz - GZ / 2 + 0.5;

      /* ---------- Renderer / scene ---------- */
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 400);
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setClearColor(0x000000, 0);
      renderer.domElement.style.display = "block";
      mount.appendChild(renderer.domElement);

      const overlay = document.createElement("div");
      overlay.className = "pointer-events-none absolute inset-0 overflow-hidden";
      mount.appendChild(overlay);

      const hud = document.createElement("div");
      hud.className =
        "absolute bottom-6 right-6 hidden flex-col items-end gap-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground lg:flex";
      hud.innerHTML = `<span>${totalSites} sites · ${nC} crawlers · ${nV} verticals</span><span class="text-muted-foreground/70">block rate = % of sites disallowing the crawler in robots.txt</span>`;
      overlay.appendChild(hud);

      /* Theme colours — re-read when the theme class flips. */
      const baseColor = new THREE.Color();
      const accentColor = new THREE.Color();
      const lineColor = new THREE.Color();
      const syncTheme = () => {
        const bg = new THREE.Color(resolveColor("var(--background)", mount));
        const fg = new THREE.Color(resolveColor("var(--foreground)", mount));
        accentColor.setHex(resolveColor("var(--primary)", mount));
        baseColor.copy(bg).lerp(fg, 0.075);
        lineColor.copy(accentColor);
      };
      syncTheme();

      /* ---------- Tiles ---------- */
      const tileGeometry = new THREE.BoxGeometry(1, 1, 1);
      const tileMaterial = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.94 });
      const tiles = new THREE.InstancedMesh(tileGeometry, tileMaterial, GX * GZ);
      tiles.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      tiles.frustumCulled = false;
      scene.add(tiles);
      const tileEdge = new Float32Array(GX * GZ);
      for (let iz = 0; iz < GZ; iz++) {
        for (let ix = 0; ix < GX; ix++) {
          const nr = Math.hypot(wx(ix) / (GX / 2), wz(iz) / (GZ / 2));
          tileEdge[iz * GX + ix] = 1 - smoothstep(0.78, 1.12, nr);
        }
      }

      /* ---------- Ridge lines ---------- */
      const ridgeRows: number[] = [];
      for (let iz = 3; iz < GZ - 2; iz += 2) ridgeRows.push(iz);
      const ridgeMaterial = new THREE.LineBasicMaterial({ transparent: true, opacity: 0.4 });
      const ridges = ridgeRows.map(() => {
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(GX * 3), 3));
        const line = new THREE.Line(geometry, ridgeMaterial);
        line.frustumCulled = false;
        scene.add(line);
        return line;
      });

      /* ---------- Spikes (top peaks) ---------- */
      const ranked = [...peaks].filter((p) => p.pct >= 12).sort((a, b) => b.pct - a.pct).slice(0, 30);
      const spikeMaterial = new THREE.LineBasicMaterial({ transparent: true, opacity: 0.95 });
      const spikeGeometry = new THREE.BufferGeometry();
      spikeGeometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(ranked.length * 6), 3));
      const spikes = new THREE.LineSegments(spikeGeometry, spikeMaterial);
      spikes.frustumCulled = false;
      scene.add(spikes);
      const capGeometry = new THREE.BufferGeometry();
      capGeometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(ranked.length * 3), 3));
      const capMaterial = new THREE.PointsMaterial({ size: 5, sizeAttenuation: false, transparent: true, opacity: 0.95 });
      const caps = new THREE.Points(capGeometry, capMaterial);
      caps.frustumCulled = false;
      scene.add(caps);
      const spikeCell = ranked.map((p) => ({
        ix: Math.min(GX - 1, Math.max(0, Math.round(p.gx))),
        iz: Math.min(GZ - 1, Math.max(0, Math.round(p.gz))),
        len: 0.9 + (p.pct / 100) * 2.6,
      }));
      const spikeTop = ranked.map(() => new THREE.Vector3());

      /* ---------- Camera framing ---------- */
      const target = new THREE.Vector3(0, 0, 1);
      const elevation = 0.86;
      const yaw = -0.1;
      let distance = 40;
      const camBase = new THREE.Vector3();
      const placeCamera = (px: number, py: number, t: number) => {
        const sway = reduceMotion ? 0 : Math.sin(t * 0.12) * 0.035;
        const az = yaw + sway + px * 0.05;
        const el = elevation + py * 0.03;
        camBase.set(
          target.x + Math.sin(az) * Math.cos(el) * distance,
          target.y + Math.sin(el) * distance,
          target.z + Math.cos(az) * Math.cos(el) * distance,
        );
        camera.position.copy(camBase);
        camera.lookAt(target);
      };

      /* ---------- Callouts ---------- */
      interface Callout {
        spike: number;
        major: boolean;
        root: HTMLDivElement;
        detail: HTMLElement;
        label: HTMLElement;
        shown: number;
      }
      let callouts: Callout[] = [];
      const makeCallout = (spike: number, major: boolean): Callout => {
        const p = ranked[spike];
        const root = document.createElement("div");
        root.className = "absolute left-0 top-0 will-change-transform";
        const inner = document.createElement("div");
        inner.className = "absolute bottom-0 left-0 flex flex-col gap-1 rounded-r-sm border-l border-primary/60 bg-background/65 py-1 pl-2 pr-2 backdrop-blur-[2px]";
        inner.style.minHeight = major ? "40px" : "18px";
        const dot = document.createElement("i");
        dot.className = "absolute -bottom-[3px] -left-[3.5px] size-1.5 rounded-full bg-primary shadow-[0_0_0_3px] shadow-primary/20";
        const value = document.createElement("span");
        value.className = "font-mono text-sm font-medium tabular-nums leading-none text-foreground";
        value.textContent = `${Math.round(p.pct)}%`;
        const label = document.createElement("span");
        label.className = "whitespace-nowrap font-mono text-[11px] uppercase leading-none tracking-wider text-muted-foreground transition-opacity duration-300";
        label.textContent = p.label;
        const detail = document.createElement("span");
        detail.className = "whitespace-nowrap font-mono text-[11px] leading-none text-muted-foreground transition-opacity duration-300";
        detail.textContent = `${p.count} of ${p.total} sites block`;
        inner.append(value, label, detail);
        root.append(dot, inner);
        overlay.appendChild(root);
        root.style.opacity = "0";
        return { spike, major, root, detail, label, shown: 0 };
      };

      const project = (v: T3.Vector3, out: { x: number; y: number }) => {
        const p = v.clone().project(camera);
        out.x = (p.x * 0.5 + 0.5) * mount.clientWidth;
        out.y = (-p.y * 0.5 + 0.5) * mount.clientHeight;
      };

      const rebuildCallouts = () => {
        callouts.forEach((c) => c.root.remove());
        callouts = [];
        const w = mount.clientWidth;
        const h = mount.clientHeight;
        const wide = w >= 1024;
        const minX = wide ? w * 0.5 : w * 0.15;
        const maxMajor = wide ? 5 : 2;
        // Establish spike-top screen positions at rest (intro complete).
        for (let i = 0; i < ranked.length; i++) {
          const c = spikeCell[i];
          spikeTop[i].set(wx(c.ix), field[c.iz * GX + c.ix] * HS + c.len, wz(c.iz));
        }
        const placed: { x: number; y: number }[] = [];
        const pt = { x: 0, y: 0 };
        const free = (x: number, y: number, gap: number) => placed.every((q) => Math.hypot(q.x - x, q.y - y) >= gap);
        const inView = (x: number, y: number) => x > minX && x < w - 110 && y > h * 0.18 && y < h * 0.88;
        let majors = 0;
        const micros: number[] = [];
        for (let i = 0; i < ranked.length; i++) {
          project(spikeTop[i], pt);
          if (!inView(pt.x, pt.y)) continue;
          if (majors < maxMajor && free(pt.x, pt.y, 190)) {
            placed.push({ ...pt });
            callouts.push(makeCallout(i, true));
            majors++;
          } else micros.push(i);
        }
        if (wide) {
          for (const i of micros) {
            project(spikeTop[i], pt);
            if (callouts.length >= maxMajor + 9) break;
            if (free(pt.x, pt.y, 84)) {
              placed.push({ ...pt });
              callouts.push(makeCallout(i, false));
            }
          }
        }
      };

      /* ---------- Sizing ---------- */
      const fit = () => {
        const w = mount.clientWidth;
        const h = mount.clientHeight;
        if (w === 0 || h === 0) return;
        renderer.setSize(w, h);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        const vFov = (camera.fov * Math.PI) / 180;
        distance = (GX * 0.7) / (2 * Math.tan(vFov / 2) * Math.min(camera.aspect, 2));
        placeCamera(0, 0, 0);
        camera.updateMatrixWorld();
        rebuildCallouts();
      };
      const ro = new ResizeObserver(fit);
      ro.observe(mount);

      /* ---------- Pointer ---------- */
      const ndc = new THREE.Vector2(0, 0);
      const ray = new THREE.Raycaster();
      const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      const hit = new THREE.Vector3();
      const pointer = { x: 0, z: 0, tx: 0, tz: 0, amt: 0, tamt: 0, px: 0, py: 0, tpx: 0, tpy: 0 };
      const onMove = (e: PointerEvent) => {
        const box = mount.getBoundingClientRect();
        const inside = e.clientX >= box.left && e.clientX <= box.right && e.clientY >= box.top && e.clientY <= box.bottom;
        pointer.tamt = inside ? 1 : 0;
        if (!inside) return;
        ndc.set(((e.clientX - box.left) / box.width) * 2 - 1, -((e.clientY - box.top) / box.height) * 2 + 1);
        pointer.tpx = ndc.x;
        pointer.tpy = ndc.y;
        ray.setFromCamera(ndc, camera);
        if (ray.ray.intersectPlane(ground, hit)) {
          pointer.tx = hit.x;
          pointer.tz = hit.z;
        }
      };
      const onLeave = () => {
        pointer.tamt = 0;
      };
      if (!reduceMotion) {
        window.addEventListener("pointermove", onMove, { passive: true });
        document.documentElement.addEventListener("pointerleave", onLeave);
      }

      /* ---------- Loop ---------- */
      let visible = true;
      const io = new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
      });
      io.observe(mount);
      const themeObserver = new MutationObserver(syncTheme);
      themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "data-theme"] });

      const dummy = new THREE.Object3D();
      const tint = new THREE.Color();
      const startedAt = performance.now();
      let raf = 0;
      const sp = { x: 0, y: 0 };
      const render = () => {
        if (disposed) return;
        raf = requestAnimationFrame(render);
        if (!visible) return;
        const t = reduceMotion ? 99 : (performance.now() - startedAt) / 1000;

        pointer.amt += (pointer.tamt - pointer.amt) * 0.06;
        pointer.x += (pointer.tx - pointer.x) * 0.1;
        pointer.z += (pointer.tz - pointer.z) * 0.1;
        pointer.px += (pointer.tpx - pointer.px) * 0.05;
        pointer.py += (pointer.tpy - pointer.py) * 0.05;
        placeCamera(pointer.px, pointer.py, t);

        const sweep = reduceMotion ? -1 : ((t / 12) % 1) * 1.8 - 0.4;

        for (let iz = 0; iz < GZ; iz++) {
          for (let ix = 0; ix < GX; ix++) {
            const i = iz * GX + ix;
            const x = wx(ix);
            const z = wz(iz);
            const hn = norm(ix, iz);
            const intro = reduceMotion ? 1 : easeOut((t - 0.15 - (Math.hypot(x - 8, z) / GX) * 1.6) / 1.5);
            const dx = x - pointer.x;
            const dz = z - pointer.z;
            const infl = pointer.amt * Math.exp(-(dx * dx + dz * dz) / (2 * 2.6 * 2.6));
            const breathe = reduceMotion ? 0 : 0.035 * Math.sin(t * 0.7 + ix * 0.31 + iz * 0.23);
            const u = (x / GX + z / GZ) * 0.5 + 0.5;
            const band = Math.exp(-((u - sweep) * (u - sweep)) / (2 * 0.05 * 0.05));
            const y = (field[i] * HS + breathe + infl * 0.55) * intro;
            const size = TILE * tileEdge[i] * (0.35 + 0.65 * intro) * (1 + infl * 0.1);
            dummy.position.set(x, y, z);
            dummy.scale.set(size, 0.07, size);
            dummy.updateMatrix();
            tiles.setMatrixAt(i, dummy.matrix);
            const k = clamp01(hn * 1.25 + band * 0.22 + infl * 0.75);
            tint.copy(baseColor).lerp(accentColor, Math.pow(k, 1.15) * 0.92);
            tiles.setColorAt(i, tint);
          }
        }
        tiles.instanceMatrix.needsUpdate = true;
        if (tiles.instanceColor) tiles.instanceColor.needsUpdate = true;

        /* Ridge lines follow the tile surface. */
        ridgeMaterial.color.copy(lineColor);
        ridges.forEach((line, r) => {
          const iz = ridgeRows[r];
          const pos = line.geometry.getAttribute("position") as T3.BufferAttribute;
          for (let ix = 0; ix < GX; ix++) {
            const x = wx(ix);
            const z = wz(iz);
            const intro = reduceMotion ? 1 : easeOut((t - 0.4 - r * 0.045) / 1.4);
            const dx = x - pointer.x;
            const dz = z - pointer.z;
            const infl = pointer.amt * Math.exp(-(dx * dx + dz * dz) / (2 * 2.6 * 2.6));
            const breathe = reduceMotion ? 0 : 0.035 * Math.sin(t * 0.7 + ix * 0.31 + iz * 0.23);
            pos.setXYZ(ix, x, (field[iz * GX + ix] * HS + breathe + infl * 0.55) * intro + 0.06, z);
          }
          pos.needsUpdate = true;
        });

        /* Spikes + caps, with pointer proximity swelling the nearest. */
        spikeMaterial.color.copy(lineColor);
        capMaterial.color.copy(lineColor);
        const sPos = spikeGeometry.getAttribute("position") as T3.BufferAttribute;
        const cPos = capGeometry.getAttribute("position") as T3.BufferAttribute;
        let nearest = -1;
        let nearestD = 4.2;
        for (let i = 0; i < ranked.length; i++) {
          const c = spikeCell[i];
          const x = wx(c.ix);
          const z = wz(c.iz);
          const d = Math.hypot(x - pointer.x, z - pointer.z);
          if (pointer.amt > 0.3 && d < nearestD) {
            nearestD = d;
            nearest = i;
          }
          const grow = reduceMotion ? 1 : easeOut((t - 0.9 - i * 0.05) / 1.3);
          const swell = pointer.amt * Math.exp(-(d * d) / (2 * 3 * 3));
          const baseY = field[c.iz * GX + c.ix] * HS + 0.04 + swell * 0.55;
          const top = baseY + c.len * grow * (1 + swell * 0.35);
          sPos.setXYZ(i * 2, x, baseY, z);
          sPos.setXYZ(i * 2 + 1, x, top, z);
          cPos.setXYZ(i, x, top, z);
          spikeTop[i].set(x, top, z);
        }
        sPos.needsUpdate = true;
        cPos.needsUpdate = true;

        /* Callouts track their spike tips; the one nearest the pointer expands. */
        for (const c of callouts) {
          project(spikeTop[c.spike], sp);
          c.root.style.transform = `translate(${sp.x.toFixed(1)}px, ${sp.y.toFixed(1)}px) translateY(-100%)`;
          const active = c.spike === nearest;
          const appear = reduceMotion ? 1 : easeOut((t - 1.9 - c.spike * 0.04) / 0.8);
          c.root.style.opacity = String(appear * (c.major ? 1 : active ? 1 : 0.62));
          const expand = c.major || active ? "1" : "0";
          c.label.style.opacity = expand;
          c.detail.style.opacity = active ? "1" : "0";
        }

        renderer.render(scene, camera);
      };

      fit();
      render();

      teardown = () => {
        cancelAnimationFrame(raf);
        ro.disconnect();
        io.disconnect();
        themeObserver.disconnect();
        window.removeEventListener("pointermove", onMove);
        document.documentElement.removeEventListener("pointerleave", onLeave);
        tileGeometry.dispose();
        tileMaterial.dispose();
        tiles.dispose();
        ridgeMaterial.dispose();
        ridges.forEach((l) => l.geometry.dispose());
        spikeGeometry.dispose();
        spikeMaterial.dispose();
        capGeometry.dispose();
        capMaterial.dispose();
        renderer.dispose();
        renderer.forceContextLoss();
        renderer.domElement.remove();
        overlay.remove();
      };
    })();

    return () => {
      disposed = true;
      teardown?.();
    };
  }, []);

  return <div ref={mountRef} className={cn("relative", className)} />;
}
