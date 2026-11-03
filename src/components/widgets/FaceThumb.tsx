import Clock from "./Clock";
import type { HomeWidget } from "../../lib/settings";
import { widgetSize } from "../../lib/widgets";

/** A live widget scaled to fit a box (galleries, lists) with zero cropping. */
export function FaceThumb({ widget, maxWidth, maxHeight }: { widget: HomeWidget; maxWidth: number; maxHeight: number }) {
  const size = widgetSize(widget);
  const ratio = Math.max(0.4, size.width / Math.max(1, size.faceHeight));
  const baseWidth = 260;
  const baseHeight = Math.max(100, Math.round(baseWidth / ratio));
  const scale = Math.min(maxWidth / baseWidth, maxHeight / baseHeight);
  const displayWidth = Math.round(baseWidth * scale);
  const displayHeight = Math.round(baseHeight * scale);

  return (
    <div
      className="relative flex items-center justify-center select-none overflow-visible"
      style={{ width: `${displayWidth}px`, height: `${displayHeight}px` }}
    >
      <div
        style={{
          width: `${baseWidth}px`,
          height: `${baseHeight}px`,
          transform: `scale(${scale})`,
          transformOrigin: "center center",
          pointerEvents: "none",
        }}
        className="flex items-center justify-center shrink-0"
      >
        <Clock widget={widget} width={baseWidth} faceHeight={baseHeight} />
      </div>
    </div>
  );
}
