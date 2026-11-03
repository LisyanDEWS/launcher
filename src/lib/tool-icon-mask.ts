export type ToolIconMasks = { ink: string; paper: string | null };

const cache = new Map<string, Promise<ToolIconMasks | null>>();
const EDGE = 96;

/** Neutral white masks keep icon coverage, not its original colour or brightness. */
export function splitToolPixels(rgba: Uint8ClampedArray, width: number, height: number) {
  const pixels = new Uint8ClampedArray(rgba);
  const count = width * height;
  const cleared = new Uint8Array(count);
  const queue: number[] = [];
  const isWhite = (i: number) => pixels[i * 4 + 3] > 245 && pixels[i * 4] > 242 && pixels[i * 4 + 1] > 242 && pixels[i * 4 + 2] > 242;

  // Remove an opaque white website-favicon background, but keep enclosed white letters.
  const visit = (i: number) => {
    if (cleared[i] || !isWhite(i)) return;
    cleared[i] = 1;
    queue.push(i);
  };
  const edge = new Set<number>();
  for (let x = 0; x < width; x++) { edge.add(x); edge.add((height - 1) * width + x); }
  for (let y = 0; y < height; y++) { edge.add(y * width); edge.add(y * width + width - 1); }
  const whiteBackground = [...edge].filter(isWhite).length > edge.size * 0.55;
  if (whiteBackground) edge.forEach(visit);
  for (let pos = 0; pos < queue.length; pos++) {
    const i = queue[pos];
    if (i % width > 0) visit(i - 1);
    if (i % width < width - 1) visit(i + 1);
    if (i >= width) visit(i - width);
    if (i < count - width) visit(i + width);
  }

  const ink = new Uint8ClampedArray(pixels.length);
  const paper = new Uint8ClampedArray(pixels.length);
  let paperPixels = 0, inkPixels = 0;
  for (let i = 0; i < count; i++) {
    if (cleared[i] || pixels[i * 4 + 3] === 0) continue;
    const p = i * 4;
    const hi = Math.max(pixels[p], pixels[p + 1], pixels[p + 2]);
    const lo = Math.min(pixels[p], pixels[p + 1], pixels[p + 2]);
    const detail = lo > 210 && hi - lo < 30;
    const layer = detail ? paper : ink;
    layer[p] = layer[p + 1] = layer[p + 2] = 255;
    layer[p + 3] = pixels[p + 3];
    if (detail) paperPixels++; else inkPixels++;
  }
  if (!inkPixels && paperPixels) {
    return { ink: paper, paper: ink, paperPixels: 0, inkPixels: paperPixels };
  }
  return { ink, paper, paperPixels, inkPixels };
}

export function loadToolIconMasks(url: string): Promise<ToolIconMasks | null> {
  const existing = cache.get(url);
  if (existing) return existing;
  if (cache.size >= 100) cache.delete(cache.keys().next().value!);

  const promise = new Promise<ToolIconMasks | null>((resolve) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    let timer = 0;
    const finish = (result: ToolIconMasks | null) => {
      window.clearTimeout(timer);
      image.onload = null;
      image.onerror = null;
      resolve(result);
    };
    image.onload = () => {
      try {
        if (image.naturalWidth < 32) { finish(null); return; }
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = EDGE;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) { finish(null); return; }
        const scale = Math.min(EDGE / image.naturalWidth, EDGE / image.naturalHeight);
        const w = image.naturalWidth * scale, h = image.naturalHeight * scale;
        context.drawImage(image, (EDGE - w) / 2, (EDGE - h) / 2, w, h);
        const source = context.getImageData(0, 0, EDGE, EDGE);
        const { ink, paper, paperPixels, inkPixels } = splitToolPixels(source.data, EDGE, EDGE);
        if (!inkPixels) { finish(null); return; }
        const dataUrl = (data: Uint8ClampedArray) => {
          const frame = context.createImageData(EDGE, EDGE);
          frame.data.set(data);
          context.putImageData(frame, 0, 0);
          return canvas.toDataURL("image/png");
        };
        finish({ ink: dataUrl(ink), paper: paperPixels ? dataUrl(paper) : null });
      } catch {
        // No CORS permission or an unreadable image: use the tool's initial, never a grey filter.
        finish(null);
      }
    };
    image.onerror = () => finish(null);
    timer = window.setTimeout(() => finish(null), 8000);
    image.src = url;
  });
  cache.set(url, promise);
  return promise;
}