import SandboxHtmlFrame from "../SandboxHtmlFrame";
import { useState, useMemo } from "react";
import {
  Code2,
  Eye,
  Copy,
  Check,
  X,
  Monitor,
  Smartphone,
  Tablet,
} from "lucide-react";
import { useI18n } from "../../lib/i18n";
import { useWeather } from "../../lib/weather";
import { useNow, getClockTime } from "../../lib/clock";
import type { CustomHtmlWidget } from "../../lib/settings";
import { cn } from "../../utils/cn";

type Props = {
  initialWidget?: CustomHtmlWidget | null;
  onSave: (html: string, title: string, styleVariant: "m3" | "matrix") => void;
  onClose: () => void;
};

const TEMPLATES: Array<{
  id: string;
  nameEn: string;
  nameRu: string;
  variant: "m3" | "matrix";
  code: string;
}> = [
  {
    id: "m3_calm_sunny",
    nameEn: "M3 Expressive · Calm Sunny",
    nameRu: "M3 Expressive · Солнечный день",
    variant: "m3",
    code: `<div style="box-sizing:border-box;width:100%;height:100%;min-height:220px;padding:24px;border-radius:28px;background:#ececec;color:#1a1a1a;font-family:'Roboto Flex',system-ui,sans-serif;display:flex;flex-direction:column;justify-content:space-between;gap:16px;">
  <div style="display:flex;justify-content:space-between;align-items:center;font-size:14px;font-weight:500;">
    <span>{city}</span>
    <span style="padding:4px 12px;border-radius:999px;border:1px solid #1a1a1a;font-size:12px;font-weight:500;">UV {uv}</span>
  </div>
  <div style="display:flex;align-items:center;justify-content:space-between;">
    <div style="font-size:64px;font-weight:500;line-height:1;letter-spacing:-1px;">{temp}°</div>
    <div style="font-size:20px;font-weight:600;">{condition}</div>
  </div>
  <div style="display:flex;justify-content:space-between;align-items:center;font-size:13px;font-weight:500;color:#4a4a4a;border-top:1px solid #d4d4d4;padding-top:12px;">
    <span>Wind {wind} km/h</span>
    <span>Humidity {humidity}%</span>
    <span>H {high}° · L {low}°</span>
  </div>
</div>`,
  },
  {
    id: "m3_expressive_accent",
    nameEn: "M3 · Clean Bento",
    nameRu: "M3 · Чистый бенто",
    variant: "m3",
    code: `<div style="box-sizing:border-box;width:100%;height:100%;min-height:220px;padding:24px;border-radius:28px;background:var(--surface-container-high,#1c1b1f);color:var(--fg,#e6e1e5);font-family:'Roboto Flex',system-ui,sans-serif;display:flex;flex-direction:column;justify-content:space-between;gap:16px;">
  <div style="display:flex;justify-content:space-between;align-items:center;font-size:13px;font-weight:500;opacity:0.8;">
    <span>{city}</span>
    <span>{time}</span>
  </div>
  <div style="display:flex;align-items:baseline;justify-content:space-between;">
    <div style="font-size:64px;font-weight:600;line-height:1;letter-spacing:-2px;">{temp}°</div>
    <div style="text-align:right;">
      <div style="font-size:16px;font-weight:600;">{condition}</div>
      <div style="font-size:12px;opacity:0.7;margin-top:4px;">Feels {apparent}°</div>
    </div>
  </div>
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;background:var(--surface-container-highest,#2b2930);padding:10px;border-radius:18px;text-align:center;font-size:11px;opacity:0.85;">
    <div><b style="display:block;font-size:14px;color:var(--primary,#d0bcff);">{wind}</b>KM/H</div>
    <div><b style="display:block;font-size:14px;color:var(--primary,#d0bcff);">{humidity}%</b>RAIN</div>
    <div><b style="display:block;font-size:14px;color:var(--primary,#d0bcff);">{uv}</b>UV</div>
  </div>
</div>`,
  },
  {
    id: "m3_dark_rainy",
    nameEn: "M3 Dark · Precipitation Bar",
    nameRu: "M3 Темный · Индикатор осадков",
    variant: "m3",
    code: `<div style="box-sizing:border-box;width:100%;height:100%;min-height:220px;padding:24px;border-radius:28px;background:#1c1c1c;color:#f2f2f2;font-family:'Roboto Flex',system-ui,sans-serif;display:flex;flex-direction:column;justify-content:space-between;gap:16px;">
  <div style="display:flex;align-items:center;justify-content:space-between;">
    <div>
      <div style="font-size:56px;font-weight:500;line-height:1;">{temp}°</div>
      <div style="font-size:18px;font-weight:600;margin-top:6px;">{condition}</div>
    </div>
    <span style="font-size:12px;font-weight:600;padding:4px 10px;border-radius:999px;background:#2b2b2b;">Rain {precip}%</span>
  </div>
  <div style="padding:14px 16px;border-radius:20px;background:#2b2b2b;font-size:13px;font-weight:500;">
    <div style="display:flex;justify-content:space-between;color:#ccc;margin-bottom:8px;">
      <span>Precipitation chance</span>
      <span style="font-weight:600;color:#fff;">{precip}%</span>
    </div>
    <div style="height:6px;border-radius:6px;background:#3a3a3a;overflow:hidden;">
      <div style="height:100%;width:{precip}%;border-radius:6px;background:#f2f2f2;"></div>
    </div>
  </div>
  <div style="display:flex;justify-content:space-between;font-size:13px;color:#999;">
    <span>{city}</span>
    <span>Updated {time}</span>
  </div>
</div>`,
  },
  {
    id: "m3_glass_pill",
    nameEn: "Glassmorphism · Ambient Aura",
    nameRu: "Стеклянный · Размытие и аура",
    variant: "m3",
    code: `<div style="box-sizing:border-box;width:100%;height:100%;min-height:220px;padding:24px;border-radius:32px;background:rgba(255,255,255,0.08);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);border:1px solid rgba(255,255,255,0.18);color:#ffffff;font-family:system-ui,sans-serif;display:flex;flex-direction:column;justify-content:space-between;gap:16px;box-shadow:0 20px 50px rgba(0,0,0,0.3);">
  <div style="display:flex;justify-content:space-between;align-items:center;font-size:14px;opacity:0.85;">
    <span>{city}</span>
    <span>{date}</span>
  </div>
  <div style="display:flex;align-items:center;justify-content:space-between;">
    <div style="font-size:62px;font-weight:700;line-height:1;letter-spacing:-1px;">{temp}°</div>
    <div style="text-align:right;">
      <div style="font-size:18px;font-weight:600;">{condition}</div>
      <div style="font-size:13px;opacity:0.75;margin-top:2px;">Feels {apparent}°</div>
    </div>
  </div>
  <div style="display:flex;justify-content:space-between;font-size:13px;opacity:0.85;border-top:1px solid rgba(255,255,255,0.14);padding-top:12px;">
    <span>Wind {wind} km/h</span>
    <span>Humidity {humidity}%</span>
    <span>UV {uv}</span>
  </div>
</div>`,
  },
  {
    id: "minimal_clock_quote",
    nameEn: "Minimal Clock & Note",
    nameRu: "Минималистичные часы и заметка",
    variant: "m3",
    code: `<div style="box-sizing:border-box;width:100%;height:100%;min-height:200px;padding:24px;border-radius:28px;background:var(--surface-container-high,#1e1e24);color:var(--fg,#fff);font-family:'Roboto Flex',system-ui,sans-serif;display:flex;flex-direction:column;justify-content:space-between;">
  <div style="display:flex;justify-content:space-between;font-size:13px;opacity:0.7;">
    <span>SYSTEM STATUS</span>
    <span style="color:#4ade80;font-weight:600;">ACTIVE</span>
  </div>
  <div style="text-align:center;margin:8px 0;">
    <div style="font-size:52px;line-height:1;font-weight:600;letter-spacing:-1px;">{time}</div>
    <div style="font-size:13px;opacity:0.7;margin-top:6px;">{date} · {city}</div>
  </div>
  <div style="text-align:center;font-size:12px;opacity:0.8;border-top:1px solid var(--line,rgba(255,255,255,0.1));padding-top:10px;">
    {condition} · {temp}°C
  </div>
</div>`,
  },
];

const AVAILABLE_TOKENS = [
  { token: "{city}", label: "Город / City" },
  { token: "{temp}", label: "Температура / Temp" },
  { token: "{condition}", label: "Погода / Condition" },
  { token: "{apparent}", label: "Ощущается / Feels" },
  { token: "{high}", label: "Макс / High" },
  { token: "{low}", label: "Мин / Low" },
  { token: "{wind}", label: "Ветер / Wind" },
  { token: "{humidity}", label: "Влажность / Humidity" },
  { token: "{uv}", label: "УФ / UV" },
  { token: "{precip}", label: "Осадки / Precip" },
  { token: "{time}", label: "Время / Time" },
  { token: "{date}", label: "Дата / Date" },
];

export default function HtmlWidgetWorkspace({ initialWidget, onSave, onClose }: Props) {
  const { lang } = useI18n();
  const isRu = lang === "ru";
  const now = useNow();
  const time = getClockTime(now, lang, "local", "auto");
  const weather = useWeather("Moscow", "c");

  const [title, setTitle] = useState(initialWidget?.title || (isRu ? "Мой виджет" : "Custom Widget"));
  const [code, setCode] = useState(initialWidget?.html || TEMPLATES[0].code);
  const [styleVariant, setStyleVariant] = useState<"m3" | "matrix">(initialWidget?.styleVariant || "m3");
  const [previewWidth, setPreviewWidth] = useState<number>(340);
  const [copied, setCopied] = useState(false);

  // Live evaluated code
  const evaluatedCode = useMemo(() => {
    let src = code;
    const dateStr = new Date(now).toLocaleDateString(isRu ? "ru-RU" : "en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });

    const tokens: Record<string, string | number> = {
      "{city}": weather.city,
      "{temp}": weather.temp,
      "{apparent}": weather.apparentTemp,
      "{feels_like}": weather.apparentTemp,
      "{condition}": isRu ? weather.conditionRu : weather.condition,
      "{high}": weather.tempMax,
      "{low}": weather.tempMin,
      "{wind}": weather.windSpeed,
      "{humidity}": weather.humidity,
      "{uv}": weather.uvIndex.toFixed(0),
      "{precip}": weather.precipitationProb,
      "{rain}": weather.precipitationProb,
      "{pressure}": Math.round(weather.pressure),
      "{time}": `${time.hour}:${time.minute}`,
      "{hour}": time.hour,
      "{min}": time.minute,
      "{sec}": time.second,
      "{date}": dateStr,
    };

    for (const [key, val] of Object.entries(tokens)) {
      src = src.replaceAll(key, String(val));
    }
    return src;
  }, [code, weather, time, now, isRu]);

  const insertToken = (token: string) => {
    setCode((prev) => prev + "\n" + token);
  };

  const loadTemplate = (tmpl: (typeof TEMPLATES)[number]) => {
    setCode(tmpl.code);
    setTitle(isRu ? tmpl.nameRu : tmpl.nameEn);
    setStyleVariant(tmpl.variant);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const val = target.value;
      target.value = val.substring(0, start) + "  " + val.substring(end);
      target.selectionStart = target.selectionEnd = start + 2;
      setCode(target.value);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-[var(--bg)]/95 backdrop-blur-2xl text-[var(--fg)] animate-in fade-in duration-200">
      {/* Top Header */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-[var(--line)] px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--primary)] text-[var(--on-primary)] shadow-sm">
            <Code2 size={22} />
          </div>
          <div>
            <h1 className="text-base font-semibold leading-tight">
              {isRu ? "Студия создания HTML виджетов" : "HTML Widget Studio"}
            </h1>
            <p className="text-xs text-[var(--muted)]">
              {isRu
                ? "Пишите чистый HTML/CSS с поддержкой динамических токенов погоды и часов"
                : "Create custom HTML/CSS widgets with dynamic weather and time tokens"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 items-center gap-1.5 rounded-full px-4 text-xs font-medium text-[var(--muted)] hover:bg-[var(--surface-container-high)] hover:text-[var(--fg)] transition"
          >
            <X size={16} />
            {isRu ? "Отмена" : "Cancel"}
          </button>
          <button
            type="button"
            onClick={() => onSave(code, title, styleVariant)}
            className="flex h-10 items-center gap-2 rounded-full bg-[var(--primary)] px-5 text-xs font-semibold text-[var(--on-primary)] shadow-md hover:opacity-90 active:scale-95 transition"
          >
            <Check size={16} />
            {initialWidget
              ? isRu ? "Обновить виджет" : "Update Widget"
              : isRu ? "Добавить на экран" : "Add to Screen"}
          </button>
        </div>
      </header>

      {/* Main Workspace Area (Split Pane) */}
      <div className="grid flex-1 grid-cols-1 overflow-hidden lg:grid-cols-2">
        {/* Left Pane: Code Editor */}
        <div className="flex flex-col border-b border-[var(--line)] lg:border-b-0 lg:border-r">
          {/* Editor Sub-header */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] bg-[var(--surface)] px-4 py-2.5">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={isRu ? "Название виджета" : "Widget title"}
                className="h-8 rounded-xl bg-[var(--surface-container-high)] px-3 text-xs font-semibold text-[var(--fg)] outline-none ring-1 ring-[var(--line)] focus:ring-2 focus:ring-[var(--primary)]"
              />
            </div>

            {/* Template selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--muted)] font-medium">
                {isRu ? "Шаблоны:" : "Presets:"}
              </span>
              <div className="flex gap-1 overflow-x-auto max-w-[280px] py-1">
                {TEMPLATES.map((tmpl) => (
                  <button
                    key={tmpl.id}
                    type="button"
                    onClick={() => loadTemplate(tmpl)}
                    title={isRu ? tmpl.nameRu : tmpl.nameEn}
                    className="shrink-0 rounded-lg bg-[var(--surface-container-high)] px-2.5 py-1 text-[11px] font-medium text-[var(--fg)] hover:bg-[var(--surface-container-highest)] transition"
                  >
                    {isRu ? tmpl.nameRu.split("·")[1]?.trim() || tmpl.nameRu : tmpl.nameEn.split("·")[1]?.trim() || tmpl.nameEn}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={handleCopy}
                title={isRu ? "Скопировать HTML" : "Copy HTML"}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--surface-container-high)] text-[var(--muted)] hover:text-[var(--fg)] transition"
              >
                {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              </button>
            </div>
          </div>

          {/* Quick Token Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto border-b border-[var(--line)] bg-[var(--surface)]/50 px-4 py-2 scrollbar-none">
            <span className="text-[11px] font-semibold text-[var(--muted)] shrink-0">
              {isRu ? "Токены данных:" : "Tokens:"}
            </span>
            {AVAILABLE_TOKENS.map(({ token, label }) => (
              <button
                key={token}
                type="button"
                onClick={() => insertToken(token)}
                title={label}
                className="shrink-0 rounded-full border border-[var(--line)] bg-[var(--surface-container-high)] px-2 py-0.5 text-[10px] font-mono font-medium text-[var(--fg)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition active:scale-95"
              >
                {token}
              </button>
            ))}
          </div>

          {/* Code Textarea */}
          <div className="relative flex-1 bg-[#121214] p-3">
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={handleKeyDown}
              spellCheck={false}
              className="h-full w-full resize-none bg-transparent font-mono text-xs leading-relaxed text-[#f4f4f5] outline-none selection:bg-[#3f3f46]"
              placeholder="<div>Write HTML/CSS with {temp}, {city}, etc.</div>"
            />
          </div>
        </div>

        {/* Right Pane: Live Interactive Preview */}
        <div className="flex flex-col bg-[var(--surface-container-lowest,#0f0f12)]">
          {/* Preview Toolbar */}
          <div className="flex items-center justify-between border-b border-[var(--line)] bg-[var(--surface)] px-4 py-2.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-[var(--muted)]">
              <Eye size={15} />
              <span>{isRu ? "Живой просмотр виджета" : "Live Widget Preview"}</span>
            </div>

            {/* Size toggles */}
            <div className="flex items-center gap-1 rounded-xl bg-[var(--surface-container-high)] p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setPreviewWidth(280)}
                className={cn(
                  "flex items-center gap-1 rounded-lg px-2.5 py-1 font-medium transition",
                  previewWidth === 280
                    ? "bg-[var(--primary)] text-[var(--on-primary)]"
                    : "text-[var(--muted)] hover:text-[var(--fg)]"
                )}
              >
                <Smartphone size={13} />
                280px
              </button>
              <button
                type="button"
                onClick={() => setPreviewWidth(340)}
                className={cn(
                  "flex items-center gap-1 rounded-lg px-2.5 py-1 font-medium transition",
                  previewWidth === 340
                    ? "bg-[var(--primary)] text-[var(--on-primary)]"
                    : "text-[var(--muted)] hover:text-[var(--fg)]"
                )}
              >
                <Tablet size={13} />
                340px (M3)
              </button>
              <button
                type="button"
                onClick={() => setPreviewWidth(460)}
                className={cn(
                  "flex items-center gap-1 rounded-lg px-2.5 py-1 font-medium transition",
                  previewWidth === 460
                    ? "bg-[var(--primary)] text-[var(--on-primary)]"
                    : "text-[var(--muted)] hover:text-[var(--fg)]"
                )}
              >
                <Monitor size={13} />
                460px
              </button>
            </div>
          </div>

          {/* Live Preview Stage */}
          <div className="flex flex-1 items-center justify-center p-6 overflow-auto bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-800/20 via-zinc-950 to-zinc-950">
            <SandboxHtmlFrame
              html={evaluatedCode}
              fontFamily={styleVariant === "matrix" ? "'LED Dot-Matrix', monospace" : undefined}
              title="Preview"
              style={{ width: `${previewWidth}px`, minHeight: "220px" }}
            />
          </div>

          {/* Preview Details Footer */}
          <div className="flex items-center justify-between border-t border-[var(--line)] bg-[var(--surface)] px-4 py-2 text-[11px] text-[var(--muted)]">
            <div className="flex items-center gap-3">
              <span>
                {weather.city}: <b>{weather.temp}°C</b>, {weather.condition}
              </span>
              <span>
                {time.hour}:{time.minute}
              </span>
            </div>
            <span>{isRu ? "Виджет масштабируется на экране" : "Scales automatically on home screen"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
