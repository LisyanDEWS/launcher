import { Code2, Globe, Play, Plus, Power, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { BUTTON, BUTTON_PRIMARY, CARD, Notice, SettingsGroup, ToggleRow } from "../ui";
import { useI18n } from "../../lib/i18n";
import {
  isExtensionContext,
  listUserScripts,
  normalizeScript,
  onUserScriptsChanged,
  parseUserscriptHeader,
  saveUserScripts,
  type UserScript,
} from "../../lib/userscripts";
import { cn } from "../../utils/cn";

const SAMPLE = `// ==UserScript==
// @name         Example: darken page
// @match        *://*/*
// @run-at       document_idle
// ==/UserScript==
// Runs on every site, automatically, as soon as the extension loads.
document.documentElement.style.filter = "saturate(0.9)";`;

/** Settings → Developer → User scripts: a tiny built-in Tampermonkey. */
export default function UserscriptsSection() {
  const { lang } = useI18n();
  const ru = lang.startsWith("ru");
  const L = (en: string, rus: string) => (ru ? rus : en);
  const [scripts, setScripts] = useState<UserScript[]>([]);
  const [editing, setEditing] = useState<UserScript | null>(null);
  const [name, setName] = useState("");
  const [matchLine, setMatchLine] = useState("");
  const [code, setCode] = useState("");

  useEffect(() => {
    void listUserScripts().then(setScripts);
    return onUserScriptsChanged(setScripts);
  }, []);

  const persist = (next: UserScript[]) => {
    setScripts(next);
    void saveUserScripts(next);
  };

  const startNew = () => {
    setEditing(null);
    setName("");
    setMatchLine("*://*/*");
    setCode(SAMPLE);
  };

  const startEdit = (script: UserScript) => {
    setEditing(script);
    setName(script.name);
    setMatchLine(script.matches.join("\n"));
    setCode(script.code);
  };

  const save = () => {
    const matches = matchLine.split("\n").map((line) => line.trim()).filter(Boolean);
    if (!code.trim()) return;
    const base = editing ?? normalizeScript({ code, matches });
    const next: UserScript = {
      ...base,
      name: name.trim() || parseUserscriptHeader(code).name || "Untitled script",
      matches: matches.length ? matches : parseUserscriptHeader(code).matches.length ? parseUserscriptHeader(code).matches : ["<all_urls>"],
      code,
      enabled: base.enabled,
    };
    if (editing) persist(scripts.map((script) => (script.id === editing.id ? next : script)));
    else persist([...scripts, next]);
    setEditing(null);
  };

  const toggle = (script: UserScript) =>
    persist(scripts.map((item) => (item.id === script.id ? { ...item, enabled: !item.enabled } : item)));

  const remove = (script: UserScript) => persist(scripts.filter((item) => item.id !== script.id));

  return (
    <div className="space-y-6">
      <Notice icon={Code2}>
        {isExtensionContext()
          ? L(
              "The extension injects these scripts into every matching tab automatically — including tabs that are already open. No Tampermonkey needed.",
              "Расширение само вставляет эти скрипты во все подходящие вкладки — включая уже открытые. Tampermonkey не нужен.",
            )
          : L(
              "This is a plain web page, so scripts are stored but not injected. Install the extension (below) to run them on sites.",
              "Это обычная веб-страница, поэтому скрипты сохраняются, но не выполняются. Установите расширение ниже, чтобы запускать их на сайтах.",
            )}
      </Notice>

      <SettingsGroup title={L("User scripts", "Пользовательские скрипты")}>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={startNew} className={cn(BUTTON_PRIMARY, "justify-center")}>
            <Plus size={16} aria-hidden="true" />
            {L("New script", "Новый скрипт")}
          </button>
        </div>

        {scripts.length === 0 && (
          <p className="rounded-[20px] bg-[var(--surface-container-high)] px-4 py-6 text-center text-sm text-[var(--muted)]">
            {L("No scripts yet. Add one — @match lines from a Tampermonkey header work too.", "Пока пусто. Добавьте скрипт — поддерживаются даже @match из шапки Tampermonkey.")}
          </p>
        )}

        <div className="space-y-2">
          {scripts.map((script) => (
            <div key={script.id} className={cn(CARD, "p-3")}>
              <div className="flex items-center gap-2">
                <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", script.enabled ? "bg-[var(--primary)] text-[var(--on-primary)]" : "bg-[var(--surface-container-highest)] text-[var(--muted)]")}>
                  {script.enabled ? <Play size={14} aria-hidden="true" /> : <Power size={14} aria-hidden="true" />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{script.name}</div>
                  <div className="truncate text-[11px] text-[var(--muted)]">{script.matches.join(", ")}</div>
                </div>
                <button type="button" onClick={() => toggle(script)} aria-pressed={script.enabled} title={L("Enable/disable", "Вкл/выкл")} className={cn("flex h-8 w-8 items-center justify-center rounded-full transition hover:bg-[var(--surface-container-high)]", !script.enabled && "opacity-50")}>
                  <Power size={15} aria-hidden="true" />
                </button>
                <button type="button" onClick={() => startEdit(script)} title={L("Edit", "Изменить")} className="flex h-8 w-8 items-center justify-center rounded-full transition hover:bg-[var(--surface-container-high)]">
                  <Code2 size={15} aria-hidden="true" />
                </button>
                <button type="button" onClick={() => remove(script)} title={L("Delete", "Удалить")} className="flex h-8 w-8 items-center justify-center rounded-full text-red-400 transition hover:bg-red-500/15">
                  <Trash2 size={15} aria-hidden="true" />
                </button>
              </div>
              <div className="mt-1 flex flex-wrap gap-1 px-1">
                {script.matches.slice(0, 3).map((pattern) => (
                  <span key={pattern} className="rounded-full bg-[var(--surface-container-high)] px-2 py-0.5 text-[10px] font-medium text-[var(--muted)]">
                    <Globe size={10} className="me-1 inline" aria-hidden="true" />
                    {pattern}
                  </span>
                ))}
                <span className="rounded-full bg-[var(--surface-container-high)] px-2 py-0.5 text-[10px] font-medium text-[var(--muted)]">{script.runAt}</span>
                <span className="rounded-full bg-[var(--surface-container-high)] px-2 py-0.5 text-[10px] font-medium text-[var(--muted)]">{script.code.split("\n").length} {L("lines", "строк")}</span>
              </div>
            </div>
          ))}
        </div>
      </SettingsGroup>

      {(editing !== null || scripts.length === 0 || name || code !== SAMPLE) && (editing !== null || matchLine) && (
        <SettingsGroup title={editing ? L("Edit script", "Редактирование") : L("New script", "Новый скрипт")}>
          <div className={cn(CARD, "space-y-3 p-4")}>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={L("Name", "Название")}
              maxLength={60}
              className="h-11 w-full rounded-2xl bg-[var(--surface-container-high)] px-4 text-sm outline-none placeholder:text-[var(--muted)] focus:bg-[var(--surface-container-highest)]"
            />
            <textarea
              value={matchLine}
              onChange={(e) => setMatchLine(e.target.value)}
              placeholder={L("One @match per line, e.g. *://*.example.com/*  (or <all_urls>)", "По одному @match на строку, например *://*.example.com/*  (или <all_urls>)")}
              rows={2}
              dir="ltr"
              className="w-full resize-y rounded-2xl bg-[var(--surface-container-high)] p-3 font-mono text-xs outline-none placeholder:text-[var(--muted)] focus:bg-[var(--surface-container-highest)]"
            />
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder={L("// ==UserScript== … your JavaScript", "// ==UserScript== … ваш JavaScript")}
              rows={12}
              dir="ltr"
              spellCheck={false}
              className="w-full resize-y rounded-2xl bg-[var(--surface-container-high)] p-3 font-mono text-xs leading-5 outline-none placeholder:text-[var(--muted)] focus:bg-[var(--surface-container-highest)]"
            />
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={save} className={cn(BUTTON_PRIMARY, "justify-center")}>
                {L("Save and run everywhere it matches", "Сохранить и запускать везде, куда подходит")}
              </button>
              <button type="button" onClick={() => setEditing(null)} className={BUTTON}>
                {L("Cancel", "Отмена")}
              </button>
            </div>
            <p className="text-[11px] leading-4 text-[var(--muted)]">
              {L("@match / @include / @run-at / @name in the code header are honoured automatically.", "@match / @include / @run-at / @name из шапки кода понимаются автоматически.")}
            </p>
          </div>
        </SettingsGroup>
      )}

      <ToggleRow
        title={L("Repaint favicons of already-open tabs when the theme changes", "Перекрашивать favicon уже открытых вкладок при смене темы")}
        description={L("The background worker messages every open tab; no reload needed.", "Фоновая страница рассылает сообщение всем открытым вкладкам — перезагрузка не нужна.")}
        checked
        onChange={() => undefined}
      />
      <p className="px-1 text-[11px] leading-4 text-[var(--muted)]">
        {L("This is built in — it cannot be turned off, it is what makes favicon theming feel instant.", "Это встроено и не отключается — именно это делает перекраску favicon мгновенной.")}
      </p>
    </div>
  );
}
