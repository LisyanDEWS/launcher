import { useEffect, useMemo, useState } from "react";
import { getHost } from "../lib/settings";
import { cacheSiteIcon, getCachedSiteIcon, popularIconDataUrl, popularSiteFor, siteIconUrl } from "../lib/site-icons";
import LoadingIndicator from "./LoadingIndicator";
import { ThemedToolArtwork } from "./ThemedAppArtwork";
import { cn } from "../utils/cn";

type Props = {
  url: string;
  size: number;
  cacheDays?: number;
  style?: "original" | "themed";
  className?: string;
  title?: string;
};

/**
 * A ready Simple Icon for popular sites, otherwise the best cached 256px site favicon.
 * The icon is saved when it first loads and reused for the configured retention period.
 */
export default function SiteIcon({ url, size, cacheDays, style = "original", className, title }: Props) {
  const host = getHost(url);
  const popular = useMemo(() => popularSiteFor(url), [url]);
  const staticData = useMemo(() => popularIconDataUrl(popular), [popular]);
  const [src, setSrc] = useState(staticData);
  const [loaded, setLoaded] = useState(Boolean(staticData));
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    setFailed(false);
    setLoaded(Boolean(staticData));
    if (staticData) {
      setSrc(staticData);
      return () => { alive = false; };
    }
    setSrc("");
    void getCachedSiteIcon(url, cacheDays).then((cached) => {
      if (!alive) return;
      setSrc(cached?.dataUrl || siteIconUrl(url, 256));
      setLoaded(Boolean(cached?.dataUrl));
    });
    return () => { alive = false; };
  }, [url, cacheDays, staticData]);

  const letter = (popular?.title || host || "?").trim().charAt(0).toUpperCase() || "?";
  const box = cn("site-icon relative grid shrink-0 place-items-center overflow-hidden", className);

  if (failed || !src) {
    return <span className={cn(box, "bg-[var(--surface-container-highest)] text-[var(--muted)] text-[0.48em] font-bold")} title={title || host}>{letter}</span>;
  }

  return (
    <span className={box} style={{ width: size, height: size }} title={title || host}>
      {!loaded && (
        <span className="absolute inset-0 z-10 grid place-items-center rounded-[inherit] bg-[var(--surface-container-high)]">
          <LoadingIndicator indicatorSize={Math.max(12, Math.round(size * 0.42))} containerWidth={size} containerHeight={size} />
        </span>
      )}
      {style === "themed" ? (
        <>
          <img
            src={src}
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute h-0 w-0 opacity-0"
            referrerPolicy="no-referrer"
            onLoad={() => {
              setLoaded(true);
              if (!staticData && !src.startsWith("data:")) void cacheSiteIcon(url, src, cacheDays);
            }}
            onError={() => {
              setFailed(true);
              setLoaded(true);
            }}
          />
          {loaded && <ThemedToolArtwork url={src} letter={letter} />}
        </>
      ) : (
        <img
          src={src}
          alt={title || host}
          className="h-[68%] w-[68%] rounded-[18%] object-contain"
          referrerPolicy="no-referrer"
          onLoad={() => {
            setLoaded(true);
            if (!staticData && !src.startsWith("data:")) void cacheSiteIcon(url, src, cacheDays);
          }}
          onError={() => {
            setFailed(true);
            setLoaded(true);
          }}
        />
      )}
    </span>
  );
}
