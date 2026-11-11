import {
  ArrowDown,
  ArrowUp,
  Camera,
  Check,
  Cpu,
  Download,
  ExternalLink,
  EyeOff,
  Globe2,
  Info,
  Link2,
  Loader2,
  Mic,
  Newspaper,
  Paperclip,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  Wand2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { downloadChromiumExtension } from "../../lib/extension-download";
import { isLisyanExtension, paletteTint, pushFaviconTheme } from "../../lib/favicon-bridge";
import {
  DEFAULT_QUICK_PILLS,
  NEWS_SOURCES,
  NEWS_TOPICS,
  QUICK_PILL_KINDS,
  type NewsSettings,
  type NewsSource,
  type NewsTopic,
  type QuickPill,
  type QuickPillKind,
} from "../../lib/settings";
import { PUBLISHERS, sourceTitle, clearInterests, hasInterests, defaultTopicSources, TOPIC_COLOR } from "../../lib/news";
import { cn } from "../../utils/cn";
import { BUTTON, BUTTON_PRIMARY, CARD, ChoiceList, FieldRow, INPUT, Notice, Segmented, SettingsGroup, SliderRow, ToggleRow } from "../ui";
import { useSettingsCtx } from "./context";
import FaviconPreview from "./FaviconPreview";
import { useI18n } from "../../lib/i18n";
import { clearExtensionSiteIcons, clearLocalSiteIcons, extensionSiteIconCount, localSiteIconCount } from "../../lib/site-icons";

const PILL_META: Record<QuickPillKind, { ru: string; en: string; icon: typeof EyeOff }> = {
  incognito: { ru: "Инкогнито", en: "Incognito", icon: EyeOff },
  ai: { ru: "ИИ-режим Google", en: "Google AI Mode", icon: Sparkles },
  news: { ru: "Новости", en: "News", icon: Newspaper },
  voice: { ru: "Голосовой ввод", en: "Voice input", icon: Mic },
  lens: { ru: "Поиск по фото", en: "Search by image", icon: Search },
  attach: { ru: "Прикрепить файл", en: "Attach a file", icon: Paperclip },
  custom: { ru: "Своя ссылка", en: "Custom link", icon: Link2 },
};

/* ============================ QUICK PILLS ============================ */

export function QuickPillsSection() {
  const { settings, setSettings } = useSettingsCtx();
  const { lang } = useI18n();
  const ru = lang === "ru";
  const L = (en: string, rus: string) => (ru ? rus : en);
  const pills = settings.quickPills;
  const [adding, setAdding] = useState(false);

  const patch = (next: Partial<typeof pills>) => setSettings((s) => ({ ...s, quickPills: { ...s.quickPills, ...next } }));
  const patchItem = (id: string, next: Partial<QuickPill>) =>
    patch({ items: pills.items.map((item) => (item.id === id ? { ...item, ...next } : item)) });
  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= pills.items.length) return;
    const items = [...pills.items];
    [items[index], items[target]] = [items[target], items[index]];
    patch({ items });
  };
  const add = (kind: QuickPillKind) => {
    if (pills.items.length >= 8) return;
    patch({ enabled: true, items: [...pills.items, { id: `pill-${kind}-${Date.now().toString(36)}`, kind, label: "", enabled: true, url: kind === "custom" ? "https://" : undefined }] });
    setAdding(false);
  };

  return (
    <div className="space-y-8">
      <SettingsGroup title={L("Pills under the search bar", "Пилюли под строкой поиска")} description={L("Two halves of the bar's width, same radius and surface — one element with the search field. Incognito and AI Mode are on by default.", "Две половинки ширины строки, тот же радиус и поверхность — единый элемент со строкой поиска. Инкогнито и ИИ-режим включены по умолчанию.")}>
        <div className={cn(CARD, "divide-y divide-[var(--line)]")}>
          <ToggleRow title={L("Show pills", "Показывать пилюли")} description={L("Appear right under the search bar, never inside it.", "Появляются сразу под строкой поиска, не внутри неё.")} checked={pills.enabled} onChange={(enabled) => patch({ enabled })} />
          <ToggleRow title={L("Labels", "Подписи")} checked={pills.showLabels} onChange={(showLabels) => patch({ showLabels })} />
          <ToggleRow title={L("Icons", "Иконки")} checked={pills.showIcons} onChange={(showIcons) => patch({ showIcons })} />
          <SliderRow label={L("Height", "Высота")} value={pills.height} min={28} max={56} unit="px" onChange={(height) => patch({ height })} />
          <SliderRow label={L("Gap", "Отступ")} value={pills.gap} min={0} max={28} unit="px" onChange={(gap) => patch({ gap })} />
        </div>
      </SettingsGroup>

      <SettingsGroup title={L("Order and actions", "Порядок и действия")} description={L("Up to eight pills. Rename them, reorder them or take them off the start page.", "До восьми пилюль. Переименуйте, поменяйте порядок или уберите с главной.")} action={<button type="button" onClick={() => setAdding((value) => !value)} className={BUTTON}><Plus size={15} aria-hidden="true" />{L("Add", "Добавить")}</button>}>
        {adding && (
          <div className={cn(CARD, "mb-3 flex flex-wrap gap-2 p-3")}>
            {QUICK_PILL_KINDS.map((kind) => {
              const Icon = PILL_META[kind].icon;
              return (
                <button key={kind} type="button" onClick={() => add(kind)} className={BUTTON}>
                  <Icon size={14} aria-hidden="true" />
                  {PILL_META[kind][ru ? "ru" : "en"]}
                </button>
              );
            })}
          </div>
        )}
        <div className={cn(CARD, "divide-y divide-[var(--line)]")}>
          {pills.items.map((pill, index) => {
            const meta = PILL_META[pill.kind];
            const Icon = meta.icon;
            return (
              <div key={pill.id} className="p-3.5">
                <div className="flex items-center gap-2.5">
                  <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-[12px]", pill.kind === "ai" ? "bg-[var(--tertiary-container)] text-[var(--on-tertiary-container)]" : "bg-[var(--surface-container-high)] text-[var(--muted)]")}>
                    <Icon size={16} aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">{meta[ru ? "ru" : "en"]}</div>
                    <div className="text-[11px] text-[var(--muted)]">
                      {pill.kind === "incognito" ? L("Opens a real private window in the extension", "В расширении открывает настоящее окно инкогнито") : pill.kind === "ai" ? L("Opens Google AI Mode with the current query", "Открывает ИИ-режим Google с текущим запросом") : pill.kind === "news" ? L("Jumps to the news feed", "Переходит к новостям") : L("Quick action", "Быстрое действие")}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-0.5">
                    <button type="button" onClick={() => move(index, -1)} disabled={index === 0} className="grid h-7 w-7 place-items-center rounded-full text-[var(--muted)] transition hover:bg-[var(--surface-container-high)] disabled:opacity-25" aria-label={L("Move up", "Выше")}><ArrowUp size={13} aria-hidden="true" /></button>
                    <button type="button" onClick={() => move(index, 1)} disabled={index === pills.items.length - 1} className="grid h-7 w-7 place-items-center rounded-full text-[var(--muted)] transition hover:bg-[var(--surface-container-high)] disabled:opacity-25" aria-label={L("Move down", "Ниже")}><ArrowDown size={13} aria-hidden="true" /></button>
                    <button type="button" onClick={() => patch({ items: pills.items.filter((item) => item.id !== pill.id) })} className="grid h-7 w-7 place-items-center rounded-full text-[var(--muted)] transition hover:bg-[var(--error-container,#ffdad6)] hover:text-[var(--on-error-container,#410002)]" aria-label={L("Remove", "Удалить")}><Trash2 size={13} aria-hidden="true" /></button>
                  </div>
                </div>
                <div className="mt-2.5 grid gap-2 ps-11 sm:grid-cols-[1fr_auto]">
                  <input
                    value={pill.label}
                    onChange={(event) => patchItem(pill.id, { label: event.target.value.slice(0, 32) })}
                    placeholder={meta[ru ? "ru" : "en"]}
                    aria-label={L("Pill label", "Подпись пилюли")}
                    className={cn(INPUT, "h-9 rounded-xl text-xs")}
                  />
                  <button type="button" role="switch" aria-checked={pill.enabled} onClick={() => patchItem(pill.id, { enabled: !pill.enabled })} className={cn("h-9 rounded-xl px-3 text-xs font-medium transition", pill.enabled ? "bg-[var(--primary-container)] text-[var(--on-primary-container)]" : "bg-[var(--surface-container-high)] text-[var(--muted)]")}>
                    {pill.enabled ? L("Shown", "Показана") : L("Hidden", "Скрыта")}
                  </button>
                  {pill.kind === "custom" && (
                    <input value={pill.url ?? ""} onChange={(event) => patchItem(pill.id, { url: event.target.value })} placeholder="https://" aria-label="URL" className={cn(INPUT, "h-9 rounded-xl text-xs sm:col-span-2")} />
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <button type="button" onClick={() => setSettings((s) => ({ ...s, quickPills: DEFAULT_QUICK_PILLS }))} className="mt-3 inline-flex items-center gap-2 text-xs text-[var(--muted)] transition hover:text-[var(--fg)]"><RefreshCw size={12} aria-hidden="true" />{L("Reset to Incognito + AI Mode", "Сбросить на Инкогнито + ИИ-режим")}</button>
      </SettingsGroup>

      <Notice icon={Info}>{L("The incognito pill arms private search: the next search opens in a real incognito window (allow the extension in incognito to use it). The AI pill opens Google AI Mode — with your query if the field is not empty.", "Пилюля инкогнито включает приватный поиск: следующий запрос откроется в настоящем окне инкогнито (разрешите расширению работу в инкогнито). Пилюля ИИ открывает ИИ-режим Google — с вашим запросом, если поле не пустое.")}</Notice>
    </div>
  );
}

/* ============================ NEWS ============================ */

export function NewsSection() {
  const { settings, setSettings, toast } = useSettingsCtx();
  const { lang } = useI18n();
  const ru = lang === "ru";
  const L = (en: string, rus: string) => (ru ? rus : en);
  const news = settings.news;
  const patch = (next: Partial<NewsSettings>) => setSettings((s) => ({ ...s, news: { ...s.news, ...next } }));
  const toggleTopic = (topic: NewsTopic) => {
    const has = news.topics.includes(topic);
    const next: NewsTopic[] = has ? news.topics.filter((item) => item !== topic) : [...news.topics, topic];
    patch({ topics: (next.length ? next : (["top"] as NewsTopic[])).slice(0, 6) });
  };

  return (
    <div className="space-y-8">
      <SettingsGroup title={L("News at the bottom of the start page", "Новости внизу стартовой страницы")} description={L("A calm Material Expressive digest. Choose the source, the volume and the topics.", "Спокойный дайджест в стиле Material Expressive. Выберите источник, объём и темы.")}>
        <div className={cn(CARD, "divide-y divide-[var(--line)]")}>
          <ToggleRow title={L("Show the news feed", "Показывать новостную ленту")} description={L("A separate band at the very bottom, below the whole widget area — it never overlaps anything.", "Отдельная полоса в самом низу, под всей зоной виджетов — ничего не перекрывает.")} checked={news.enabled} onChange={(enabled) => patch({ enabled })} />
          <FieldRow label={L("Source", "Источник")} hint={L("Google News works through a public feed proxy; Hacker News is fetched directly. Article photos are pulled from each story page and cached.", "Google News работает через публичный прокси ленты, Hacker News — напрямую. Фото статей подтягиваются со страниц материалов и кешируются.")}>
            <ChoiceList
              label={L("News source", "Источник новостей")}
              value={news.source}
              onChange={(source) => patch({ source })}
              options={NEWS_SOURCES.map((source) => ({
                value: source as NewsSource,
                label: sourceTitle(source, ru ? "ru" : "en"),
                description:
                  source === "mix"
                    ? L("Google News + BBC, Guardian, NYT, Verge, WIRED, TechCrunch, Ars, Nature, ESPN, Hacker News — interleaved", "Google News + BBC, Guardian, NYT, Verge, WIRED, TechCrunch, Ars, Nature, ESPN, Hacker News — вперемешку")
                    : source === "google"
                      ? L("Broad coverage in your region, several RSS mirrors", "Широкая повестка в вашем регионе, несколько RSS-зеркал")
                      : source === "hackernews"
                        ? L("Technology and making, direct API", "Технологии и разработка, прямой API")
                        : (PUBLISHERS.find((p) => p.id === source)?.topics ?? []).map((t) => ({ top: L("Top", "Главное"), tech: L("Technology", "Технологии"), ai: L("AI", "ИИ"), science: L("Science", "Наука"), business: L("Business", "Бизнес"), world: L("World", "В мире"), culture: L("Culture", "Культура"), sport: L("Sport", "Спорт") } as Record<NewsTopic, string>)[t]).join(" · "),
                icon: source === "mix" ? Sparkles : source === "hackernews" ? Cpu : Globe2,
              }))}
            />
          </FieldRow>
          <FieldRow label={L("Topics", "Темы")} hint={L("Pick up to six. Clicking the chips under the feed also filters it on the fly.", "Выберите до шести. Чипы под лентой тоже фильтруют её на лету.")}>
            <div className="flex flex-wrap gap-1.5">
              {NEWS_TOPICS.map((topic) => {
                const active = news.topics.includes(topic);
                const label = ({ top: L("Top", "Главное"), tech: L("Technology", "Технологии"), ai: L("AI", "ИИ"), science: L("Science", "Наука"), business: L("Business", "Бизнес"), world: L("World", "В мире"), culture: L("Culture", "Культура"), sport: L("Sport", "Спорт") } as Record<NewsTopic, string>)[topic];
                return (
                  <button key={topic} type="button" aria-pressed={active} onClick={() => toggleTopic(topic)} className={cn("inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs transition-all", active ? "bg-[var(--primary)] font-medium text-[var(--on-primary)]" : "bg-[var(--surface-container-high)] text-[var(--muted)] hover:text-[var(--fg)]")}>
                    {active && <Check size={11} aria-hidden="true" />}
                    {label}
                  </button>
                );
              })}
            </div>
          </FieldRow>
          <FieldRow label={L("Sources per topic", "Источники по темам")} hint={L("In “All sources” mode, choose which publishers feed each topic. Empty means the curated default.", "В режиме «Все источники» выберите, какие издания питают каждую тему. Пусто — курируемый список по умолчанию.")}>
            <div className="space-y-3">
              {news.topics.map((topic) => {
                const effective = news.topicSources?.[topic] ?? defaultTopicSources(topic);
                const label = ({ top: L("Top", "Главное"), tech: L("Technology", "Технологии"), ai: L("AI", "ИИ"), science: L("Science", "Наука"), business: L("Business", "Бизнес"), world: L("World", "В мире"), culture: L("Culture", "Культура"), sport: L("Sport", "Спорт") } as Record<NewsTopic, string>)[topic];
                const toggle = (source: NewsSource) => {
                  const has = effective.includes(source);
                  const next = has ? effective.filter((x) => x !== source) : [...effective, source];
                  const defaults = defaultTopicSources(topic);
                  const isDefault = next.length === defaults.length && next.every((x) => defaults.includes(x));
                  const topicSources = { ...(news.topicSources ?? {}) };
                  if (isDefault) delete topicSources[topic];
                  else topicSources[topic] = next;
                  patch({ topicSources });
                };
                return (
                  <div key={topic} className="rounded-2xl bg-[var(--surface-container)] p-3">
                    <div className="mb-2 flex items-center gap-2 text-xs font-semibold">
                      <span className="h-2 w-2 rounded-full" style={{ background: TOPIC_COLOR[topic] }} aria-hidden="true" />
                      {label}
                      {news.topicSources?.[topic] && <span className="rounded-full bg-[var(--primary-container)] px-2 py-0.5 text-[10px] font-medium text-[var(--on-primary-container)]">{L("custom", "своё")}</span>}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {NEWS_SOURCES.filter((source) => source !== "mix").map((source) => {
                        const active = effective.includes(source);
                        return (
                          <button key={source} type="button" aria-pressed={active} onClick={() => toggle(source)} className={cn("inline-flex h-7 items-center rounded-full px-2.5 text-[11px] transition-all", active ? "bg-[var(--primary)] font-medium text-[var(--on-primary)]" : "bg-[var(--surface-container-high)] text-[var(--muted)] hover:text-[var(--fg)]")}>
                            {sourceTitle(source, ru ? "ru" : "en")}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </FieldRow>
          <FieldRow label={L("How much", "Сколько")}>
            <Segmented label={L("Number of stories", "Количество новостей")} value={String(news.count)} onChange={(value) => patch({ count: Number(value) })} options={["2", "4", "6", "8"].map((value) => ({ value, label: value }))} />
          </FieldRow>
          <FieldRow label={L("Layout", "Вид")}>
            <Segmented label={L("News layout", "Вид ленты")} value={news.layout} onChange={(layout) => patch({ layout })} options={[{ value: "cards", label: L("Cards", "Карточки") }, { value: "list", label: L("List", "Список") }]} />
          </FieldRow>
          <FieldRow label={L("Region and language", "Регион и язык")}>
            <Segmented label={L("Region", "Регион")} value={news.region} onChange={(region) => patch({ region })} options={[{ value: "ru", label: "Россия" }, { value: "us", label: "US" }, { value: "global", label: L("Global", "Глобально") }]} />
          </FieldRow>
          <ToggleRow title={L("Cover art", "Обложки")} description={L("Real article photos. Only stories whose photo actually loads stay in the feed.", "Настоящие фото статей. В ленте остаются только те новости, у которых картинка реально загрузилась.")} checked={news.showImages} onChange={(showImages) => patch({ showImages })} />
          <ToggleRow title={L("Show the source", "Показывать источник")} checked={news.showSource} onChange={(showSource) => patch({ showSource })} />
          <ToggleRow title={L("Topic chips", "Чипы тем")} checked={news.showTopicChips} onChange={(showTopicChips) => patch({ showTopicChips })} />
          <ToggleRow title={L("Open links in a new tab", "Открывать в новой вкладке")} checked={news.openInNewTab} onChange={(openInNewTab) => patch({ openInNewTab })} />
        </div>
      </SettingsGroup>
      <SettingsGroup title={L("Photos and recommendations", "Фото и рекомендации")}>
        <div className="space-y-4 p-4">
          <Segmented
            label={L("Photo tone", "Тон фотографий")}
            value={news.imageTone}
            options={[
              { value: "color", label: L("Original", "Оригинал") },
              { value: "duotone", label: L("Duotone", "Дуотон") },
              { value: "mono", label: L("Monochrome", "Монохром") },
            ]}
            onChange={(imageTone) => patch({ imageTone })}
          />
          <p className="text-xs leading-5 text-[var(--muted)]">{L("Duotone and monochrome repaint every article photo in the current palette, so the feed follows the theme like the icons do.", "Дуотон и монохром перекрашивают каждое фото статьи в текущую палитру — лента следует теме так же, как иконки.")}</p>
        </div>
        <ToggleRow
          title={L("Recommend by what I read", "Рекомендовать по тому, что я читаю")}
          description={L("A tiny interest profile (topics, publishers, keywords) is kept in this browser's local storage and ranks the feed. Nothing is sent anywhere.", "Небольшой профиль интересов (темы, издания, слова) хранится локально в браузере и ранжирует ленту. Никуда не отправляется.")}
          checked={news.personalize}
          onChange={(personalize) => patch({ personalize })}
        />
        {hasInterests() && (
          <div className="px-4 pb-4">
            <button type="button" className={BUTTON} onClick={() => { clearInterests(); toast(L("Interests cleared", "Интересы сброшены")); }}>
              <Trash2 size={14} aria-hidden="true" /> {L("Clear interest profile", "Сбросить профиль интересов")}
            </button>
          </div>
        )}
      </SettingsGroup>
      <Notice icon={Newspaper}>{L("The feed is cached for 12 minutes. If a source is unreachable the section says so — nothing is invented.", "Лента кешируется на 12 минут. Если источник недоступен, раздел честно сообщит об этом — ничего не выдумывается.")}</Notice>
    </div>
  );
}

export function FaviconSection() {
  const { settings, setSettings, toast } = useSettingsCtx();
  const { lang } = useI18n();
  const ru = lang === "ru";
  const L = (en: string, rus: string) => (ru ? rus : en);
  const theme = settings.faviconTheme;
  const patch = (next: Partial<typeof theme>) => setSettings((s) => ({ ...s, faviconTheme: { ...s.faviconTheme, ...next } }));
  const connected = isLisyanExtension();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [cacheCount, setCacheCount] = useState(0);

  const refreshCacheCount = async () => {
    const extensionCount = await extensionSiteIconCount();
    setCacheCount(extensionCount ?? await localSiteIconCount(theme.cacheDays));
  };

  useEffect(() => {
    void refreshCacheCount();
    const timer = window.setInterval(() => void refreshCacheCount(), 12_000);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme.cacheDays, connected]);

  const clearCache = async () => {
    await clearExtensionSiteIcons();
    await clearLocalSiteIcons();
    setCacheCount(0);
    toast(L("Saved site icons cleared", "Кеш иконок очищен"));
  };

  const download = async () => {
    setBusy(true);
    setError("");
    try {
      await downloadChromiumExtension(settings);
      toast(L("Extension downloaded — install it from chrome://extensions.", "Расширение скачано — установите его на chrome://extensions."));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  };

  const sync = async () => {
    await pushFaviconTheme(theme);
    toast(
      connected
        ? L("Palette sent to every open tab.", "Палитра отправлена во все открытые вкладки.")
        : L("The palette is saved. Install the extension to repaint Chrome tabs.", "Палитра сохранена. Установите расширение, чтобы перекрашивать вкладки Chrome."),
    );
  };

  return (
    <div className="space-y-8">
      <SettingsGroup title={L("Site icons in every Chrome tab", "Иконки сайтов во всех вкладках Chrome")} description={L("A content script repaints each site's own favicon with the launcher's Material palette — tabs opened from anywhere, not only from LisYan.", "Контент-скрипт перекрашивает родную иконку сайта в Material-палитру лаунчера — во вкладках, открытых откуда угодно, не только из LisYan.")}>
        <div className={cn(CARD, "divide-y divide-[var(--line)]")}>
          <ToggleRow title={L("Repaint automatically", "Перекрашивать автоматически")} description={connected ? L("Connected to the extension. Changes reach open tabs in under a second.", "Подключено к расширению. Изменения доходят до открытых вкладок меньше чем за секунду.") : L("The extension is not connected in this tab. You can still preview and download it here.", "В этой вкладке расширение не подключено. Здесь можно посмотреть и скачать его.")} checked={theme.auto} onChange={(auto) => patch({ auto })} />
          <FieldRow label={L("Style", "Стиль")}>
            <ChoiceList
              label={L("Favicon style", "Стиль иконок")}
              value={theme.mode}
              onChange={(mode) => patch({ mode })}
              options={[
                { value: "themed", label: L("Themed", "Тематические"), description: L("Multi-tone: the logo's colours become the theme's tones on a tonal tile — like the app menu icons.", "Многотонные: цвета логотипа становятся тонами темы на тональной плитке — как иконки меню приложений."), icon: Wand2 },
                { value: "mono", label: L("Monochrome", "Монохром"), description: L("A one-tone silhouette that keeps the cut-out details.", "Одноцветный силуэт с сохранёнными вырезами деталей."), icon: EyeOff },
                { value: "original", label: L("Original", "Оригинал"), description: L("Leaves every site icon untouched.", "Оставляет иконки сайтов без изменений."), icon: Globe2 },
              ]}
            />
          </FieldRow>
          <FieldRow label={L("Palette", "Палитра")} hint={L("“From the theme” follows the seed colour and wallpaper, so favicons and app icons stay in sync.", "«Из темы» следует за цветом-семенем и обоями, поэтому иконки сайтов и приложений совпадают.")}>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => patch({ useThemeColor: true })} className={cn("inline-flex h-9 items-center gap-2 rounded-full px-3 text-xs font-medium transition", theme.useThemeColor ? "bg-[var(--primary)] text-[var(--on-primary)]" : "bg-[var(--surface-container-high)] text-[var(--muted)]")}>
                <span className="h-3 w-3 rounded-full border border-white/30" style={{ background: paletteTint() }} aria-hidden="true" />
                {L("From the theme", "Из темы")}
                {theme.useThemeColor && <Check size={11} aria-hidden="true" />}
              </button>
              <label className={cn("inline-flex h-9 cursor-pointer items-center gap-2 rounded-full px-3 text-xs font-medium", !theme.useThemeColor ? "bg-[var(--primary)] text-[var(--on-primary)]" : "bg-[var(--surface-container-high)] text-[var(--muted)]")}>
                <input type="color" value={theme.color} onChange={(event) => patch({ color: event.target.value, useThemeColor: false })} className="h-4 w-4 cursor-pointer rounded-full border-0 bg-transparent p-0" aria-label={L("Custom colour", "Свой цвет")} />
                {theme.color.toUpperCase()}
              </label>
              <button type="button" onClick={() => void sync()} className={BUTTON}><RefreshCw size={13} aria-hidden="true" />{L("Apply now", "Применить сейчас")}</button>
            </div>
          </FieldRow>
        </div>
      </SettingsGroup>

      <SettingsGroup
        title={L("Popular icons & visit cache", "Популярные иконки и кеш посещений")}
        description={L("500 popular sites are available in the shortcut picker. Icons encountered while browsing are saved locally and reused on the search screen.", "В подборщике вкладок доступны 500 популярных сайтов. Иконки посещаемых сайтов сохраняются локально и используются на странице поиска.")}
      >
        <div className={cn(CARD, "divide-y divide-[var(--line)]")}>
          <SliderRow
            label={L("Cache retention", "Хранить в кеше")}
            value={theme.cacheDays}
            min={1}
            max={30}
            step={1}
            unit={ru ? " дн." : " days"}
            onChange={(cacheDays) => patch({ cacheDays })}
          />
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div className="text-sm">
              <span className="font-semibold tabular-nums">{cacheCount}</span>
              <span className="ms-2 text-xs text-[var(--muted)]">{L("site icons cached on this device", "иконок сайтов сохранено на устройстве")}</span>
            </div>
            <button type="button" onClick={() => void clearCache()} disabled={cacheCount === 0} className={BUTTON}>
              <Trash2 size={14} aria-hidden="true" /> {L("Clear cache", "Очистить кеш")}
            </button>
          </div>
        </div>
      </SettingsGroup>

      <SettingsGroup title={L("Preview", "Предпросмотр")} description={L("The same recolour the extension runs in every tab: colour groups of the logo become the theme's tones, white details stay as contrast, all on the tonal tile — like the app menu.", "Та же перекраска, что расширение делает во всех вкладках: цветовые группы логотипа становятся тонами темы, белые детали остаются контрастными, всё на тональной плитке — как в меню приложений.")}>
        <div className={CARD}>
          <FaviconPreview />
        </div>
      </SettingsGroup>

      <SettingsGroup title={L("Chrome connection", "Подключение к Chrome")} description={connected ? L("LisYan extension detected. The content script is active on http(s) pages.", "Расширение LisYan обнаружено. Контент-скрипт работает на http(s)-страницах.") : L("Favicons of other sites can only be changed by an extension. Download it once, load it unpacked, and every tab starts following this palette.", "Иконки других сайтов может менять только расширение. Скачайте его один раз, загрузите распакованным — и все вкладки начнут следовать этой палитре.")}>
        <div className={cn(CARD, "p-4")}>
          <div className="mb-3 flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[13px] bg-[var(--primary-container)] text-[var(--on-primary-container)]"><Globe2 size={19} aria-hidden="true" /></span>
            <div className="min-w-0">
              <div className="text-sm font-semibold">{connected ? L("Connected", "Подключено") : L("Extension needed", "Нужно расширение")}</div>
              <p className="mt-0.5 text-xs leading-relaxed text-[var(--muted)]">
                {L("The generated package includes the favicon content script, the new-tab launcher and userscripts. It is the same extension as Developer → Download.", "Сгенерированный пакет включает контент-скрипт иконок, лаунчер новой вкладки и пользовательские скрипты. Это то же расширение, что в «Разработчик → Скачать».")}
              </p>
            </div>
          </div>
          <button type="button" onClick={() => void download()} disabled={busy} className={cn(BUTTON_PRIMARY, "w-full justify-center")}>
            {busy ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <Download size={15} aria-hidden="true" />}
            {busy ? L("Building…", "Собираю…") : L("Download Chrome extension", "Скачать расширение для Chrome")}
          </button>
          {error && <p className="mt-2 text-xs leading-snug text-[var(--error,#b3261e)]">{error}</p>}
          <ol className="mt-3 space-y-1.5 ps-4 text-[11px] leading-relaxed text-[var(--muted)] [list-style:decimal]">
            <li>{L("Unzip the folder somewhere permanent.", "Распакуйте папку в постоянное место.")}</li>
            <li>{L("Open chrome://extensions and switch on Developer mode.", "Откройте chrome://extensions и включите режим разработчика.")}</li>
            <li>{L("Choose “Load unpacked” and select the folder.", "Нажмите «Загрузить распакованное» и выберите папку.")}</li>
            <li>{L("Open any site — its favicon is repainted; already-open tabs update instantly.", "Откройте любой сайт — иконка перекрасится, уже открытые вкладки обновятся сразу.")}</li>
          </ol>
          <a href="https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world#load-unpacked" target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-[var(--primary)] hover:underline">
            {L("Chrome instructions", "Инструкция Chrome")} <ExternalLink size={12} aria-hidden="true" />
          </a>
        </div>
      </SettingsGroup>
      <Notice icon={Camera}>{L("Only the icon is redrawn, locally in a canvas. No browsing data, page text or images are collected or sent anywhere.", "Перерисовывается только иконка, локально в canvas. Данные просмотра, текст страниц и картинки никуда не отправляются.")}</Notice>
    </div>
  );
}
