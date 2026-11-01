/**
 * M3 Expressive shapes (cookies, sunny, burst, clover, flower, squircle, gem) as SVG paths
 * in a 100×100 box. Every shape is a polar radius function sampled around the circle and
 * normalised so that it touches the edges of the box.
 */
const TAU = Math.PI * 2;
const STEPS = 288;

export type ShapeId = "cookie12" | "cookie9" | "sunny" | "burst" | "clover4" | "flower8" | "squircle" | "softSquare" | "gem";

/** Regular polygon with a corner at 12 o'clock. */
const polygon = (sides: number) => (theta: number) => {
  const segment = TAU / sides;
  const local = (((theta % segment) + segment) % segment) - segment / 2;
  return Math.cos(Math.PI / sides) / Math.cos(local);
};

const superellipse = (n: number) => (theta: number) => (Math.abs(Math.cos(theta)) ** n + Math.abs(Math.sin(theta)) ** n) ** (-1 / n);

const SHAPES: Record<ShapeId, { radius: (theta: number) => number; smooth?: number }> = {
  cookie12: { radius: (t) => 1 + 0.065 * Math.cos(12 * t) },
  cookie9: { radius: (t) => 1 + 0.085 * Math.cos(9 * t) },
  sunny: { radius: (t) => 1 + 0.11 * Math.cos(8 * t) },
  burst: { radius: (t) => 0.8 + 0.2 * ((1 + Math.cos(16 * t)) / 2) ** 2.2 },
  clover4: { radius: (t) => 1 - 0.34 * Math.abs(Math.sin(2 * t)) ** 2.6 },
  flower8: { radius: (t) => 1 - 0.2 * Math.abs(Math.sin(4 * t)) ** 2.2 },
  squircle: { radius: superellipse(4.5) },
  softSquare: { radius: superellipse(3.2) },
  gem: { radius: polygon(5), smooth: 9 },
};

/** Circular moving average — rounds polygon corners. */
function smooth(radii: number[], span: number): number[] {
  let current = radii;
  for (let pass = 0; pass < 2; pass++) {
    const source = current;
    current = source.map((_, index) => {
      let sum = 0;
      for (let offset = -span; offset <= span; offset++) sum += source[(index + offset + source.length) % source.length];
      return sum / (2 * span + 1);
    });
  }
  return current;
}

const cache = new Map<ShapeId, string>();

export function shapePath(id: ShapeId): string {
  const cached = cache.get(id);
  if (cached) return cached;
  const { radius, smooth: span = 0 } = SHAPES[id];
  let radii = Array.from({ length: STEPS }, (_, index) => radius((index / STEPS) * TAU));
  if (span) radii = smooth(radii, span);
  // θ = 0 at 12 o'clock, clockwise.
  const points = radii.map((r, index) => {
    const theta = (index / STEPS) * TAU;
    return [r * Math.sin(theta), -r * Math.cos(theta)] as const;
  });
  const extent = Math.max(...points.map(([x, y]) => Math.max(Math.abs(x), Math.abs(y))));
  const path =
    points.map(([x, y], index) => `${index ? "L" : "M"}${(50 + (x / extent) * 50).toFixed(2)} ${(50 + (y / extent) * 50).toFixed(2)}`).join("") + "Z";
  cache.set(id, path);
  return path;
}
