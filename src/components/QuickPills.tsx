import { EyeOff, Link2, Mic, Newspaper, Paperclip, Search, Sparkles, type LucideIcon } from "lucide-react";
import type { CSSProperties } from "react";
import type { QuickPill, QuickPills, SearchStyle } from "../lib/settings";
import { cn } from "../utils/cn";
import { boxVars } from "./SearchBox";

type Props = {
  pills: QuickPills;
  style: SearchStyle;
  lang: "ru" | "en";
  incognitoOn: boolean;
  onIncognito: () => void;
  onAi: () => void;
  onNews: () => void;
  onVoice: () => void;
  onLens: () => void;
  onAttach: () => void;
  onCustom: (url: string) => void;
  onConfigure: () => void;
  hasWallpaper: boolean;
};

const ICONS: Record<QuickPill["kind"], LucideIcon> = {
  incognito: EyeOff,
  ai: Sparkles,
  news: Newspaper,
  voice: Mic,
  lens: Search,
  attach: Paperclip,
  custom: Link2,
};

export const pillLabel = (pill: QuickPill, lang: "ru" | "en") => {
  if (pill.label.trim()) return pill.label.trim();
  const labels: Record<QuickPill["kind"], [string, string]> = {
    incognito: ["Инкогнито", "Incognito"],
    ai: ["ИИ-режим", "AI Mode"],
    news: ["Новости", "News"],
    voice: ["Голос", "Voice"],
    lens: ["Поиск по фото", "Search by image"],
    attach: ["Файл", "Attach"],
    custom: ["Ссылка", "Link"],
  };
  return labels[pill.kind][lang === "ru" ? 0 : 1];
};

/**
 * Pills under the search bar: each one is a half (or a third…) of the bar's width and is drawn
 * with the bar's own CSS variables — same fill, blur, border, shadow and radius — so the bar and
 * its pills read as one element.
 */
export default function QuickPills({ pills, style, lang, incognitoOn, onIncognito, onAi, onNews, onVoice, onLens, onAttach, onCustom, hasWallpaper }: Props) {
  if (!pills.enabled) return null;
  const visible = pills.items.filter((pill) => pill.enabled);
  if (!visible.length) return null;

  // Pills are a shorter copy of the bar (≈ 70 % of its height) and share its corner language.
  const height = Math.max(36, Math.round(style.height * 0.7));
  const radius = Math.min(style.radius, height / 2);
  const vars = {
    ...boxVars({ ...style, height, radius, focusRadius: Math.min(style.focusRadius, height / 2) }, hasWallpaper),
    "--pill-h": `${height}px`,
    "--pill-cols": String(visible.length),
    marginTop: Math.max(8, Math.round(style.height * 0.15)),
    fontSize: `${Math.max(13, Math.min(16, Math.round(style.fontSize * 0.8)))}px`,
  } as CSSProperties;

  const handle = (pill: QuickPill) => {
    switch (pill.kind) {
      case "incognito":
        return onIncognito();
      case "ai":
        return onAi();
      case "news":
        return onNews();
      case "voice":
        return onVoice();
      case "lens":
        return onLens();
      case "attach":
        return onAttach();
      case "custom":
        return onCustom(pill.url ?? "");
    }
  };

  return (
    <div className="quick-pills" style={vars} role="group" aria-label={lang === "ru" ? "Быстрые действия" : "Quick actions"}>
      {visible.map((pill) => {
        const Icon = ICONS[pill.kind];
        const active = pill.kind === "incognito" && incognitoOn;
        return (
          <button
            key={pill.id}
            type="button"
            onClick={() => handle(pill)}
            aria-pressed={pill.kind === "incognito" ? incognitoOn : undefined}
            title={pillLabel(pill, lang)}
            className={cn("quick-pill", `quick-pill--${pill.kind}`, active && "is-on", !pills.showLabels && "quick-pill--icon")}
          >
            {pills.showIcons && (
              <span className="quick-pill-ico">
                <Icon size={17} strokeWidth={2.1} aria-hidden="true" />
              </span>
            )}
            {pills.showLabels && <span className="truncate">{pillLabel(pill, lang)}</span>}
            {active && <span className="quick-pill-dot" aria-hidden="true" />}
          </button>
        );
      })}
    </div>
  );
}
