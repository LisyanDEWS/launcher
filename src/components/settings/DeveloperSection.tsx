import { Braces, Copy, Database, Download, FileCode2, Flame, Globe, PackageOpen } from "lucide-react";
import { useCallback, useState } from "react";
import { BUTTON, BUTTON_PRIMARY, CARD, Notice, SettingsGroup } from "../ui";
import { buildCrx, buildExtensionFiles, buildZip, crxFileName, extensionFileName, localStateSummary, type BrowserTarget } from "../../lib/extension";

import { useI18n } from "../../lib/i18n";
import { useSettingsCtx } from "./context";
import { cn } from "../../utils/cn";

/** CSS variables that make a ThemedAppArtwork preview use the userscript's tint. */
/** Settings → Developer: browser extensions, favicon userscript, and the local state read-out. */
export default function DeveloperSection() {
  const { t, lang } = useI18n();
  const ru = lang.startsWith("ru");
  const L = (en: string, rus: string) => (ru ? rus : en);
  const { settings } = useSettingsCtx();
  const [busy, setBusy] = useState<BrowserTarget | null>(null);
  const [crxBusy, setCrxBusy] = useState(false);

  const downloadCrx = useCallback(async () => {
    setCrxBusy(true);
    try {
      const files = await buildExtensionFiles(settings, "chromium");
      const crx = await buildCrx(files);
      const url = URL.createObjectURL(crx);
      const link = document.createElement("a");
      link.href = url;
      link.download = crxFileName();
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : L("Could not sign the extension.", "Не удалось подписать расширение."));
    } finally {
      setCrxBusy(false);
    }
  }, [settings, L]);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const summary = localStateSummary();

  const download = useCallback(
    async (target: BrowserTarget) => {
      setError("");
      setBusy(target);
      try {
        const files = await buildExtensionFiles(settings, target);
        const zip = buildZip(files);
        const url = URL.createObjectURL(zip);
        const link = document.createElement("a");
        link.href = url;
        link.download = extensionFileName(target);
        link.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : L("Could not build the extension.", "Не удалось собрать расширение."));
      } finally {
        setBusy(null);
      }
    },
    [settings, L],
  );



  const copyState = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify({ settings: summary.settings, bookmarks: summary.bookmarks, history: summary.history }, null, 2));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setError(L("Clipboard is unavailable.", "Буфер обмена недоступен."));
    }
  };

  const rows: [string, number][] = [
    [t("dev.state.widgets"), summary.settings.widgets.length],
    [t("dev.state.bookmarks"), summary.bookmarks.length],
    [t("dev.state.history"), summary.history.length],
    [L("Weather widgets", "Погодных виджетов"), summary.settings.widgets.filter((w) => w.type === "weather").length],
    [L("Clock widgets", "Часов"), summary.settings.widgets.filter((w) => w.type === "clock").length],
    [L("Calendar widgets", "Календарей"), summary.settings.widgets.filter((w) => w.type === "clock" && w.face.startsWith("cal_")).length],
  ];

  const steps = (key: string) =>
    t(key as never)
      .split("\n")
      .map((line) => (
        <li key={line} className="flex gap-2">
          <span className="text-[var(--muted)]">{line.slice(0, 2).replace(/\D/g, "") || "•"}</span>
          <span>{line.replace(/^\d+\.\s*/, "")}</span>
        </li>
      ));

  const ExtensionCard = ({ target, icon: Icon, title, stepsKey }: { target: BrowserTarget; icon: typeof Globe; title: string; stepsKey: string }) => (
    <div className={cn(CARD, "flex flex-col gap-3 p-4")}>
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[var(--primary)] text-[var(--on-primary)]">
          <Icon size={20} aria-hidden="true" />
        </span>
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <div>
        <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">{t("dev.ext.install")}</div>
        <ul className="space-y-1 text-xs leading-5 text-[var(--muted)]">{steps(stepsKey)}</ul>
      </div>
      <button type="button" onClick={() => void download(target)} disabled={busy !== null} className={cn(BUTTON_PRIMARY, "mt-auto w-full justify-center")}>
        <Download size={16} aria-hidden="true" />
        {busy === target ? L("Packing…", "Собираю…") : L("Download package", "Скачать пакет")}
      </button>
    </div>
  );

  return (
    <div className="space-y-8">
      <SettingsGroup title={t("dev.ext.title")} description={t("dev.ext.desc")}>
        <div className="grid gap-3 sm:grid-cols-2">
          <ExtensionCard target="chromium" icon={Globe} title={L("Chromium browsers", "Браузеры на Chromium")} stepsKey="dev.ext.chromeSteps" />
          <ExtensionCard target="firefox" icon={Flame} title="Firefox" stepsKey="dev.ext.firefoxSteps" />
        </div>

        <div className={cn(CARD, "flex flex-col gap-3 p-4")}>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[var(--primary)] text-[var(--on-primary)]">
              <Download size={20} aria-hidden="true" />
            </span>
            <div>
              <h3 className="text-sm font-semibold">{L("Ready-to-install .crx (Chrome)", "Готовый к установке .crx (Chrome)")}</h3>
              <p className="mt-0.5 text-xs leading-5 text-[var(--muted)]">
                {L(
                  "A single signed file — no ZIP to unpack. In Chrome: chrome://extensions → Developer mode → “Load packed” → pick the .crx.",
                  "Один подписанный файл — ZIP распаковывать не надо. В Chrome: chrome://extensions → режим разработчика → «Загрузить упакованное» → выберите .crx.",
                )}
              </p>
            </div>
          </div>
          <button type="button" onClick={() => void downloadCrx()} disabled={crxBusy} className={cn(BUTTON_PRIMARY, "w-full justify-center")}>
            <Download size={16} aria-hidden="true" />
            {crxBusy ? L("Signing…", "Подписываю…") : L("Download .crx", "Скачать .crx")}
          </button>
          <p className="text-[11px] leading-4 text-[var(--muted)]">
            {L(
              "Android Chrome cannot install extensions at all — use Kiwi Browser (chrome://extensions works there) or Firefox for Android. On desktop Chrome the .crx installs directly.",
              "Android Chrome вообще не умеет расширения — используйте Kiwi Browser (там работает chrome://extensions) или Firefox для Android. На обычном Chrome .crx ставится сразу файлом.",
            )}
          </p>
        </div>
        <p className="mt-2 flex items-start gap-2 px-1 text-xs leading-5 text-[var(--muted)]">
          <PackageOpen size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
          {t("dev.ext.includes")}
        </p>
        {error && (
          <Notice icon={Braces}>
            <span className="font-medium">{error}</span>
          </Notice>
        )}
      </SettingsGroup>

      <SettingsGroup title={t("dev.state.title")} description={t("dev.state.desc")}>
        <div className={cn(CARD, "p-4")}>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {rows.map(([label, value]) => (
              <div key={label} className="flex min-h-11 flex-col justify-center rounded-[13px] bg-[var(--surface-container-high)] px-3 py-2">
                <span className="truncate text-[11px] text-[var(--muted)]">{label}</span>
                <b className="text-sm tabular-nums">{value}</b>
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => void copyState()} className={BUTTON}>
              {copied ? <Database size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}
              {copied ? t("dev.state.copied") : t("dev.state.copy")}
            </button>
            <span className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
              <FileCode2 size={14} aria-hidden="true" />
              lisyan_settings · lisyan_bookmarks · lisyan_search_history
            </span>
          </div>
        </div>
      </SettingsGroup>
    </div>
  );
}
