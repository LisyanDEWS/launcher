import { shapePath, type ShapeId } from "../lib/shapes";
import type { MenuShape } from "../lib/settings";

/** Material shapes that need a clip path (plain rounded corners can't draw them). */
const CLIPPED: Partial<Record<MenuShape, ShapeId>> = {
  cookie: "cookie9",
  flower: "flower8",
  clover: "clover4",
  sunny: "sunny",
};

export const shapeClass = (shape: MenuShape) => `ap-shape--${shape}`;
export const isClippedShape = (shape: MenuShape) => shape in CLIPPED;

/** Mounted once at the app root. CSS refers to these as clip-path: url(#ap-clip-<shape>). */
export function AppShapeDefs() {
  return (
    <svg width="0" height="0" aria-hidden="true" focusable="false" style={{ position: "absolute", pointerEvents: "none" }}>
      <defs>
        {(Object.entries(CLIPPED) as [MenuShape, ShapeId][]).map(([shape, id]) => (
          <clipPath key={shape} id={`ap-clip-${shape}`} clipPathUnits="objectBoundingBox">
            <path d={shapePath(id)} transform="scale(0.01)" />
          </clipPath>
        ))}
      </defs>
    </svg>
  );
}
