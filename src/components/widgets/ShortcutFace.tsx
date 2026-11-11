import { getHost, safeWebUrl, type ShortcutWidget } from "../../lib/settings";
import { cn } from "../../utils/cn";
import SiteIcon from "../SiteIcon";

/** The site's favicon through Google's favicon service (128 px, CORS-enabled for the themed painter). */
export const faviconFor = (url: string) => {
  const host = getHost(safeWebUrl(url));
  return host ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=128` : "";
};

/**
 * A single round shortcut, like an app icon on an Android home screen.
 * "themed" paints the favicon in the widget's colour role with the same ink/paper pipeline as the
 * app menu; "original" keeps the site's colours on a neutral disc. Hovering morphs the circle into
 * a squircle (Material expressive shape morph).
 */
export default function ShortcutFace({ widget, interactive = true }: { widget: ShortcutWidget; interactive?: boolean }) {
  const url = safeWebUrl(widget.url);
  const host = getHost(url);
  const favicon = faviconFor(url);
  const letter = (widget.title || host || "?").trim().charAt(0).toUpperCase() || "?";
  const themed = widget.iconStyle === "themed" && !widget.customIcon;

  const icon = widget.customIcon ? (
    <img src={widget.customIcon} alt="" className="sc-img sc-img--full" draggable={false} />
  ) : favicon ? (
    <SiteIcon url={url} size={62} style={themed ? "themed" : "original"} className="sc-site-icon" title={widget.title || host} />
  ) : (
    <span className="sc-letter">{letter}</span>
  );

  const className = cn("sc", themed ? "sc--themed" : "sc--original", widget.customIcon && "sc--custom");
  if (interactive && url) {
    return (
      <a href={url} className={className} title={widget.title || host} draggable={false}>
        {icon}
      </a>
    );
  }
  return (
    <div className={className} title={widget.title || host}>
      {icon}
    </div>
  );
}
