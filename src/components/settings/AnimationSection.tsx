import { RotateCcw } from "lucide-react";
import LivePreview from "./LivePreview";
import { useSettingsCtx } from "./context";
import { BUTTON, Badge, CARD, FieldRow, Notice, Segmented, SettingsGroup, SliderRow, ToggleRow } from "../ui";
import { useI18n } from "../../lib/i18n";
import {
  ANIM_PRESET_IDS,
  BLINKS,
  CARETS,
  DEFAULT_TEXT_ANIM,
  EASINGS,
  ENTER_EFFECTS,
  EXIT_EFFECTS,
  TEXT_ANIM_SCHEMA as A,
  applyAnimPreset,
  limits,
  type TextAnim,
} from "../../lib/settings";
import { cn } from "../../utils/cn";

export default function AnimationSection() {
  const { settings, update, updateAnim } = useSettingsCtx();
  const { t, lang } = useI18n();
  const isRu = lang === "ru";
  const a = settings.textAnim;
  const set =
    <K extends keyof TextAnim>(key: K) =>
    (value: TextAnim[K]) => {
      const patch: Partial<TextAnim> = {};
      patch[key] = value;
      updateAnim(patch);
    };
  const ms = ` ${t("unit.ms")}`;
  const card = cn(CARD, "divide-y divide-[var(--line)]");

  return (
    <div className="space-y-8">
      {/* UI System Animations & Physics */}
      <SettingsGroup
        title={isRu ? "Плавность анимаций интерфейса" : "UI Motion & Fluid Animations"}
        description={
          isRu
            ? "Управление физикой переходов, скоростью и мягкостью интерфейса"
            : "Control transition physics, responsiveness, and fluid curves"
        }
      >
        <div className={cn(CARD, "p-5 space-y-3")}>
          <Segmented
            label={isRu ? "Режим анимаций" : "Motion Physics"}
            value={settings.uiAnimation || "fluid"}
            onChange={(uiAnimation) => update({ uiAnimation: uiAnimation as any })}
            options={[
              { value: "fluid", label: isRu ? "Плавный M3" : "Fluid M3" },
              { value: "snappy", label: isRu ? "Быстрый" : "Snappy" },
              { value: "gentle", label: isRu ? "Мягкий" : "Gentle" },
              { value: "off", label: isRu ? "Откл." : "Off" },
            ]}
          />
          <p className="text-xs text-[var(--muted)] leading-relaxed">
            {settings.uiAnimation === "fluid" &&
              (isRu
                ? "Высокоскоростная пружинная физика Material 3 (320ms, cubic-bezier). Переходы и зум ощущаются живыми и упругими."
                : "Material 3 expressive spring physics (320ms, cubic-bezier). Fluid hover and layout transitions.")}
            {settings.uiAnimation === "snappy" &&
              (isRu
                ? "Быстрый отклик (160ms) с минимальной задержкой. Идеально для максимальной скорости работы."
                : "Fast response (160ms) with snappy curves. Ideal for high productivity.")}
            {settings.uiAnimation === "gentle" &&
              (isRu
                ? "Медленные, элегантные переходы (420ms) с мягким затуханием."
                : "Relaxed, elegant transitions (420ms) with soft deceleration.")}
            {settings.uiAnimation === "off" &&
              (isRu
                ? "Все анимации отключены. Мгновенное переключение без задержек."
                : "Reduced motion. Instant transitions with zero delay.")}
          </p>
        </div>
      </SettingsGroup>

      <LivePreview />

      <SettingsGroup title={t("an.presets")} action={a.preset === "custom" ? <Badge>{t("sb.custom")}</Badge> : undefined}>
        <div className={cn(CARD, "p-5")}>
          <Segmented
            label={t("an.presets")}
            value={a.preset}
            onChange={(id) => {
              if (id !== "custom") update({ textAnim: applyAnimPreset(a, id) });
            }}
            options={ANIM_PRESET_IDS.map((id) => ({ value: id, label: t(`an.p.${id}`) }))}
          />
        </div>
      </SettingsGroup>

      <div className={CARD}>
        <ToggleRow title={t("an.enabled")} description={t("an.enabledDesc")} checked={a.enabled} onChange={set("enabled")} />
      </div>

      <div className={cn("space-y-8 transition-opacity", !a.enabled && "pointer-events-none opacity-50")} aria-disabled={!a.enabled}>
        <SettingsGroup title={t("an.enter")}>
          <div className={cn(CARD, "p-5")}>
            <Segmented
              label={t("an.enter")}
              value={a.enter}
              onChange={set("enter")}
              options={ENTER_EFFECTS.map((value) => ({
                value,
                label: value === "none" ? t("common.none") : value === "fade" ? t("an.fade") : t(`an.e.${value}`),
              }))}
            />
          </div>
        </SettingsGroup>

        <SettingsGroup title={t("an.paste")}>
        <div className={card}>
          <ToggleRow title={t("an.paste")} description={t("an.pasteDesc")} checked={a.pasteAnim} onChange={set("pasteAnim")} />
          <ToggleRow title={t("an.select")} description={t("an.selectDesc")} checked={a.selectParticles} onChange={set("selectParticles")} />
        </div>
      </SettingsGroup>

      <SettingsGroup title={t("an.exit")}>
          <div className={cn(CARD, "p-5")}>
            <Segmented
              label={t("an.exit")}
              value={a.exit}
              onChange={set("exit")}
              options={EXIT_EFFECTS.map((value) => ({
                value,
                label: value === "none" ? t("common.none") : value === "fade" ? t("an.fade") : t(`an.x.${value}`),
              }))}
            />
          </div>
        </SettingsGroup>

        <SettingsGroup title={t("an.timing")}>
          <div className={card}>
            <SliderRow label={t("an.enterDuration")} value={a.enterDuration} {...limits(A.enterDuration)} unit={ms} onChange={set("enterDuration")} />
            <SliderRow label={t("an.exitDuration")} value={a.exitDuration} {...limits(A.exitDuration)} unit={ms} onChange={set("exitDuration")} />
            <SliderRow label={t("an.stagger")} value={a.stagger} {...limits(A.stagger)} unit={ms} onChange={set("stagger")} />
            <SliderRow label={t("an.intensity")} value={a.intensity} {...limits(A.intensity)} unit="%" onChange={set("intensity")} />
            <FieldRow label={t("an.easing")}>
              <Segmented label={t("an.easing")} value={a.easing} onChange={set("easing")} options={EASINGS.map((value) => ({ value, label: t(`an.ease.${value}`) }))} />
            </FieldRow>
            <ToggleRow title={t("an.highlight")} description={t("an.highlightDesc")} checked={a.highlight} onChange={set("highlight")} />
          </div>
        </SettingsGroup>

        <SettingsGroup title={t("an.caret")}>
          <div className={card}>
            <FieldRow label={t("an.caretStyle")}>
              <Segmented label={t("an.caretStyle")} value={a.caret} onChange={set("caret")} options={CARETS.map((value) => ({ value, label: t(`an.c.${value}`) }))} />
            </FieldRow>
            <ToggleRow title={t("an.caretSmooth")} description={t("an.caretSmoothDesc")} checked={a.caretSmooth} onChange={set("caretSmooth")} />
            <FieldRow label={t("an.caretBlink")}>
              <Segmented label={t("an.caretBlink")} value={a.caretBlink} onChange={set("caretBlink")} options={BLINKS.map((value) => ({ value, label: t(`an.b.${value}`) }))} />
            </FieldRow>
          </div>
        </SettingsGroup>

        <SettingsGroup title={t("an.typewriter")}>
          <div className={card}>
            <ToggleRow title={t("an.typewriter")} description={t("an.typewriterDesc")} checked={a.typewriter} onChange={set("typewriter")} />
            <SliderRow
              label={t("an.typewriterSpeed")}
              value={a.typewriterSpeed}
              {...limits(A.typewriterSpeed)}
              unit={ms}
              disabled={!a.typewriter}
              onChange={set("typewriterSpeed")}
            />
          </div>
        </SettingsGroup>
      </div>

      <Notice>{t("an.note")}</Notice>

      <div className="flex justify-end">
        <button type="button" onClick={() => update({ textAnim: { ...DEFAULT_TEXT_ANIM } })} className={BUTTON}>
          <RotateCcw size={16} aria-hidden="true" />
          {t("common.reset")}
        </button>
      </div>
    </div>
  );
}
