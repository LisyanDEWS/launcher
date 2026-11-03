import { useEffect, useId, useMemo, useRef, useState } from "react";
import { THEMED_ICON_SVGS } from "../lib/app-icon-assets";
import { loadToolIconMasks, type ToolIconMasks } from "../lib/tool-icon-mask";

/**
 * Inserts pre-built icon markup without touching innerHTML anywhere in the extension
 * (Firefox Add-ons linter flags dynamic innerHTML assignments as unsafe).
 *
 * The markup comes only from files generated at build time by
 * scripts/build-themed-icons.mjs — never from user input. Custom website icons
 * take the mask component below, which draws with React elements only.
 */
function useScopedIconMarkup(appId: string) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const raw = THEMED_ICON_SVGS[appId.replace(".", "_")];
  return useMemo(() => raw?.replaceAll("__AP_ICON_ID__", `ap-${id}-`) ?? "", [raw, id]);
}

/** Mounts sanitized build-time SVG markup through DOMParser, keeping the extension linter clean. */
export function ThemedAppArtwork({ appId }: { appId: string }) {
  const markup = useScopedIconMarkup(appId);
  const host = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const target = host.current;
    if (!target) return;
    target.replaceChildren();
    if (!markup) return;
    const parsed = new DOMParser().parseFromString(markup, "image/svg+xml");
    const parsedRoot = parsed.documentElement;
    if (!parsedRoot || parsed.getElementsByTagName("parsererror").length) return;
    const node = document.importNode(parsedRoot, true);
    node.setAttribute("aria-hidden", "true");
    node.setAttribute("focusable", "false");
    target.append(node);
  }, [markup]);

  return <span ref={host} className="ap-product-art ap-material-art" aria-hidden="true" />;
}

export function ThemedToolArtwork({ url, letter }: { url: string; letter: string }) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const [masks, setMasks] = useState<ToolIconMasks | null>(null);
  useEffect(() => {
    let active = true;
    setMasks(null);
    void loadToolIconMasks(url).then((result) => { if (active) setMasks(result); });
    return () => { active = false; };
  }, [url]);

  if (!masks) return <span className="ap-letter">{letter}</span>;
  return (
    <span className="ap-product-art ap-material-art ap-product-art--favicon" aria-hidden="true">
      <svg viewBox="0 0 96 96" focusable="false">
        <defs>
          <mask id={`tool-${id}-ink`} maskUnits="userSpaceOnUse" x="0" y="0" width="96" height="96" style={{ maskType: "alpha" }}>
            <image href={masks.ink} width="96" height="96" />
          </mask>
          {masks.paper && (
            <mask id={`tool-${id}-paper`} maskUnits="userSpaceOnUse" x="0" y="0" width="96" height="96" style={{ maskType: "alpha" }}>
              <image href={masks.paper} width="96" height="96" />
            </mask>
          )}
        </defs>
        <rect width="96" height="96" fill="var(--ap-logo-ink)" mask={`url(#tool-${id}-ink)`} />
        {masks.paper && <rect width="96" height="96" fill="var(--ap-logo-paper)" mask={`url(#tool-${id}-paper)`} />}
      </svg>
    </span>
  );
}
