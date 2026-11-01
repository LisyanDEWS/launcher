import { RotateCcw } from "lucide-react";
import LivePreview from "./LivePreview";
import { useSettingsCtx } from "./context";
import SearchBox from "../SearchBox";
import { BUTTON, Badge, CARD, FieldRow, INPUT, Segmented, SettingsGroup, SliderRow, ToggleRow } from "../ui";
import { useI18n } from "../../lib/i18n";
import {
  DEFAULT_SEARCH_STYLE,
  SB_ALIGNS,
  SB_BORDER_COLORS,
  SB_ICONS,
  SB_RINGS,
  SB_SHADOWS,
  SEARCH_PRESET_IDS,
  SEARCH_STYLE_SCHEMA as S,
  applySearchPreset,
  limits,
  type SearchStyle,
} from "../../lib/settings";
import { cn } from "../../utils/cn";

/** Scaled-down copy of a style for the preset cards. */
function thumbnail(style: SearchStyle): SearchStyle {
  const k = 0.62;
  return {
    ...style,
    height: Math.round(style.height * k),
    radius: Math.round(style.radius * k),
    focusRadius: Math.round(style.focusRadius * k),
    fontSize: Math.max(11, Math.round(style.fontSize * 0.7)),
    borderWidth: Math.min(style.borderWidth, 2),
    shadow: style.shadow === "strong" ? "medium" : style.shadow,
  };
}

export default function SearchBoxSection() {
  const { settings, update, updateStyle } = useSettingsCtx();
  const { t } = useI18n();
  const s = settings.searchStyle;
  const set =
    <K extends keyof SearchStyle>(key: K) =>
    (value: SearchStyle[K]) => {
      const patch: Partial<SearchStyle> = {};
      patch[key] = value;
      updateStyle(patch);
    };
  const card = cn(CARD, "divide-y divide-[var(--line)]");
  const surfaceFill = s.fill === "filled" || s.fill === "glass" || s.fill === "outlined";

  return (
    <div className="space-y-8">
      <LivePreview />

      <SettingsGroup
        title={t("sb.presets")}
        description={t("sb.presetsDesc")}
        action={s.preset === "custom" ? <Badge>{t("sb.custom")}</Badge> : undefined}
      >
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {SEARCH_PRESET_IDS.map((id) => {
            const preset = applySearchPreset(s, id);
            const selected = s.preset === id;
            return (
              <button
                key={id}
                type="button"
                aria-pressed={selected}
                onClick={() => update({ searchStyle: preset })}
                className={cn(
                  "rounded-[22px] p-2.5 text-start transition-all duration-300",
                  selected
                    ? "rounded-[16px] bg-[var(--secondary-container)] text-[var(--on-secondary-container)]"
                    : "bg-[var(--surface)] hover:bg-[var(--surface-container-high)]",
                )}
              >
                <div className="pointer-events-none flex h-[76px] items-center rounded-[14px] bg-[var(--bg)] px-2.5" aria-hidden="true">
                  <SearchBox compact style={thumbnail(preset)} anim={settings.textAnim} placeholder={t("search.button")} submitLabel={t("search.button")} />
                </div>
                <span className="mt-2 block px-1 text-sm font-medium">{t(`sb.p.${id}`)}</span>
              </button>
            );
          })}
        </div>
      </SettingsGroup>

      <SettingsGroup title={t("sb.shape")}>
        <div className={card}>
          <SliderRow label={t("sb.width")} value={s.width} {...limits(S.width)} unit=" px" onChange={set("width")} />
          <SliderRow label={t("sb.height")} value={s.height} {...limits(S.height)} unit=" px" onChange={set("height")} />
          <SliderRow label={t("sb.radius")} value={s.radius} {...limits(S.radius)} unit=" px" onChange={set("radius")} />
          <SliderRow label={t("sb.focusRadius")} value={s.focusRadius} {...limits(S.focusRadius)} unit=" px" onChange={set("focusRadius")} />
          <SliderRow label={t("sb.focusScale")} value={s.focusScale} {...limits(S.focusScale)} unit="%" onChange={set("focusScale")} />
        </div>
      </SettingsGroup>

      <SettingsGroup title={t("sb.surface")}>
        <div className={card}>
          <FieldRow label={t("sb.fill")}>
            <Segmented
              label={t("sb.fill")}
              value={s.fill}
              onChange={set("fill")}
              options={[
                { value: "filled", label: t("sb.filled") },
                { value: "outlined", label: t("sb.fill.outlined") },
                { value: "glass", label: t("sb.fill.glass") },
                { value: "underline", label: t("sb.fill.underline") },
                { value: "transparent", label: t("common.none") },
              ]}
            />
          </FieldRow>
          <SliderRow label={t("sb.opacity")} value={s.opacity} {...limits(S.opacity)} unit="%" disabled={!surfaceFill} onChange={set("opacity")} />
          <SliderRow
            label={t("sb.blur")}
            value={s.blur}
            {...limits(S.blur)}
            unit=" px"
            disabled={s.fill !== "glass" && s.fill !== "filled"}
            onChange={set("blur")}
          />
          <SliderRow label={t("sb.borderWidth")} value={s.borderWidth} {...limits(S.borderWidth)} unit=" px" onChange={set("borderWidth")} />
          <FieldRow label={t("sb.borderColor")}>
            <Segmented
              label={t("sb.borderColor")}
              value={s.borderColor}
              onChange={set("borderColor")}
              options={SB_BORDER_COLORS.map((value) => ({ value, label: t(`sb.color.${value}`) }))}
            />
          </FieldRow>
          <FieldRow label={t("sb.shadow")}>
            <Segmented
              label={t("sb.shadow")}
              value={s.shadow}
              onChange={set("shadow")}
              options={SB_SHADOWS.map((value) => ({ value, label: value === "none" ? t("common.none") : t(`sb.shadow.${value}`) }))}
            />
          </FieldRow>
          <FieldRow label={t("sb.focusRing")}>
            <Segmented
              label={t("sb.focusRing")}
              value={s.focusRing}
              onChange={set("focusRing")}
              options={SB_RINGS.map((value) => ({ value, label: value === "none" ? t("common.none") : t(`sb.ring.${value}`) }))}
            />
          </FieldRow>
        </div>
      </SettingsGroup>

      <SettingsGroup title={t("sb.content")}>
        <div className={card}>
          <SliderRow label={t("sb.fontSize")} value={s.fontSize} {...limits(S.fontSize)} unit=" px" onChange={set("fontSize")} />
          <SliderRow label={t("sb.fontWeight")} value={s.fontWeight} {...limits(S.fontWeight)} onChange={set("fontWeight")} />
          <FieldRow label={t("sb.align")}>
            <Segmented label={t("sb.align")} value={s.align} onChange={set("align")} options={SB_ALIGNS.map((value) => ({ value, label: t(`sb.align.${value}`) }))} />
          </FieldRow>
          <FieldRow label={t("sb.icon")}>
            <Segmented
              label={t("sb.icon")}
              value={s.icon}
              onChange={set("icon")}
              options={SB_ICONS.map((value) => ({ value, label: value === "none" ? t("common.none") : t(`sb.icon.${value}`) }))}
            />
          </FieldRow>
          <FieldRow label={t("sb.button")}>
            <Segmented
              label={t("sb.button")}
              value={s.button}
              onChange={set("button")}
              options={[
                { value: "filled", label: t("sb.filled") },
                { value: "tonal", label: t("sb.button.tonal") },
                { value: "icon", label: t("sb.button.icon") },
                { value: "none", label: t("sb.button.none") },
              ]}
            />
          </FieldRow>
          <FieldRow label={t("sb.placeholder")} hint={t("sb.placeholderHint")}>
            <input
              value={s.placeholder}
              maxLength={80}
              onChange={(event) => set("placeholder")(event.target.value)}
              placeholder={t("search.placeholder")}
              aria-label={t("sb.placeholder")}
              className={INPUT}
            />
          </FieldRow>
        </div>
      </SettingsGroup>

      <SettingsGroup title={t("sb.layout")}>
        <div className={card}>
          <SliderRow label={t("sb.offsetTop")} value={s.offsetTop} {...limits(S.offsetTop)} unit=" vh" onChange={set("offsetTop")} />
        </div>
      </SettingsGroup>

      <SettingsGroup title={t("sb.aiButton")} description={t("sb.aiButtonDesc")}>
        <div className={card}>
          <ToggleRow
            title={t("sb.aiButton")}
            description={t("sb.aiButtonDesc")}
            checked={s.aiButton}
            onChange={set("aiButton")}
          />
          {s.aiButton && (
            <>
              <SliderRow
                label={t("sb.aiButtonSize")}
                value={s.aiButtonSize}
                min={24}
                max={48}
                step={2}
                unit=" px"
                onChange={set("aiButtonSize")}
              />
              <FieldRow label={t("sb.aiButtonStyle")}>
                <Segmented
                  label={t("sb.aiButtonStyle")}
                  value={s.aiButtonStyle}
                  onChange={set("aiButtonStyle")}
                  options={[
                    { value: "accent", label: "Accent" },
                    { value: "tonal", label: "Tonal" },
                    { value: "glow", label: "Glow" },
                    { value: "minimal", label: "Minimal" },
                  ]}
                />
              </FieldRow>
              <FieldRow label={t("sb.aiButtonIcon")}>
                <Segmented
                  label={t("sb.aiButtonIcon")}
                  value={s.aiButtonIcon}
                  onChange={set("aiButtonIcon")}
                  options={[
                    { value: "sparkles", label: "Sparkles" },
                    { value: "bot", label: "Bot" },
                    { value: "brain", label: "Brain" },
                    { value: "zap", label: "Zap" },
                  ]}
                />
              </FieldRow>
              <FieldRow label={t("sb.aiButtonUrl")}>
                <input
                  value={s.aiButtonUrl}
                  onChange={(e) => set("aiButtonUrl")(e.target.value)}
                  placeholder="https://www.google.com/search?q={q}&udm=50"
                  className={INPUT}
                />
              </FieldRow>
            </>
          )}
        </div>
      </SettingsGroup>

      <div className="flex justify-end">
        <button type="button" onClick={() => update({ searchStyle: { ...DEFAULT_SEARCH_STYLE } })} className={BUTTON}>
          <RotateCcw size={16} aria-hidden="true" />
          {t("common.reset")}
        </button>
      </div>
    </div>
  );
}
