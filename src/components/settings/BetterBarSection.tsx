import { Eye, Sparkles } from "lucide-react";
import { useSettingsCtx } from "./context";
import { BUTTON, BUTTON_PRIMARY, CARD, Notice, SettingsGroup, ToggleRow } from "../ui";
import { BetterBarEditor } from "../widgets/editor";
import { useI18n } from "../../lib/i18n";
import { cn } from "../../utils/cn";

/**
 * Settings → Better Search Bar.
 *
 * The bar itself is edited here; it is also positionable on the home screen like any other element
 * (select it in the home editor and use the same controls).
 */
export default function BetterBarSection() {
  const { settings, setSettings, openHomeEditor } = useSettingsCtx();
  const { t, lang } = useI18n();
  const isRu = lang === "ru";
  const bar = settings.launcherLayout.betterBar;

  const patch = (next: Partial<typeof bar>) =>
    setSettings((s) => ({ ...s, launcherLayout: { ...s.launcherLayout, betterBar: { ...s.launcherLayout.betterBar, ...next } } }));

  return (
    <div className="space-y-8">
      <SettingsGroup title={t("better.title")} description={t("better.desc")}>
        <div className={cn(CARD, "p-4")}>
          <ToggleRow
            title={isRu ? "Показывать на главном экране" : "Show on the home screen"}
            description={isRu ? "Иначе панель остаётся доступной только в настройках" : "Otherwise the bar is only available here in settings"}
            checked={bar.visible}
            onChange={(visible) => patch({ visible })}
          />
          <div className="flex flex-wrap gap-2 border-t border-[var(--line)] p-4">
            <button type="button" onClick={openHomeEditor} className={BUTTON_PRIMARY}>
              <Sparkles size={15} aria-hidden="true" />
              {t("home.edit")}
            </button>
            {!bar.visible && (
              <button type="button" onClick={() => patch({ visible: true })} className={BUTTON}>
                <Eye size={15} aria-hidden="true" />
                {isRu ? "Включить" : "Turn on"}
              </button>
            )}
          </div>
        </div>
      </SettingsGroup>

      <SettingsGroup title={t("better.slots")} description={isRu ? "Два слота под строкой — туда можно поставить ИИ, инкогнито, виджет или иконку" : "The two slots under the bar — put AI, incognito, a widget or an icon there"}>
        <BetterBarEditor layout={bar} widgets={settings.widgets} onChange={patch} />
      </SettingsGroup>

      <Notice>{t("better.incognitoHint")}</Notice>
    </div>
  );
}
