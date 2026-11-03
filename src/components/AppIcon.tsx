import { useState } from "react";
import { APP_ICON_ASSETS, THEMED_ICON_SVGS } from "../lib/app-icon-assets";
import { GLYPHS } from "../lib/app-glyphs";
import { toolHost, type AppDef } from "../lib/apps";
import type { CustomTool, MenuIconStyle, MenuShape } from "../lib/settings";
import { shapeClass } from "./AppShapes";
import { ThemedAppArtwork, ThemedToolArtwork } from "./ThemedAppArtwork";
import { cn } from "../utils/cn";

type Props = {
  app?: AppDef;
  tool?: CustomTool;
  size?: number;
  iconStyle?: MenuIconStyle;
  shape?: MenuShape;
  className?: string;
};

/** The universal nine-dot launcher mark. */
export function AppsGlyph({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      {[5, 12, 19].flatMap((y) => [5, 12, 19].map((x) => <circle key={`${x}${y}`} cx={x} cy={y} r={2} />))}
    </svg>
  );
}

/** Safety net for an app without bundled artwork: brand glyph, symbol or initial. */
function Fallback({ app, size }: { app: AppDef; size: number }) {
  const glyph = app.glyph ? GLYPHS[app.glyph] : undefined;
  if (glyph) {
    return (
      <svg viewBox="0 0 24 24" width={size * 0.58} height={size * 0.58} fill="currentColor" aria-hidden="true">
        <path d={glyph.d} />
      </svg>
    );
  }
  const Icon = app.icon;
  if (Icon) return <Icon size={size * 0.54} strokeWidth={2} aria-hidden="true" />;
  return (
    <span className="ap-letter" style={{ fontSize: size * 0.48 }}>
      {(app.letter ?? app.name.slice(0, 1)).toUpperCase()}
    </span>
  );
}

function ToolIcon({ tool, size, iconStyle, shape, className }: { tool: CustomTool; size: number; iconStyle: MenuIconStyle; shape: MenuShape; className?: string }) {
  const host = toolHost(tool.url);
  const [failed, setFailed] = useState(!tool.favicon);
  const letter = (Array.from(tool.title.trim())[0] ?? "?").toUpperCase();
  const showImage = !failed && tool.favicon && Boolean(host);
  // A bare site icon needs no container; a letter always sits on a coloured tile.
  const bare = iconStyle === "original" && showImage;
  const styleClass = bare ? "ap-ico--original" : iconStyle === "themed" ? "ap-ico--themed" : iconStyle === "tile" ? "ap-ico--tile" : "ap-ico--letter";
  const source = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=128`;

  return (
    <span
      className={cn("ap-ico", styleClass, !bare && shapeClass(shape), className)}
      style={{ width: size, height: size, fontSize: size * 0.46, ...(styleClass === "ap-ico--letter" ? { background: tool.color, color: "#fff" } : null) }}
    >
      {!showImage && <span className="ap-letter">{letter}</span>}
      {showImage && iconStyle === "themed" ? (
        <ThemedToolArtwork url={source} letter={letter} />
      ) : showImage ? (
        <img
          src={source}
          alt=""
          draggable={false}
          onLoad={(event) => {
            if (event.currentTarget.naturalWidth < 32) setFailed(true);
          }}
          onError={() => setFailed(true)}
          className="ap-product-art ap-product-art--favicon"
        />
      ) : null}
    </span>
  );
}

/**
 * Real product artwork, bundled locally.
 * - Themed: pigment-free SVG layers filled directly with Material palette roles.
 * - Tile: the logo in its own colours on a tonal tile.
 * - Original: the logo in its own colours, no container (so the shape setting doesn't apply).
 */
export default function AppIcon({ app, tool, size = 40, iconStyle = "themed", shape = "squircle", className }: Props) {
  if (tool) return <ToolIcon key={`${tool.url}|${tool.favicon}`} tool={tool} size={size} iconStyle={iconStyle} shape={shape} className={className} />;
  if (!app) return null;

  const art = APP_ICON_ASSETS[app.id.replace(".", "_")];
  const hasThemedArt = Boolean(THEMED_ICON_SVGS[app.id.replace(".", "_")]);
  const styleClass = iconStyle === "themed" ? "ap-ico--themed" : iconStyle === "tile" ? "ap-ico--tile" : "ap-ico--original";

  return (
    <span
      className={cn("ap-ico", styleClass, iconStyle !== "original" && shapeClass(shape), className)}
      data-mono={app.mono ? "" : undefined}
      style={{ width: size, height: size }}
    >
      {iconStyle === "themed" ? (
        hasThemedArt ? <ThemedAppArtwork appId={app.id} /> : <Fallback app={app} size={size} />
      ) : art ? <img src={art} alt="" draggable={false} className="ap-product-art" /> : <Fallback app={app} size={size} />}
    </span>
  );
}
