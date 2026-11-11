import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { useSettingsCtx } from "./context";
import { resolveFaviconTheme } from "../../lib/favicon-bridge";
import { recolorFavicon, themeFaviconImage } from "../../lib/favicon-recolor";
import { useI18n } from "../../lib/i18n";
import { cn } from "../../utils/cn";

type Draw = (c: CanvasRenderingContext2D, s: number) => void;

const round = (c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  c.beginPath();
  if (c.roundRect) c.roundRect(x, y, w, h, r);
  else c.rect(x, y, w, h);
};

/** Recognisable stand-ins for real favicons, drawn locally (no network, no CORS) with their real colour structure. */
const SAMPLES: { name: string; draw: Draw }[] = [
  {
    name: "YouTube",
    draw: (c, s) => {
      c.fillStyle = "#ff0033";
      round(c, s * 0.04, s * 0.2, s * 0.92, s * 0.6, s * 0.17);
      c.fill();
      c.fillStyle = "#ffffff";
      c.beginPath();
      c.moveTo(s * 0.41, s * 0.35);
      c.lineTo(s * 0.67, s * 0.5);
      c.lineTo(s * 0.41, s * 0.65);
      c.closePath();
      c.fill();
    },
  },
  {
    name: "Google",
    draw: (c, s) => {
      const cx = s / 2;
      const r = s * 0.33;
      c.lineWidth = s * 0.17;
      const arc = (color: string, a0: number, a1: number) => {
        c.strokeStyle = color;
        c.beginPath();
        c.arc(cx, cx, r, a0, a1);
        c.stroke();
      };
      arc("#ea4335", -2.6, -0.62);
      arc("#fbbc05", 2.35, 3.68);
      arc("#34a853", 0.62, 2.35);
      arc("#4285f4", -0.05, 0.62);
      c.fillStyle = "#4285f4";
      c.fillRect(cx, cx - s * 0.085, r + s * 0.085, s * 0.17);
    },
  },
  {
    name: "Telegram",
    draw: (c, s) => {
      const g = c.createLinearGradient(0, 0, 0, s);
      g.addColorStop(0, "#2aabee");
      g.addColorStop(1, "#229ed9");
      c.fillStyle = g;
      c.beginPath();
      c.arc(s / 2, s / 2, s * 0.47, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = "#ffffff";
      c.beginPath();
      c.moveTo(s * 0.24, s * 0.49);
      c.lineTo(s * 0.73, s * 0.3);
      c.lineTo(s * 0.64, s * 0.72);
      c.lineTo(s * 0.48, s * 0.6);
      c.lineTo(s * 0.4, s * 0.68);
      c.lineTo(s * 0.4, s * 0.56);
      c.closePath();
      c.fill();
    },
  },
  {
    name: "Spotify",
    draw: (c, s) => {
      c.fillStyle = "#1ed760";
      c.beginPath();
      c.arc(s / 2, s / 2, s * 0.47, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = "#121212";
      c.lineCap = "round";
      [0.36, 0.5, 0.63].forEach((y, i) => {
        c.lineWidth = s * (0.085 - i * 0.012);
        c.beginPath();
        c.moveTo(s * (0.25 + i * 0.03), s * y);
        c.quadraticCurveTo(s * 0.5, s * (y - 0.08), s * (0.75 - i * 0.04), s * (y + 0.04));
        c.stroke();
      });
    },
  },
  {
    name: "GitHub",
    draw: (c, s) => {
      c.fillStyle = "#1f2328";
      c.beginPath();
      c.arc(s / 2, s / 2, s * 0.47, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = "#ffffff";
      c.beginPath();
      c.arc(s / 2, s * 0.47, s * 0.21, 0, Math.PI * 2);
      c.moveTo(s * 0.3, s * 0.37);
      c.lineTo(s * 0.33, s * 0.18);
      c.lineTo(s * 0.45, s * 0.3);
      c.moveTo(s * 0.7, s * 0.37);
      c.lineTo(s * 0.67, s * 0.18);
      c.lineTo(s * 0.55, s * 0.3);
      c.fill();
      c.fillRect(s * 0.42, s * 0.62, s * 0.16, s * 0.28);
    },
  },
  {
    name: "Wikipedia",
    draw: (c, s) => {
      c.fillStyle = "#ffffff";
      c.fillRect(0, 0, s, s);
      c.fillStyle = "#202122";
      c.font = `700 ${Math.round(s * 0.72)}px Georgia, "Times New Roman", serif`;
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.fillText("W", s / 2, s * 0.55);
    },
  },
];

type Rendered = { name: string; before: string; after: string | null };

/** Preview of the extension's favicon recolour — the very same functions the content script runs. */
export default function FaviconPreview() {
  const { settings, dark } = useSettingsCtx();
  const { lang } = useI18n();
  const ru = lang.startsWith("ru");
  const theme = settings.faviconTheme;
  const [items, setItems] = useState<Rendered[]>([]);

  useEffect(() => {
    // Wait a beat so freshly applied palette variables are in the computed style.
    const id = window.setTimeout(() => {
      const resolved = resolveFaviconTheme(theme);
      setItems(
        SAMPLES.map((sample) => {
          const canvas = document.createElement("canvas");
          canvas.width = canvas.height = 64;
          const ctx = canvas.getContext("2d");
          if (ctx) sample.draw(ctx, 64);
          const before = canvas.toDataURL("image/png");
          const after = theme.mode === "original" ? before : themeFaviconImage(canvas, resolved.palette, theme.mode, recolorFavicon);
          return { name: sample.name, before, after };
        }),
      );
    }, 60);
    return () => window.clearTimeout(id);
  }, [theme, dark, settings.colorSource, settings.presetId, settings.customColor, settings.schemeVariant, settings.contrast, settings.wallpaperColorIndex]);

  return (
    <div className="grid grid-cols-2 gap-2.5 p-4 sm:grid-cols-3">
      {items.map((item) => (
        <div key={item.name} className="flex flex-col items-center gap-2 rounded-[20px] bg-[var(--surface-container)] px-2 py-3">
          <div className="flex items-center gap-2.5">
            <img src={item.before} alt="" className="h-7 w-7 opacity-70" />
            <ArrowRight size={13} className="text-[var(--muted)] rtl:rotate-180" aria-hidden="true" />
            <img src={item.after ?? item.before} alt="" className={cn("h-11 w-11 drop-shadow-sm", !item.after && "opacity-40")} data-favicon-preview={item.name} />
          </div>
          <span className="text-[11px] font-medium text-[var(--muted)]">{item.name}</span>
        </div>
      ))}
      {!items.length && <p className="col-span-full py-6 text-center text-sm text-[var(--muted)]">{ru ? "Готовим предпросмотр…" : "Preparing the preview…"}</p>}
    </div>
  );
}
