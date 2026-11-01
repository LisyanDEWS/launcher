import { useState } from "react";
import { cn } from "../utils/cn";

type Props = {
  url: string;
  /** Overlay strength, percent. */
  dim: number;
  /** Blur radius, px. */
  blur: number;
  grayscale: boolean;
  /** Fill the nearest positioned parent instead of the viewport (previews). */
  contained?: boolean;
};

export function wallpaperFilter(blur: number, grayscale: boolean) {
  const parts = [blur > 0 ? `blur(${blur}px)` : "", grayscale ? "grayscale(1)" : ""].filter(Boolean);
  return parts.length ? parts.join(" ") : undefined;
}

/** Background image behind the start page. Mount with key={url} so the fade-in restarts per image. */
export default function WallpaperLayer({ url, dim, blur, grayscale, contained = false }: Props) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div aria-hidden="true" className={cn("pointer-events-none inset-0 overflow-hidden", contained ? "absolute -z-10" : "fixed z-0")}>
      <img
        src={url}
        alt=""
        decoding="async"
        onLoad={() => setLoaded(true)}
        className={cn("h-full w-full object-cover transition-opacity duration-700", loaded ? "opacity-100" : "opacity-0")}
        style={{
          filter: wallpaperFilter(blur, grayscale),
          // Slight zoom hides the soft edges produced by the blur.
          transform: blur > 0 ? `scale(${1 + blur / 200})` : undefined,
        }}
      />
      <div className="absolute inset-0 bg-[var(--bg)] transition-opacity duration-300" style={{ opacity: dim / 100 }} />
    </div>
  );
}
