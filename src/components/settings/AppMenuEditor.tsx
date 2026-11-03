import { Check, Pencil, Plus, RotateCcw, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import AppIcon from "../AppIcon";
import MenuOrderGrid from "./MenuOrderGrid";
import MenuPreview from "../MenuPreview";
import { Segmented, SliderRow, ToggleRow } from "../ui";
import { APP_INDEX, GOOGLE_APPS, MICROSOFT_APPS, appName, menuItems, normalizeToolUrl, starterPicks, toolHost, toolId, type AppDef } from "../../lib/apps";
import { useI18n } from "../../lib/i18n";
import { DEFAULT_APP_MENU, MENU_COLUMNS, MENU_ICON_SIZE, MENU_SHAPES, TOOL_COLORS, type AppMenuSettings, type CustomTool, type MenuIconStyle, type MenuMode, type MenuShape } from "../../lib/settings";
import { uid } from "../../lib/widgets";
import { cn } from "../../utils/cn";

type Props = {
  menu: AppMenuSettings;
  onChange: (patch: Partial<AppMenuSettings>) => void;
  /** Tighter layout for the drawer. */
  dense?: boolean;
};

type Draft = { id?: string; title: string; url: string; color: string; favicon: boolean };

const SHAPE_NAMES: Record<MenuShape, [string, string]> = {
  squircle: ["Squircle", "Скруглённый"],
  circle: ["Circle", "Круг"],
  rounded: ["Soft", "Мягкий"],
  square: ["Square", "Квадрат"],
  cookie: ["Cookie", "Печенье"],
  flower: ["Flower", "Цветок"],
  clover: ["Clover", "Клевер"],
  sunny: ["Sunny", "Солнце"],
};

const MAX_TOOLS = 40;
const LABEL = "px-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]";

function PickTile({ id, name, app, tool, on, size, iconStyle, shape, onToggle }: { id: string; name: string; app?: AppDef; tool?: CustomTool; on: boolean; size: number; iconStyle: MenuIconStyle; shape: MenuShape; onToggle: (id: string) => void }) {
  return (
    <button type="button" onClick={() => onToggle(id)} aria-pressed={on} title={name} className={cn("ap-pick", on && "is-on")}>
      <span className="ap-pick-ico">
        <AppIcon app={app} tool={tool} size={size} iconStyle={iconStyle} shape={shape} />
        {on && (
          <span className="ap-check">
            <Check size={11} strokeWidth={3.5} aria-hidden="true" />
          </span>
        )}
      </span>
      <span className="ap-pick-name">{name}</span>
    </button>
  );
}

function Group({ title, count, onAll, onNone, allLabel, noneLabel, children }: { title: string; count?: [number, number]; onAll?: () => void; onNone?: () => void; allLabel?: string; noneLabel?: string; children: ReactNode }) {
  return (
    <section className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <div className={LABEL}>
          {title}
          {count && (
            <span className="ms-1.5 tabular-nums opacity-70">
              {count[0]}/{count[1]}
            </span>
          )}
        </div>
        {onAll && onNone && (
          <div className="flex gap-1">
            <button type="button" onClick={onAll} className="ap-chip">
              {allLabel}
            </button>
            <button type="button" onClick={onNone} className="ap-chip">
              {noneLabel}
            </button>
          </div>
        )}
      </div>
      {children}
    </section>
  );
}

export default function AppMenuEditor({ menu, onChange, dense = false }: Props) {
  const { lang } = useI18n();
  const ru = lang.startsWith("ru");
  const L = (en: string, rus: string) => (ru ? rus : en);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState("");

  const picked = useMemo(() => new Set(menu.picks), [menu.picks]);
  const q = query.trim().toLowerCase();
  const matches = (name: string, other?: string) => !q || name.toLowerCase().includes(q) || (other ?? "").toLowerCase().includes(q);

  /* ---------- mode ---------- */

  const sample = (...ids: string[]) => ids.map((id) => APP_INDEX.get(id)).filter((app): app is AppDef => Boolean(app));
  const modes: { id: MenuMode; title: string; desc: string; apps: AppDef[] }[] = [
    { id: "google", title: "Google", desc: L("Gmail, Drive, Docs, Photos and more", "Почта, Диск, Документы, Фото и другое"), apps: sample("g.gmail", "g.drive", "g.calendar") },
    { id: "microsoft", title: "Microsoft", desc: L("Outlook, Word, Teams, OneDrive and more", "Outlook, Word, Teams, OneDrive и другое"), apps: sample("m.outlook", "m.word", "m.teams") },
    { id: "both", title: L("Google + Microsoft", "Google + Microsoft"), desc: L("Both lists — switch with a button at the top", "Оба списка — переключайте кнопкой сверху"), apps: sample("g.gmail", "m.outlook", "g.drive", "m.onedrive") },
    { id: "custom", title: L("Create your own", "Свой набор"), desc: L("Pick any apps and add your own tools", "Любые приложения и ваши собственные"), apps: [] },
  ];

  const setMode = (mode: MenuMode, copyCurrent = false) => {
    const patch: Partial<AppMenuSettings> = { mode };
    if (mode === "custom") {
      // "Customize this list" keeps everything that is shown now; the card starts from a friendly short list.
      if (copyCurrent && menu.mode !== "custom") patch.picks = menuItems(menu, lang).map((item) => item.id);
      else if (menu.picks.length === 0 && menu.tools.length === 0) patch.picks = starterPicks(menu.mode, menu.tab);
    }
    onChange(patch);
  };

  /* ---------- picks ---------- */

  const toggle = (id: string) => onChange({ picks: picked.has(id) ? menu.picks.filter((p) => p !== id) : [...menu.picks, id] });
  const removePick = (id: string) => onChange({ picks: menu.picks.filter((p) => p !== id) });
  const reorder = (ids: string[]) => onChange({ picks: ids });
  const selectAll = (apps: AppDef[]) => onChange({ picks: [...menu.picks, ...apps.map((a) => a.id).filter((id) => !picked.has(id))] });
  const clearAll = (apps: AppDef[]) => {
    const ids = new Set(apps.map((a) => a.id));
    onChange({ picks: menu.picks.filter((id) => !ids.has(id)) });
  };

  /* ---------- own tools ---------- */

  const openForm = (tool?: CustomTool) => {
    setError("");
    setDraft(tool ? { id: tool.id, title: tool.title, url: tool.url, color: tool.color, favicon: tool.favicon } : { title: "", url: "", color: TOOL_COLORS[menu.tools.length % TOOL_COLORS.length], favicon: true });
  };

  const save = () => {
    if (!draft) return;
    const url = normalizeToolUrl(draft.url);
    const host = toolHost(url);
    if (!host || !host.includes(".")) {
      setError(L("Enter a valid web address, e.g. notion.so", "Введите корректный адрес, например notion.so"));
      return;
    }
    const tool: CustomTool = { id: draft.id ?? uid(), title: (draft.title.trim() || host).slice(0, 40), url, color: draft.color, favicon: draft.favicon };
    if (draft.id) onChange({ tools: menu.tools.map((item) => (item.id === draft.id ? tool : item)) });
    else onChange({ tools: [...menu.tools, tool], picks: [...menu.picks, toolId(tool)] });
    setDraft(null);
    setError("");
  };

  const removeTool = (tool: CustomTool) => {
    onChange({ tools: menu.tools.filter((item) => item.id !== tool.id), picks: menu.picks.filter((id) => id !== toolId(tool)) });
    if (draft?.id === tool.id) setDraft(null);
  };

  const iconSize = dense ? 36 : 42;
  const currentItems = useMemo(() => menuItems(menu, lang), [menu, lang]);
  const previewItems = currentItems;
  const grid = dense ? "grid-cols-4" : "grid-cols-4 sm:grid-cols-6";

  const googleApps = GOOGLE_APPS.filter((a) => matches(a.name, a.ru));
  const microsoftApps = MICROSOFT_APPS.filter((a) => matches(a.name, a.ru));
  const tools = menu.tools.filter((tool) => matches(tool.title, toolHost(tool.url)));
  const nothing = q && googleApps.length + microsoftApps.length + tools.length === 0;

  const swatchTool: CustomTool | null = draft ? { id: "preview", title: draft.title || toolHost(normalizeToolUrl(draft.url)) || "?", url: normalizeToolUrl(draft.url), color: draft.color, favicon: draft.favicon } : null;

  return (
    <div className={dense ? "space-y-4" : "space-y-6"}>
      {/* What the menu shows */}
      <section className="space-y-1.5">
        <div className={LABEL}>{L("What to show", "Что показывать")}</div>
        <div className="grid grid-cols-2 gap-2">
          {modes.map(({ id, title, desc, apps }) => {
            const active = menu.mode === id;
            return (
              <button key={id} type="button" onClick={() => setMode(id)} aria-pressed={active} className={cn("ap-mode", active && "is-active")}>
                <span className="ap-mode-samples" aria-hidden="true">
                  {apps.length ? (
                    apps.map((app) => <AppIcon key={app.id} app={app} size={24} iconStyle={menu.iconStyle} shape={menu.shape} />)
                  ) : (
                    <span className="ap-ico" style={{ width: 24, height: 24, background: "var(--primary)", color: "var(--on-primary)" }}>
                      <Plus size={14} strokeWidth={2.6} />
                    </span>
                  )}
                </span>
                <span className="ap-mode-title">
                  {title}
                  {active && <Check size={13} strokeWidth={3} aria-hidden="true" />}
                </span>
                <span className="ap-mode-desc">{desc}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Looks */}
      <section className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className={LABEL}>{L("Appearance", "Внешний вид")}</div>
          <button type="button" className="ap-chip" onClick={() => onChange({ iconStyle: DEFAULT_APP_MENU.iconStyle, shape: DEFAULT_APP_MENU.shape, iconSize: DEFAULT_APP_MENU.iconSize, columns: DEFAULT_APP_MENU.columns, showLabels: DEFAULT_APP_MENU.showLabels })}>
            <RotateCcw size={11} className="me-1 inline" aria-hidden="true" />
            {L("Reset", "Сбросить")}
          </button>
        </div>

        {dense && <MenuPreview menu={menu} items={previewItems} rows={1} className="ap-preview-strip" />}

        <Segmented<MenuIconStyle>
          label={L("Icon style", "Стиль иконок")}
          value={menu.iconStyle}
          onChange={(iconStyle) => onChange({ iconStyle })}
          options={[
            { value: "themed", label: L("Themed", "Под тему") },
            { value: "tile", label: L("Color tile", "Цветные") },
            { value: "original", label: L("Original", "Оригинал") },
          ]}
        />

        {menu.iconStyle === "themed" && (
          <p className="px-1 text-[11px] leading-4 text-[var(--muted)]">
            {L("The logo uses your Material palette, not a grey filter. Monochrome themes stay black and white.", "Логотип окрашивается палитрой Material, без серого фильтра. В монохромной теме он остаётся чёрно-белым.")}
          </p>
        )}

        <div className="space-y-1.5">
          <div className="px-1 text-xs font-medium text-[var(--muted)]">
            {L("Shape", "Форма")}
            {menu.iconStyle === "original" && <span className="ms-1.5 opacity-80">· {L("not used by Original icons", "не для стиля «Оригинал»")}</span>}
          </div>
          <div role="radiogroup" aria-label={L("Icon shape", "Форма иконок")} className={cn("ap-shapes", menu.iconStyle === "original" && "is-disabled")}>
            {MENU_SHAPES.map((shape) => {
              const active = menu.shape === shape;
              return (
                <button key={shape} type="button" role="radio" aria-checked={active} disabled={menu.iconStyle === "original"} onClick={() => onChange({ shape })} className={cn("ap-shape-btn", active && "is-on")} title={SHAPE_NAMES[shape][ru ? 1 : 0]}>
                  <AppIcon app={APP_INDEX.get("g.gmail")} size={32} iconStyle={menu.iconStyle === "original" ? "themed" : menu.iconStyle} shape={shape} />
                  <span>{SHAPE_NAMES[shape][ru ? 1 : 0]}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="overflow-hidden rounded-[18px] bg-[var(--surface)]">
          <div className="divide-y divide-[var(--line)]">
            <SliderRow label={L("Icon size", "Размер иконок")} value={menu.iconSize} min={MENU_ICON_SIZE.min} max={MENU_ICON_SIZE.max} step={2} unit=" px" onChange={(iconSize) => onChange({ iconSize })} />
            <div className="flex items-center justify-between gap-3 px-4 py-2.5">
              <span className="text-sm font-medium">{L("Columns", "Колонки")}</span>
              <Segmented<string>
                label={L("Columns", "Колонки")}
                value={String(menu.columns)}
                onChange={(value) => onChange({ columns: Number(value) })}
                options={MENU_COLUMNS.map((value) => ({ value: String(value), label: String(value) }))}
              />
            </div>
            <ToggleRow title={L("Show names", "Показывать названия")} checked={menu.showLabels} onChange={(showLabels) => onChange({ showLabels })} />
            <ToggleRow
              title={L("Open apps in a new tab", "Открывать в новой вкладке")}
              description={L("Keeps your start page open", "Стартовая страница останется открытой")}
              checked={menu.newTab}
              onChange={(newTab) => onChange({ newTab })}
            />
          </div>
        </div>
      </section>

      {menu.mode !== "custom" && (
        <button type="button" onClick={() => setMode("custom", true)} className="ap-hint">
          <span className="ap-hint-ico">
            <Plus size={16} strokeWidth={2.6} aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1 text-start">
            <span className="block text-sm font-semibold">{L("Reorder, add or remove apps", "Порядок, добавление и удаление приложений")}</span>
            <span className="block text-xs text-[var(--muted)]">{L("Make this list your own — it keeps everything shown now", "Сделайте этот список своим — всё, что показано сейчас, сохранится")}</span>
          </span>
        </button>
      )}

      {menu.mode === "custom" && (
        <div className="space-y-4">
          <Group title={L("Your menu", "Ваше меню")} count={[currentItems.length, currentItems.length]}>
            {currentItems.length ? (
              <MenuOrderGrid items={currentItems} columns={menu.columns} iconSize={menu.iconSize} iconStyle={menu.iconStyle} shape={menu.shape} onReorder={reorder} onRemove={removePick} />
            ) : (
              <p className="rounded-2xl bg-[var(--surface-container-high)] px-4 py-5 text-center text-sm text-[var(--muted)]">{L("Nothing here yet — tap apps below to add them.", "Пока пусто — выберите приложения ниже.")}</p>
            )}
          </Group>

          <div className="relative">
            <Search size={15} className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)]" aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={L("Search apps…", "Найти приложение…")}
              className="h-10 w-full rounded-full bg-[var(--surface-container-high)] ps-9 pe-4 text-sm outline-none transition placeholder:text-[var(--muted)] focus:bg-[var(--surface-container-highest)]"
            />
          </div>

          {/* Own tools first: it's what people come here for */}
          <Group title={L("Your tools", "Ваши инструменты")}>
            {draft && swatchTool && (
              <div className="ap-form">
                <div className="flex items-center gap-3">
                  <AppIcon tool={swatchTool} size={44} />
                  <div className="min-w-0 flex-1 space-y-2">
                    <input
                      value={draft.title}
                      maxLength={40}
                      onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                      placeholder={L("Name (e.g. Notion)", "Название (например, Notion)")}
                      aria-label={L("Tool name", "Название")}
                      className="ap-input"
                    />
                    <input
                      value={draft.url}
                      inputMode="url"
                      autoCapitalize="off"
                      autoCorrect="off"
                      spellCheck={false}
                      onChange={(e) => {
                        setDraft({ ...draft, url: e.target.value });
                        setError("");
                      }}
                      onKeyDown={(e) => e.key === "Enter" && save()}
                      placeholder={L("Web address (notion.so)", "Адрес сайта (notion.so)")}
                      aria-label={L("Web address", "Адрес сайта")}
                      aria-invalid={Boolean(error)}
                      className={cn("ap-input", error && "ring-2 ring-[var(--primary)]")}
                    />
                  </div>
                </div>
                {error && (
                  <p role="alert" className="px-1 text-xs font-medium text-[var(--primary)]">
                    {error}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-1.5" role="radiogroup" aria-label={L("Color", "Цвет")}>
                  {TOOL_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      role="radio"
                      aria-checked={draft.color === color}
                      aria-label={color}
                      onClick={() => setDraft({ ...draft, color })}
                      className={cn("ap-dot", draft.color === color && "is-on")}
                      style={{ background: color }}
                    />
                  ))}
                  <label className="ms-auto flex cursor-pointer items-center gap-2 rounded-full bg-[var(--surface-container-high)] px-3 py-1.5 text-xs font-medium">
                    <input type="checkbox" checked={draft.favicon} onChange={(e) => setDraft({ ...draft, favicon: e.target.checked })} className="accent-[var(--primary)]" />
                    {L("Use site icon", "Иконка сайта")}
                  </label>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={save} className="ap-btn-primary">
                    <Check size={15} strokeWidth={2.8} aria-hidden="true" />
                    {draft.id ? L("Save", "Сохранить") : L("Add to menu", "Добавить в меню")}
                  </button>
                  <button type="button" onClick={() => setDraft(null)} className="ap-btn-tonal">
                    {L("Cancel", "Отмена")}
                  </button>
                </div>
              </div>
            )}

            {!draft && (
              <button type="button" onClick={() => openForm()} disabled={menu.tools.length >= MAX_TOOLS} className="ap-add-tool">
                <span className="ap-add-ico">
                  <Plus size={16} strokeWidth={2.6} aria-hidden="true" />
                </span>
                {L("Add your own tool", "Добавить свой инструмент")}
              </button>
            )}

            {tools.length > 0 && (
              <div className={cn("grid gap-1", grid)}>
                {tools.map((tool) => (
                  <div key={tool.id} className="ap-tool">
                    <PickTile id={toolId(tool)} name={tool.title} tool={tool} on={picked.has(toolId(tool))} size={iconSize} iconStyle={menu.iconStyle} shape={menu.shape} onToggle={toggle} />
                    <div className="ap-tool-actions">
                      <button type="button" onClick={() => openForm(tool)} title={L("Edit", "Изменить")} aria-label={`${L("Edit", "Изменить")}: ${tool.title}`}>
                        <Pencil size={11} aria-hidden="true" />
                      </button>
                      <button type="button" onClick={() => removeTool(tool)} title={L("Delete", "Удалить")} aria-label={`${L("Delete", "Удалить")}: ${tool.title}`}>
                        <Trash2 size={11} aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Group>

          {googleApps.length > 0 && (
            <Group title="Google" count={[GOOGLE_APPS.filter((a) => picked.has(a.id)).length, GOOGLE_APPS.length]} onAll={() => selectAll(GOOGLE_APPS)} onNone={() => clearAll(GOOGLE_APPS)} allLabel={L("All", "Все")} noneLabel={L("None", "Сбросить")}>
              <div className={cn("grid gap-1", grid)}>
                {googleApps.map((app) => (
                  <PickTile key={app.id} id={app.id} name={appName(app, lang)} app={app} on={picked.has(app.id)} size={iconSize} iconStyle={menu.iconStyle} shape={menu.shape} onToggle={toggle} />
                ))}
              </div>
            </Group>
          )}

          {microsoftApps.length > 0 && (
            <Group title="Microsoft" count={[MICROSOFT_APPS.filter((a) => picked.has(a.id)).length, MICROSOFT_APPS.length]} onAll={() => selectAll(MICROSOFT_APPS)} onNone={() => clearAll(MICROSOFT_APPS)} allLabel={L("All", "Все")} noneLabel={L("None", "Сбросить")}>
              <div className={cn("grid gap-1", grid)}>
                {microsoftApps.map((app) => (
                  <PickTile key={app.id} id={app.id} name={appName(app, lang)} app={app} on={picked.has(app.id)} size={iconSize} iconStyle={menu.iconStyle} shape={menu.shape} onToggle={toggle} />
                ))}
              </div>
            </Group>
          )}

          {nothing && <p className="rounded-2xl bg-[var(--surface-container-high)] px-4 py-6 text-center text-sm text-[var(--muted)]">{L("Nothing found", "Ничего не найдено")}</p>}

          <p className="px-1 text-[11px] leading-4 text-[var(--muted)]">
            {L("Tap an app to add or remove it. New apps go to the end of your menu.", "Нажмите на приложение, чтобы добавить или убрать его. Новые приложения идут в конец меню.")}
          </p>
        </div>
      )}
    </div>
  );
}

