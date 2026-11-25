import { useEffect, useState } from "react";
import { cancelRender, staticFile, useDelayRender } from "remotion";

// Everything prep.py wrote for one photo, loaded once per mount.

export type Line = [number, number, number, number, number]; // x1 y1 x2 y2 len (0..1)

export type ShotAssets = {
  photo: string;
  depth: string;
  w: number;
  h: number;
  lines: Line[];
  /** Depth at image uv, 0..1 (1 = near). Bilinear. */
  depthAt: (x: number, y: number) => number;
};

const stem = (file: string) => file.replace(/\.[^.]+$/, "");

export const assetPaths = (assetDir: string, file: string) => {
  const base = `${assetDir.replace(/\/$/, "")}/${stem(file)}`;
  return {
    photo: staticFile(`${base}.jpg`),
    depth: staticFile(`${base}.depth.png`),
    lines: staticFile(`${base}.lines.json`),
  };
};

const cache = new Map<string, Promise<ShotAssets>>();

const loadDepthSampler = (src: string) =>
  new Promise<(x: number, y: number) => number>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      // Sample from a small copy; plenty for placing line endpoints.
      const w = 270;
      const h = Math.round((img.height / img.width) * w);
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const ctx = c.getContext("2d")!;
      ctx.drawImage(img, 0, 0, w, h);
      const data = ctx.getImageData(0, 0, w, h).data;
      const at = (ix: number, iy: number) =>
        data[(Math.min(h - 1, Math.max(0, iy)) * w + Math.min(w - 1, Math.max(0, ix))) * 4] / 255;
      resolve((x, y) => {
        const fx = x * w - 0.5;
        const fy = y * h - 0.5;
        const x0 = Math.floor(fx);
        const y0 = Math.floor(fy);
        const tx = fx - x0;
        const ty = fy - y0;
        return (
          at(x0, y0) * (1 - tx) * (1 - ty) +
          at(x0 + 1, y0) * tx * (1 - ty) +
          at(x0, y0 + 1) * (1 - tx) * ty +
          at(x0 + 1, y0 + 1) * tx * ty
        );
      });
    };
    img.onerror = () => reject(new Error(`Could not load ${src}`));
    img.src = src;
  });

const load = (assetDir: string, file: string): Promise<ShotAssets> => {
  const key = `${assetDir}|${file}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const p = assetPaths(assetDir, file);
  const promise = Promise.all([
    fetch(p.lines).then((r) => {
      if (!r.ok) throw new Error(`Missing ${p.lines}. Run prep.py first.`);
      return r.json() as Promise<{ w: number; h: number; lines: Line[] }>;
    }),
    loadDepthSampler(p.depth),
  ]).then(([meta, depthAt]) => ({
    photo: p.photo,
    depth: p.depth,
    w: meta.w,
    h: meta.h,
    lines: meta.lines,
    depthAt,
  }));
  cache.set(key, promise);
  return promise;
};

export const useShotAssets = (assetDir: string, file: string | undefined) => {
  const [assets, setAssets] = useState<ShotAssets | null>(null);
  const { delayRender, continueRender } = useDelayRender();
  // Held until the commit that renders with the assets, so children that
  // mount in that commit (the WebGL photo) register their own wait first.
  const [handle] = useState(() =>
    file ? delayRender(`assets ${file}`) : null,
  );
  useEffect(() => {
    if (!file) return;
    let alive = true;
    load(assetDir, file)
      .then((a) => {
        if (alive) setAssets(a);
      })
      .catch((e) => cancelRender(e));
    return () => {
      alive = false;
    };
  }, [assetDir, file]);
  useEffect(() => {
    if (assets && handle !== null) continueRender(handle);
  }, [assets, handle, continueRender]);
  return assets;
};
