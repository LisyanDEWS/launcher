import { Check, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { POPULAR_SITES, type PopularSite } from "../lib/popular-sites";
import { popularIconDataUrl } from "../lib/site-icons";
import SiteIcon from "./SiteIcon";
import { cn } from "../utils/cn";

/** Searchable offline catalogue of the 500 ranked popular sites. Brand marks are bundled where Simple Icons has one. */
export default function PopularSitePicker({
  onPick,
  compact = false,
  selectedHost,
  title,
  initialQuery = "",
}: {
  onPick: (site: PopularSite, iconDataUrl?: string) => void;
  compact?: boolean;
  selectedHost?: string;
  title?: string;
  initialQuery?: string;
}) {
  const [query, setQuery] = useState(initialQuery);
  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase();
    const list = q
      ? POPULAR_SITES.filter((site) => site.host.includes(q) || site.title.toLocaleLowerCase().includes(q) || site.slug.includes(q))
      : POPULAR_SITES;
    return list.slice(0, compact ? 8 : 12);
  }, [query, compact]);

  return (
    <div className="popular-site-picker">
      {!compact && title && <div className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">{title}</div>}
      <label className="flex h-10 items-center gap-2 rounded-full bg-[var(--surface-container-high)] px-3">
        <Search size={15} className="shrink-0 text-[var(--muted)]" aria-hidden="true" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={compact ? "Search 500 popular sites…" : "Search popular websites…"}
          aria-label="Search popular websites"
          className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-[var(--muted)]"
        />
        <span className="shrink-0 text-[10px] tabular-nums text-[var(--muted)]">500</span>
      </label>
      <div className={cn("mt-2 grid gap-1.5", compact ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3")}>
        {filtered.map((site) => {
          const active = selectedHost === site.host;
          return (
            <button
              key={`${site.rank}-${site.host}`}
              type="button"
              onClick={() => onPick(site, popularIconDataUrl(site) || undefined)}
              title={`#${site.rank} · ${site.host}`}
              className={cn(
                "flex min-w-0 items-center gap-2 rounded-[14px] bg-[var(--surface-container)] px-2 py-2 text-start transition-all hover:bg-[var(--surface-container-high)] active:scale-[0.98]",
                active && "ring-1 ring-[var(--primary)] bg-[var(--primary-container)]",
              )}
            >
              <SiteIcon url={`https://${site.host}/`} size={30} style="original" className="rounded-lg bg-[var(--surface-container-high)]" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-semibold">{site.title}</span>
                <span className="block truncate text-[10px] text-[var(--muted)]">{site.host}</span>
              </span>
              {active && <Check size={14} className="shrink-0 text-[var(--primary)]" aria-hidden="true" />}
            </button>
          );
        })}
        {!filtered.length && <p className="col-span-full py-3 text-center text-xs text-[var(--muted)]">No matching sites</p>}
      </div>
    </div>
  );
}
