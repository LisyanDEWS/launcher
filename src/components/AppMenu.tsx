import { ArrowLeft, Plus, SlidersHorizontal } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent } from "react";
import AppIcon, { AppsGlyph } from "./AppIcon";
import AppMenuEditor from "./settings/AppMenuEditor";
import { menuItems } from "../lib/apps";
import { useI18n } from "../lib/i18n";
import type { AppMenuSettings } from "../lib/settings";
import { cn } from "../utils/cn";

type Props = {
  menu: AppMenuSettings;
  onChange: (patch: Partial<AppMenuSettings>) => void;
  /** A wallpaper is visible: the panel turns into frosted glass. */
  translucent: boolean;
  /** Surface classes shared with the other round buttons in the corner. */
  buttonClassName: string;
};

/** The 9-dot app menu: a button in the corner and the drawer it opens. */
export default function AppMenu({ menu, onChange, translucent, buttonClassName }: Props) {
  const { t, lang } = useI18n();
  const ru = lang.startsWith("ru");
  const L = (en: string, rus: string) => (ru ? rus : en);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"apps" | "customize">("apps");
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const items = useMemo(() => menuItems(menu, lang), [menu, lang]);

  const close = useCallback((restoreFocus: boolean) => {
    setOpen(false);
    setView("apps");
    if (restoreFocus) button.current?.focus();
  }, []);

  // Esc steps back (customize → apps → closed); a click outside closes.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      if (view === "customize") setView("apps");
      else close(true);
    };
    const onDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (panel.current?.contains(target) || button.current?.contains(target)) return;
      close(false);
    };
    document.addEventListener("keydown", onKey, true);
    document.addEventListener("pointerdown", onDown, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      document.removeEventListener("pointerdown", onDown, true);
    };
  }, [open, view, close]);

  // Keyboard users land on the first app.
  useEffect(() => {
    if (!open || view !== "apps") return;
    const id = requestAnimationFrame(() => panel.current?.querySelector<HTMLElement>(".ap-tile")?.focus({ preventScroll: true }));
    return () => cancelAnimationFrame(id);
  }, [open, view, menu.tab, menu.mode]);

  /** Arrow keys move through the grid like on a phone launcher. */
  const onGridKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const keys = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"];
    if (!keys.includes(event.key)) return;
    const tiles = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(".ap-tile"));
    const index = tiles.indexOf(document.activeElement as HTMLElement);
    if (index < 0 || !tiles.length) return;
    const cols = Math.max(1, tiles.filter((tile) => tile.offsetTop === tiles[0].offsetTop).length);
    const rtl = getComputedStyle(event.currentTarget).direction === "rtl";
    const delta: Record<string, number> = { ArrowLeft: rtl ? 1 : -1, ArrowRight: rtl ? -1 : 1, ArrowUp: -cols, ArrowDown: cols };
    const next = event.key === "Home" ? 0 : event.key === "End" ? tiles.length - 1 : Math.min(tiles.length - 1, Math.max(0, index + delta[event.key]));
    event.preventDefault();
    tiles[next].focus();
    tiles[next].scrollIntoView({ block: "nearest" });
  };

  const title =
    menu.mode === "google" ? L("Google apps", "Приложения Google") : menu.mode === "microsoft" ? L("Microsoft apps", "Приложения Microsoft") : L("My apps", "Мои приложения");

  return (
    <>
      <button
        ref={button}
        type="button"
        onClick={() => (open ? close(false) : setOpen(true))}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="app-drawer"
        title={t("menu.open")}
        aria-label={t("menu.open")}
        className={cn("ap-btn", buttonClassName)}
      >
        <AppsGlyph size={22} />
      </button>

      {open && (
        <div
          ref={panel}
          id="app-drawer"
          role="dialog"
          aria-label={view === "customize" ? L("Customize menu", "Настройка меню") : title}
          className={cn("ap-drawer", translucent && "ap-drawer--glass")}
          style={{ "--ap-cols": menu.columns } as CSSProperties}
        >
          {view === "apps" ? (
            <>
              <header className="ap-head">
                {menu.mode === "both" ? (
                  <div role="tablist" aria-label={L("Provider", "Сервис")} className="ap-tabs">
                    {(["google", "microsoft"] as const).map((id) => (
                      <button key={id} type="button" role="tab" aria-selected={menu.tab === id} onClick={() => onChange({ tab: id })} className={cn("ap-tab", menu.tab === id && "is-active")}>
                        {id === "google" ? "Google" : "Microsoft"}
                      </button>
                    ))}
                  </div>
                ) : (
                  <h2 className="ap-title">{title}</h2>
                )}
              </header>

              <div className="ap-scroll">
                {items.length === 0 ? (
                  <div className="ap-empty">
                    <span className="ap-empty-ico">
                      <Plus size={22} strokeWidth={2.4} aria-hidden="true" />
                    </span>
                    <p>{L("Your menu is empty", "Ваше меню пусто")}</p>
                    <button type="button" onClick={() => setView("customize")} className="ap-btn-primary">
                      {L("Add apps", "Добавить приложения")}
                    </button>
                  </div>
                ) : (
                  <div key={`${menu.mode}|${menu.tab}|${menu.iconStyle}|${menu.shape}`} className={cn("ap-grid", !menu.showLabels && "ap-grid--nolabels")} role="list" onKeyDown={onGridKey}>
                    {items.map((item, index) => (
                      <a
                        key={item.id}
                        role="listitem"
                        href={item.url}
                        target={menu.newTab ? "_blank" : undefined}
                        rel="noopener noreferrer"
                        className="ap-tile"
                        title={menu.showLabels ? undefined : item.name}
                        aria-label={menu.showLabels ? undefined : item.name}
                        style={{ "--i": Math.min(index, 20) } as CSSProperties}
                        draggable={false}
                        onClick={() => close(false)}
                      >
                        <AppIcon app={item.app} tool={item.tool} size={menu.iconSize} iconStyle={menu.iconStyle} shape={menu.shape} />
                        {menu.showLabels && (
                          <span className="ap-name" dir="auto">
                            {item.name}
                          </span>
                        )}
                      </a>
                    ))}
                  </div>
                )}
              </div>

              <footer className="ap-foot-wrap">
                <button type="button" onClick={() => setView("customize")} className="ap-foot">
                  <SlidersHorizontal size={16} aria-hidden="true" />
                  {L("Customize menu", "Настроить меню")}
                </button>
              </footer>
            </>
          ) : (
            <>
              <header className="ap-head">
                <button type="button" onClick={() => setView("apps")} className="ap-back" title={L("Back", "Назад")} aria-label={L("Back", "Назад")}>
                  <ArrowLeft size={18} className="rtl:rotate-180" aria-hidden="true" />
                </button>
                <h2 className="ap-title">{L("Customize menu", "Настройка меню")}</h2>
              </header>
              <div className="ap-scroll ap-scroll--pad">
                <AppMenuEditor menu={menu} onChange={onChange} dense />
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
