import { AlertCircle, Check, Database, Download, FileJson, Image, Upload, X } from "lucide-react";
import { useRef, useState } from "react";
import type { RestorePayload } from "../../lib/backup";
import { createBackupFile, readBackupFile } from "../../lib/backup";
import { useSettingsCtx } from "./context";
import { BUTTON, BUTTON_PRIMARY, CARD, Notice } from "../ui";
import { cn } from "../../utils/cn";

type Pending = { name: string; backup: RestorePayload };

const formatSize = (bytes: number) => (bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`);

export default function BackupSection() {
  const { settings, bookmarks, history, restoreBackup, toast } = useSettingsCtx();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<"export" | "import" | "restore" | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [error, setError] = useState("");

  const ru = settings.language === "ru" || (settings.language === "auto" && typeof navigator !== "undefined" && navigator.language.startsWith("ru"));
  const L = (en: string, rus: string) => (ru ? rus : en);

  const exportData = async () => {
    setError("");
    setBusy("export");
    try {
      const blob = await createBackupFile({ settings, bookmarks, history });
      const date = new Date().toISOString().slice(0, 10);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `LisYan-backup-${date}.json`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast(L("Backup saved to your downloads", "Резервная копия сохранена в загрузки"));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : L("Could not create the backup.", "Не удалось создать резервную копию."));
    } finally {
      setBusy(null);
    }
  };

  const chooseFile = async (file?: File) => {
    if (!file) return;
    setError("");
    setPending(null);
    setBusy("import");
    try {
      const backup = await readBackupFile(file);
      setPending({ name: file.name, backup });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : L("That file could not be read.", "Не удалось прочитать файл."));
    } finally {
      setBusy(null);
      if (input.current) input.current.value = "";
    }
  };

  const restore = async () => {
    if (!pending) return;
    setError("");
    setBusy("restore");
    try {
      await restoreBackup(pending.backup);
      setPending(null);
      toast(L("Backup restored", "Резервная копия восстановлена"));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : L("Could not restore this backup.", "Не удалось восстановить эту копию."));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <section className={cn(CARD, "backup-action")}>
          <span className="backup-icon">
            <Download size={20} aria-hidden="true" />
          </span>
          <h2 className="text-sm font-semibold">{L("Export a backup", "Сохранить копию")}</h2>
          <p className="min-h-10 text-xs leading-5 text-[var(--muted)]">
            {L("Save settings, bookmarks, search history and an uploaded wallpaper in one JSON file.", "Сохраните настройки, закладки, историю поиска и загруженные обои в один JSON-файл.")}
          </p>
          <button type="button" onClick={exportData} disabled={busy !== null} className={cn(BUTTON_PRIMARY, "w-full justify-center")}>
            <FileJson size={16} aria-hidden="true" />
            {busy === "export" ? L("Preparing…", "Подготовка…") : L("Download backup", "Скачать копию")}
          </button>
        </section>

        <section className={cn(CARD, "backup-action")}>
          <span className="backup-icon backup-icon--tonal">
            <Upload size={20} aria-hidden="true" />
          </span>
          <h2 className="text-sm font-semibold">{L("Import a backup", "Восстановить копию")}</h2>
          <p className="min-h-10 text-xs leading-5 text-[var(--muted)]">
            {L("Choose a LisYan JSON backup. Review what it contains before replacing your current data.", "Выберите JSON-копию LisYan и проверьте содержимое перед заменой текущих данных.")}
          </p>
          <input ref={input} type="file" accept=".json,application/json" className="sr-only" onChange={(event) => void chooseFile(event.currentTarget.files?.[0])} />
          <button type="button" onClick={() => input.current?.click()} disabled={busy !== null} className={cn(BUTTON, "w-full justify-center")}>
            <Upload size={16} aria-hidden="true" />
            {busy === "import" ? L("Reading file…", "Чтение файла…") : L("Choose backup file", "Выбрать файл")}
          </button>
        </section>
      </div>

      {error && (
        <Notice icon={AlertCircle}>
          <span className="font-medium">{error}</span>
        </Notice>
      )}

      {pending && (
        <section className={cn(CARD, "backup-review")}>
          <div className="flex items-start gap-3">
            <span className="backup-icon backup-icon--tonal">
              <FileJson size={20} aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-sm font-semibold">{pending.name}</h2>
              <p className="mt-1 text-xs text-[var(--muted)]">{L("This will replace the current data on this device.", "Это заменит текущие данные на этом устройстве.")}</p>
            </div>
            <button type="button" onClick={() => setPending(null)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full hover:bg-[var(--surface-container-high)]" aria-label={L("Cancel", "Отмена")}>
              <X size={16} aria-hidden="true" />
            </button>
          </div>

          <div className="backup-summary">
            <div><span>{L("Preferences", "Настройки")}</span><b><Check size={15} aria-hidden="true" /></b></div>
            <div><span>{L("Bookmarks", "Закладки")}</span><b>{pending.backup.bookmarks.length}</b></div>
            <div><span>{L("Search history", "История поиска")}</span><b>{pending.backup.history.length}</b></div>
            <div><span>{L("Wallpaper", "Обои")}</span><b>{pending.backup.wallpaper ? <><Image size={14} aria-hidden="true" /> {formatSize(pending.backup.wallpaper.size)}</> : L("None", "Нет")}</b></div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void restore()} disabled={busy !== null} className={cn(BUTTON_PRIMARY, "justify-center")}>
              <Database size={15} aria-hidden="true" />
              {busy === "restore" ? L("Restoring…", "Восстановление…") : L("Replace with this backup", "Заменить данные")}
            </button>
            <button type="button" onClick={() => setPending(null)} disabled={busy !== null} className={BUTTON}>
              {L("Cancel", "Отмена")}
            </button>
          </div>
        </section>
      )}

      <div className="backup-note">
        <span className="backup-icon backup-icon--small"><Database size={16} aria-hidden="true" /></span>
        <p>{L("Your backup is created locally in your browser. It is not uploaded anywhere. Importing replaces your current settings, bookmarks, history and uploaded wallpaper.", "Копия создаётся в браузере и никуда не отправляется. Импорт заменит текущие настройки, закладки, историю и загруженные обои.")}</p>
      </div>
    </div>
  );
}