import { Check, Info, type LucideIcon } from "lucide-react";
import { useId } from "react";
import type { ReactNode } from "react";
import { cn } from "../utils/cn";

export type Choice<T extends string> = {
  value: T;
  label: string;
  description?: string;
  icon?: LucideIcon;
  /** Trailing element, e.g. a font specimen. */
  preview?: ReactNode;
  disabled?: boolean;
  badge?: string;
};

export const CARD = "overflow-hidden rounded-[24px] bg-[var(--surface)]";
export const INPUT =
  "h-14 w-full rounded-2xl bg-[var(--surface-container-high)] px-5 text-[var(--fg)] outline-none transition focus:bg-[var(--surface-container-highest)] placeholder:text-[var(--muted)]";
export const BUTTON =
  "inline-flex h-10 shrink-0 items-center gap-2 rounded-full bg-[var(--surface-container-high)] px-4 text-sm font-medium transition-all duration-300 hover:rounded-[14px] hover:bg-[var(--surface-container-highest)] disabled:cursor-not-allowed disabled:opacity-40";
export const BUTTON_PRIMARY =
  "inline-flex h-10 shrink-0 items-center gap-2 rounded-full bg-[var(--primary)] px-4 text-sm font-semibold text-[var(--on-primary)] transition-all duration-300 hover:rounded-[14px] disabled:cursor-not-allowed disabled:opacity-40";

export function ChoiceList<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: Choice<T>[];
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cn(CARD, "divide-y divide-[var(--line)]")}>
      {options.map(({ value: optionValue, label: optionLabel, description, icon: Icon, preview, disabled, badge }) => {
        const selected = optionValue === value;
        return (
          <button
            key={optionValue}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onChange(optionValue)}
            className={cn(
              "flex min-h-16 w-full items-center gap-4 px-4 py-3 text-start transition sm:px-5",
              disabled ? "cursor-not-allowed opacity-50" : "hover:bg-[var(--surface-container-high)]",
            )}
          >
            {Icon && (
              <span
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center transition-all duration-300",
                  selected ? "rounded-[12px] bg-[var(--primary)] text-[var(--on-primary)]" : "rounded-full bg-[var(--surface-container-high)]",
                )}
              >
                <Icon size={18} strokeWidth={1.9} aria-hidden="true" />
              </span>
            )}
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-2 font-medium">
                {optionLabel}
                {badge && (
                  <span className="rounded-full bg-[var(--surface-container-highest)] px-2 py-0.5 text-[11px] font-medium text-[var(--muted)]">{badge}</span>
                )}
              </span>
              {description && <span className="mt-0.5 block text-sm leading-5 text-[var(--muted)]">{description}</span>}
            </span>
            {preview && <span className="shrink-0">{preview}</span>}
            <span className="flex w-6 shrink-0 justify-center">{selected && <Check size={20} strokeWidth={2.2} aria-hidden="true" />}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Compact pill picker; the selected pill morphs into a rounded square (M3 Expressive). */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
  disabled = false,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <div role="radiogroup" aria-label={label} aria-disabled={disabled || undefined} className={cn("flex flex-wrap gap-1.5", disabled && "opacity-50")}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={cn(
              "h-9 rounded-full px-3.5 text-sm transition-all duration-300 disabled:cursor-not-allowed",
              selected
                ? "rounded-[12px] bg-[var(--primary)] font-medium text-[var(--on-primary)]"
                : "bg-[var(--surface-container-high)] hover:bg-[var(--surface-container-highest)]",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function FieldRow({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="px-5 py-4">
      <div className="mb-2.5 text-sm font-medium">{label}</div>
      {children}
      {hint && <p className="mt-2 text-xs text-[var(--muted)]">{hint}</p>}
    </div>
  );
}

export function SliderRow({
  label,
  value,
  min,
  max,
  step = 1,
  unit = "",
  disabled = false,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  disabled?: boolean;
  onChange: (value: number) => void;
}) {
  const id = useId();
  return (
    <div className={cn("flex items-center gap-4 px-5 py-4 sm:gap-5", disabled && "opacity-50")}>
      <label htmlFor={id} className="w-28 shrink-0 text-sm font-medium sm:w-40">
        {label}
      </label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
        className="range min-w-0 flex-1"
      />
      <span className="w-16 shrink-0 text-end text-sm tabular-nums text-[var(--muted)]">
        {value}
        {unit}
      </span>
    </div>
  );
}

export function ToggleRow({
  title,
  description,
  checked,
  onChange,
  disabled = false,
}: {
  title: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "flex w-full items-center justify-between gap-5 px-5 py-4 text-start transition",
        disabled ? "cursor-not-allowed opacity-50" : "hover:bg-[var(--surface-container-high)]",
      )}
    >
      <span>
        <span className="block font-medium">{title}</span>
        {description && <span className="mt-1 block max-w-lg text-sm leading-5 text-[var(--muted)]">{description}</span>}
      </span>
      <span
        className={cn(
          "relative h-7 w-12 shrink-0 rounded-full transition-colors",
          checked ? "bg-[var(--primary)]" : "bg-[var(--surface-container-highest)]",
        )}
      >
        <span
          className={cn(
            "absolute top-1 h-5 w-5 rounded-full transition-all duration-300",
            checked ? "start-6 bg-[var(--on-primary)]" : "start-1 bg-[var(--surface)]",
          )}
        />
      </span>
    </button>
  );
}

export function SettingsGroup({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section>
      <div className="mb-3 flex items-end justify-between gap-4">
        <div>
          <h2 className="type-display text-lg font-semibold">{title}</h2>
          {description && <p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--muted)]">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Notice({ icon: Icon = Info, children, action }: { icon?: LucideIcon; children: ReactNode; action?: ReactNode }) {
  return (
    <div role="status" className="flex gap-3 rounded-[20px] bg-[var(--secondary-container)] px-4 py-3.5 text-sm leading-6 text-[var(--on-secondary-container)]">
      <Icon size={18} className="mt-1 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        {children}
        {action && <div className="mt-3">{action}</div>}
      </div>
    </div>
  );
}

export function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="shrink-0 rounded-full bg-[var(--secondary-container)] px-3 py-1 text-xs font-medium text-[var(--on-secondary-container)]">
      {children}
    </span>
  );
}

/** Round colour swatch (primary / secondary / tertiary) like the Material You wallpaper picker. */
export function Swatch({ colors, selected, label, onClick }: { colors: string[]; selected: boolean; label?: string; onClick: () => void }) {
  const [a, b = a, c = b] = colors;
  return (
    <button type="button" onClick={onClick} aria-pressed={selected} title={label} className="group flex w-16 flex-col items-center gap-2 text-center">
      <span
        className={cn(
          "flex h-14 w-14 items-center justify-center transition-all duration-300",
          selected ? "rounded-[18px] ring-2 ring-[var(--fg)] ring-offset-2 ring-offset-[var(--surface)]" : "rounded-full group-hover:scale-105",
        )}
        style={{ background: `conic-gradient(from -90deg, ${a} 0 50%, ${c} 0 75%, ${b} 0)` }}
      >
        {selected && <Check size={20} strokeWidth={2.6} className="text-white drop-shadow-[0_1px_2px_rgb(0_0_0/0.6)]" aria-hidden="true" />}
      </span>
      {label && <span className="w-full truncate text-xs">{label}</span>}
    </button>
  );
}
