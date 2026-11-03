import type { CSSProperties } from "react";
import AppIcon from "./AppIcon";
import { cn } from "../utils/cn";
import type { MenuItem } from "../lib/apps";
import type { AppMenuSettings } from "../lib/settings";

/** A non-interactive sample of the drawer grid, drawn with the current look settings. */
export default function MenuPreview({ menu, items, rows = 2, className }: { menu: AppMenuSettings; items: MenuItem[]; rows?: number; className?: string }) {
  const shown = items.slice(0, menu.columns * rows);
  if (!shown.length) return null;
  return (
    <div className={cn("ap-grid ap-preview-grid", !menu.showLabels && "ap-grid--nolabels", className)} style={{ "--ap-cols": menu.columns } as CSSProperties} aria-hidden="true">
      {shown.map((item) => (
        <div key={`${menu.iconStyle}|${menu.shape}|${item.id}`} className="ap-tile" style={{ pointerEvents: "none" }}>
          <AppIcon app={item.app} tool={item.tool} size={menu.iconSize} iconStyle={menu.iconStyle} shape={menu.shape} />
          {menu.showLabels && <span className="ap-name">{item.name}</span>}
        </div>
      ))}
    </div>
  );
}
