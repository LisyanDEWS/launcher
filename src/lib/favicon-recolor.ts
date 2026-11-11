/**
 * Multi-tone Material recolour of a site icon — the same idea as the themed app-menu icons:
 * the logo's colour groups map onto the theme's tones (ink, accent, middle, deep), white details
 * inside the mark become "paper", light parts outside it become "soft", and the result sits on a
 * primary-container tile.
 *
 * IMPORTANT: both functions below are self-contained on purpose. The extension's content script
 * embeds their exact source through Function.prototype.toString(), so they must not reference
 * anything outside their own bodies (no imports, no module-level helpers or constants).
 */

export type FaviconPalette = {
  /** primary */
  ink: string;
  /** on-primary — details drawn inside the mark */
  paper: string;
  /** primary-container — the tile behind the mark */
  tile: string;
  /** tertiary */
  accent: string;
  /** primary ↔ tertiary */
  middle: string;
  /** primary ↔ on-primary — light parts outside the mark */
  soft: string;
  /** primary ↔ on-primary-container */
  deep: string;
};

export type FaviconMode = "themed" | "mono" | "original";

/**
 * Recolours RGBA pixels of an icon (w×h). Returns new RGBA pixels of the same size, or null when
 * nothing visible is left. "themed" = multi-tone; "mono" = one-tone silhouette with cut-out details.
 */
export function recolorFavicon(src: Uint8ClampedArray, w: number, h: number, palette: Partial<FaviconPalette> | null | undefined, mode: string): Uint8ClampedArray | null {
  const n = w * h;
  if (!src || src.length < n * 4 || n === 0) return null;
  const hex = (value: unknown, fallback: string): number[] => {
    let s = String(value || fallback).replace("#", "");
    if (s.length === 3) s = s[0] + s[0] + s[1] + s[1] + s[2] + s[2];
    let v = parseInt(s.slice(0, 6), 16);
    if (!isFinite(v)) v = parseInt(fallback.replace("#", ""), 16);
    return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
  };
  const P = palette || {};
  const INK = hex(P.ink, "#6750a4");
  const PAPER = hex(P.paper, "#ffffff");
  const ACCENT = hex(P.accent, "#7d5260");
  const MIDDLE = hex(P.middle, "#73598f");
  const SOFT = hex(P.soft, "#a493c9");
  const DEEP = hex(P.deep, "#4f3c86");
  const mono = mode === "mono";

  // sRGB → CIELAB (D65), for perceptual grouping.
  const lin = (u: number) => {
    u /= 255;
    return u <= 0.04045 ? u / 12.92 : Math.pow((u + 0.055) / 1.055, 2.4);
  };
  const fl = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const toLab = (r: number, g: number, b: number) => {
    const R = lin(r);
    const G = lin(g);
    const B = lin(b);
    const fx = fl((R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047);
    const fy = fl(R * 0.2126 + G * 0.7152 + B * 0.0722);
    const fz = fl((R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883);
    return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
  };
  const dist = (a: number[], b: number[]) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

  // 1. What is not the mark: transparency, plus an opaque white backdrop touching the edges.
  const EXT = 1;
  const PAPER_K = 2;
  const COLOUR = 3;
  const kind = new Uint8Array(n);
  const isWhite = (i: number) => {
    const p = i * 4;
    const hi = Math.max(src[p], src[p + 1], src[p + 2]);
    const lo = Math.min(src[p], src[p + 1], src[p + 2]);
    return src[p + 3] > 230 && lo > 228 && hi - lo < 20;
  };
  for (let i = 0; i < n; i++) kind[i] = src[i * 4 + 3] < 24 ? EXT : 0;
  const edge: number[] = [];
  for (let x = 0; x < w; x++) edge.push(x, (h - 1) * w + x);
  for (let y = 1; y < h - 1; y++) edge.push(y * w, y * w + w - 1);
  let opaqueEdge = 0;
  let whiteEdge = 0;
  for (const e of edge) {
    if (src[e * 4 + 3] >= 24) {
      opaqueEdge++;
      if (isWhite(e)) whiteEdge++;
    }
  }
  if (opaqueEdge > edge.length * 0.35 && whiteEdge > opaqueEdge * 0.55) {
    const queue: number[] = [];
    for (const e of edge) {
      if (kind[e] !== EXT && isWhite(e)) {
        kind[e] = EXT;
        queue.push(e);
      }
    }
    for (let q = 0; q < queue.length; q++) {
      const c = queue[q];
      const cx = c % w;
      const around = [cx > 0 ? c - 1 : -1, cx < w - 1 ? c + 1 : -1, c >= w ? c - w : -1, c < n - w ? c + w : -1];
      for (const j of around) {
        if (j >= 0 && kind[j] === 0 && isWhite(j)) {
          kind[j] = EXT;
          queue.push(j);
        }
      }
    }
  }

  // 2. The mark's pixels: near-white "paper candidates" vs. everything coloured or dark.
  const labs = new Float32Array(n * 3);
  let colourCount = 0;
  let paperCount = 0;
  let paperSumL = 0;
  for (let i = 0; i < n; i++) {
    if (kind[i] === EXT) continue;
    const p = i * 4;
    const L = toLab(src[p], src[p + 1], src[p + 2]);
    labs[i * 3] = L[0];
    labs[i * 3 + 1] = L[1];
    labs[i * 3 + 2] = L[2];
    if (L[0] > 86 && Math.hypot(L[1], L[2]) < 12) {
      kind[i] = PAPER_K;
      paperCount++;
      paperSumL += L[0];
    } else {
      kind[i] = COLOUR;
      colourCount++;
    }
  }
  if (!colourCount && !paperCount) return null;
  const paperMeanL = paperCount ? paperSumL / paperCount : 95;

  // 3. Colour groups: weighted k-means over a 4-bit histogram (fast, deterministic).
  let centers: { c: number[]; w: number }[] = [];
  const group = new Int8Array(n).fill(-1);
  if (colourCount) {
    const buckets: Record<number, number[]> = {};
    const keys: number[] = [];
    for (let i = 0; i < n; i++) {
      if (kind[i] !== COLOUR) continue;
      if (src[i * 4 + 3] < 160 && colourCount > 40) continue;
      const key = ((src[i * 4] >> 4) << 8) | ((src[i * 4 + 1] >> 4) << 4) | (src[i * 4 + 2] >> 4);
      let bucket = buckets[key];
      if (!bucket) {
        bucket = buckets[key] = [0, 0, 0, 0];
        keys.push(key);
      }
      bucket[0] += 1;
      bucket[1] += labs[i * 3];
      bucket[2] += labs[i * 3 + 1];
      bucket[3] += labs[i * 3 + 2];
    }
    const pts = keys.map((key) => {
      const b = buckets[key];
      return { w: b[0], c: [b[1] / b[0], b[2] / b[0], b[3] / b[0]] };
    });
    pts.sort((a, b) => b.w - a.w);
    const seeds: number[][] = [];
    if (pts.length) seeds.push(pts[0].c.slice());
    while (seeds.length < 4) {
      let best: { w: number; c: number[] } | null = null;
      let bestScore = 0;
      for (const pt of pts) {
        let dmin = Infinity;
        for (const s of seeds) dmin = Math.min(dmin, dist(pt.c, s));
        const score = dmin * Math.sqrt(pt.w);
        if (dmin > 24 && score > bestScore) {
          bestScore = score;
          best = pt;
        }
      }
      if (!best) break;
      seeds.push(best.c.slice());
    }
    let counts = seeds.map(() => 0);
    for (let iteration = 0; iteration < 8; iteration++) {
      const sums = seeds.map(() => [0, 0, 0]);
      counts = seeds.map(() => 0);
      for (const pt of pts) {
        let bi = 0;
        let bd = Infinity;
        for (let u = 0; u < seeds.length; u++) {
          const d = dist(pt.c, seeds[u]);
          if (d < bd) {
            bd = d;
            bi = u;
          }
        }
        counts[bi] += pt.w;
        sums[bi][0] += pt.c[0] * pt.w;
        sums[bi][1] += pt.c[1] * pt.w;
        sums[bi][2] += pt.c[2] * pt.w;
      }
      for (let u = 0; u < seeds.length; u++) if (counts[u]) seeds[u] = [sums[u][0] / counts[u], sums[u][1] / counts[u], sums[u][2] / counts[u]];
    }
    const total = counts.reduce((sum, v) => sum + v, 0) || 1;
    for (let u = 0; u < seeds.length; u++) {
      if (counts[u] < total * 0.025) continue; // slivers are absorbed by their neighbours
      const twin = centers.find((kept) => dist(kept.c, seeds[u]) < 20);
      if (twin) twin.w += counts[u];
      else centers.push({ c: seeds[u], w: counts[u] });
    }
    if (!centers.length) centers.push({ c: seeds[0], w: total });
    centers.sort((a, b) => b.w - a.w);
    for (let i = 0; i < n; i++) {
      if (kind[i] !== COLOUR) continue;
      const lab = [labs[i * 3], labs[i * 3 + 1], labs[i * 3 + 2]];
      let bi = 0;
      let bd = Infinity;
      for (let u = 0; u < centers.length; u++) {
        const d = dist(lab, centers[u].c);
        if (d < bd) {
          bd = d;
          bi = u;
        }
      }
      group[i] = bi;
    }
  }

  // 4. Paper components: enclosed by the mark (a detail) or exposed to the outside (a light part).
  const comp = new Int32Array(n).fill(-1);
  const exposed: boolean[] = [];
  for (let i = 0; i < n; i++) {
    if (kind[i] !== PAPER_K || comp[i] >= 0) continue;
    const id = exposed.length;
    let touches = false;
    const stack = [i];
    comp[i] = id;
    while (stack.length) {
      const s = stack.pop() as number;
      const sx = s % w;
      const sy = (s / w) | 0;
      if (sx === 0 || sy === 0 || sx === w - 1 || sy === h - 1) touches = true;
      const around = [sx > 0 ? s - 1 : -1, sx < w - 1 ? s + 1 : -1, sy > 0 ? s - w : -1, sy < h - 1 ? s + w : -1];
      for (const j of around) {
        if (j < 0) continue;
        if (kind[j] === EXT) touches = true;
        else if (kind[j] === PAPER_K && comp[j] < 0) {
          comp[j] = id;
          stack.push(j);
        }
      }
    }
    exposed.push(touches);
  }

  // 5. Roles → tones. The biggest group is the ink; a strongly contrasting group that sits inside it
  //    is a detail (paper); the rest get the accent tones.
  const G = centers.length;
  const enclosed = new Array(G).fill(0);
  const outside = new Array(G).fill(0);
  for (let i = 0; i < n; i++) {
    const g = group[i];
    if (g <= 0) continue;
    const x = i % w;
    const around = [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i >= w ? i - w : -1, i < n - w ? i + w : -1];
    for (const j of around) {
      if (j < 0 || kind[j] === EXT) outside[g]++;
      else if (group[j] === 0) enclosed[g]++;
    }
  }
  const extras = [ACCENT, MIDDLE, DEEP];
  const tones: number[][] = [];
  let extra = 0;
  for (let g = 0; g < G; g++) {
    if (g === 0) tones.push(INK);
    else if (Math.abs(centers[g].c[0] - centers[0].c[0]) > 38 && enclosed[g] > (enclosed[g] + outside[g]) * 0.6) tones.push(PAPER);
    else tones.push(extras[Math.min(extras.length - 1, extra++)]);
  }

  // 6. Paint. Each pixel keeps a little of its shading relative to its group, so gradients stay alive.
  const out = new Uint8ClampedArray(n * 4);
  const shade = (tone: number[], delta: number) => {
    const k = Math.max(-0.42, Math.min(0.42, (delta / 100) * 0.85));
    const target = k > 0 ? 255 : 0;
    const f = Math.abs(k);
    return [tone[0] + (target - tone[0]) * f, tone[1] + (target - tone[1]) * f, tone[2] + (target - tone[2]) * f];
  };
  let coverage = 0;
  for (let i = 0; i < n; i++) {
    if (kind[i] === EXT) continue;
    let tone: number[];
    let base: number;
    if (kind[i] === COLOUR) {
      const g = Math.max(0, group[i]);
      tone = mono ? INK : tones[g];
      base = centers[g] ? centers[g].c[0] : labs[i * 3];
    } else {
      const open = exposed[comp[i]];
      if (mono && !open && colourCount) continue; // cut-out detail in a silhouette
      tone = !colourCount || mono ? INK : open ? SOFT : PAPER;
      base = paperMeanL;
    }
    const colour = shade(tone, labs[i * 3] - base);
    const o = i * 4;
    out[o] = colour[0];
    out[o + 1] = colour[1];
    out[o + 2] = colour[2];
    out[o + 3] = src[o + 3];
    if (src[o + 3] > 120) coverage++;
  }
  return coverage >= Math.max(4, n * 0.012) ? out : null;
}

/**
 * Draws an image into a square canvas, recolours it and (for "themed") places it on a rounded
 * primary-container tile at 72 % — exactly like `.ap-ico--themed`. Returns a PNG data URL, or null
 * if the pixels cannot be read (a tainted canvas) or nothing visible is left.
 * The recolour function is passed in so this stays self-contained too.
 */
export function themeFaviconImage(
  image: CanvasImageSource & { naturalWidth?: number; naturalHeight?: number; width?: number | SVGAnimatedLength; height?: number | SVGAnimatedLength },
  palette: Partial<FaviconPalette> | null | undefined,
  mode: string,
  recolor: (src: Uint8ClampedArray, w: number, h: number, palette: Partial<FaviconPalette> | null | undefined, mode: string) => Uint8ClampedArray | null,
): string | null {
  const size = 64;
  const read = document.createElement("canvas");
  read.width = read.height = size;
  const rc = read.getContext("2d", { willReadFrequently: true });
  if (!rc) return null;
  const iw = Number(image.naturalWidth || image.width) || size;
  const ih = Number(image.naturalHeight || image.height) || size;
  const scale = Math.min(size / iw, size / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  rc.imageSmoothingQuality = "high";
  rc.drawImage(image, (size - dw) / 2, (size - dh) / 2, dw, dh);
  let pixels: ImageData;
  try {
    pixels = rc.getImageData(0, 0, size, size);
  } catch {
    return null;
  }
  const recoloured = recolor(pixels.data, size, size, palette, mode);
  if (!recoloured) return null;
  const glyph = document.createElement("canvas");
  glyph.width = glyph.height = size;
  const gc = glyph.getContext("2d");
  if (!gc) return null;
  gc.putImageData(new ImageData(recoloured as unknown as Uint8ClampedArray<ArrayBuffer>, size, size), 0, 0);
  const result = document.createElement("canvas");
  result.width = result.height = size;
  const ctx = result.getContext("2d");
  if (!ctx) return null;
  if (mode === "themed") {
    const radius = size * 0.3;
    ctx.fillStyle = (palette && palette.tile) || "#e8def8";
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(0, 0, size, size, radius);
    else ctx.rect(0, 0, size, size);
    ctx.fill();
    const g = size * 0.72;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(glyph, (size - g) / 2, (size - g) / 2, g, g);
  } else {
    ctx.drawImage(glyph, 0, 0);
  }
  return result.toDataURL("image/png");
}
