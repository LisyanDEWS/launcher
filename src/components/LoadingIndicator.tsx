import { useEffect, useRef } from "react";
import { useFontTheme } from "../lib/font-theme";
import { useI18n } from "../lib/i18n";

export type IndicatorVariant = "m3" | "matrix";

/**
 * LoadingIndicator — React port of the M3 Expressive component.
 * Props mirror the Android attributes:
 *  indicatorColor, containerColor, indicatorSize (38), containerWidth/Height (48), contained.
 *
 * Two looks:
 *  • "m3"     — morphing expressive shapes (M3 Expressive font theme);
 *  • "matrix" — 5×5 LED "compile" animation: each column fills bottom-up, then all release
 *               together (NotMatrix font theme).
 */
type Props = {
  indicatorColor?: string;
  containerColor?: string;
  indicatorSize?: number;
  containerWidth?: number;
  containerHeight?: number;
  contained?: boolean;
  contentDescription?: string;
  className?: string;
  /** Force a look regardless of the active font theme. */
  variant?: IndicatorVariant;
};

/* ---------- M3 morphing glyph ---------- */

// Shapes as polar functions r(θ) = 1 + a·cos(n·θ)
const SHAPES = [
  { n: 10, a: 0.09 },
  { n: 9, a: 0.11 },
  { n: 5, a: 0.13 },
  { n: 2, a: 0.22 },
  { n: 8, a: 0.07 },
  { n: 4, a: 0.12 },
];
const N = 144;
const MORPH = 650;
const HOLD = 150;
const RADIUS = 0.5 / 1.25;

const radii = (s: { n: number; a: number }) => Array.from({ length: N }, (_, i) => 1 + s.a * Math.cos(s.n * ((i / N) * Math.PI * 2)));

// spring-ish ease with a small overshoot
const ease = (t: number) => {
  const c = 1.4;
  return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
};

const TABLES = SHAPES.map(radii);

function morphPath(idx: number, k: number, rotationDeg: number) {
  const len = TABLES.length;
  if (!len) return "";
  const safeIdx = Math.max(0, Math.floor(Number.isFinite(idx) ? idx : 0));
  const aIdx = ((safeIdx % len) + len) % len;
  const bIdx = (((safeIdx + 1) % len) + len) % len;
  const A = TABLES[aIdx] ?? TABLES[0];
  const B = TABLES[bIdx] ?? TABLES[0];
  if (!A || !B) return "";

  const progress = Number.isFinite(k) ? k : 0;
  let d = "";
  for (let i = 0; i < N; i++) {
    const th = (i / N) * Math.PI * 2 + (rotationDeg * Math.PI) / 180;
    const aVal = A[i] ?? 1;
    const bVal = B[i] ?? 1;
    const r = (aVal + (bVal - aVal) * progress) * RADIUS;
    d += (i ? "L" : "M") + (0.5 + r * Math.cos(th)).toFixed(4) + " " + (0.5 + r * Math.sin(th)).toFixed(4);
  }
  return d + "Z";
}

function MorphGlyph({ size, color }: { size: number; color: string }) {
  const pathRef = useRef<SVGPathElement>(null);

  useEffect(() => {
    const path = pathRef.current;
    if (!path) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      path.setAttribute("d", morphPath(0, 0, 0));
      return;
    }
    let raf = 0;
    const start = performance.now();
    const step = MORPH + HOLD;
    const frame = (now: number) => {
      const el = Math.max(0, now - start);
      const idx = Math.floor(el / step);
      const k = ease(Math.min(1, (el % step) / MORPH));
      const rot = (el / 1000) * 120 + (idx + k) * 90;
      path.setAttribute("d", morphPath(idx, k, rot));
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <svg width={size} height={size} viewBox="0 0 1 1" aria-hidden="true">
      <path ref={pathRef} fill={color} />
    </svg>
  );
}

/* ---------- LED dot-matrix glyph ---------- */

const GRID = [6, 17, 28, 39, 50]; // dot centres in a 56×56 box
const COLUMN_STEP_MS = 96;
const ROW_STEP_MS = 240;

function DotMatrixGlyph({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" style={{ color }} aria-hidden="true">
      {GRID.map((y, row) =>
        GRID.map((x, col) => (
          <g key={`${row}-${col}`}>
            <circle cx={x} cy={y} r={2.4} fill="currentColor" opacity={0.07} />
            <circle
              className="dm-dot"
              cx={x}
              cy={y}
              r={3.1}
              fill="currentColor"
              style={{ animationDelay: `${(GRID.length - 1 - row) * ROW_STEP_MS + col * COLUMN_STEP_MS}ms` }}
            />
          </g>
        )),
      )}
    </svg>
  );
}

/* ---------- Public component ---------- */

export default function LoadingIndicator({
  indicatorColor = "var(--primary)",
  containerColor,
  indicatorSize = 38,
  containerWidth = 48,
  containerHeight = 48,
  contained = false,
  contentDescription,
  className = "",
  variant,
}: Props) {
  const fontTheme = useFontTheme();
  const { t } = useI18n();
  const kind: IndicatorVariant = variant ?? (fontTheme === "matrix" ? "matrix" : "m3");

  return (
    <div
      role="progressbar"
      aria-label={contentDescription ?? t("common.loading")}
      className={"inline-flex shrink-0 items-center justify-center " + className}
      style={{
        width: containerWidth,
        height: containerHeight,
        // M3 container is a circle; the LED panel gets a rounded square.
        borderRadius: kind === "matrix" ? "26%" : 9999,
        background: contained ? (containerColor ?? "var(--surface-container-high)") : (containerColor ?? "transparent"),
      }}
    >
      {kind === "matrix" ? <DotMatrixGlyph size={indicatorSize} color={indicatorColor} /> : <MorphGlyph size={indicatorSize} color={indicatorColor} />}
    </div>
  );
}
