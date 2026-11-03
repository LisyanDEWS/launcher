import { useMemo } from "react";
import AppMenuEditor from "./AppMenuEditor";
import { useSettingsCtx } from "./context";
import MenuPreview from "../MenuPreview";
import { SettingsGroup } from "../ui";
import { menuItems } from "../../lib/apps";
import { useI18n } from "../../lib/i18n";
import type { AppMenuSettings } from "../../lib/settings";

/** Settings → App menu: a live preview of the drawer and the same editor that lives inside it. */
export function AppMenuSection() {
  const { settings, setSettings } = useSettingsCtx();
  const { lang } = useI18n();
  const ru = lang.startsWith("ru");
  const menu = settings.appMenu;
  const items = useMemo(() => menuItems(menu, lang), [menu, lang]);
  const onChange = (patch: Partial<AppMenuSettings>) => setSettings((s) => ({ ...s, appMenu: { ...s.appMenu, ...patch } }));

  return (
    <div className="space-y-8">
      <SettingsGroup title={ru ? "Предпросмотр" : "Preview"} description={ru ? "Так выглядит меню по кнопке с девятью точками." : "This is how the menu looks behind the 9-dot button."}>
        <div className="ap-preview">
          {items.length ? (
            <MenuPreview menu={menu} items={items} rows={2} />
          ) : (
            <p className="py-6 text-center text-sm text-[var(--muted)]">{ru ? "Меню пусто — выберите приложения ниже." : "The menu is empty — pick some apps below."}</p>
          )}
        </div>
      </SettingsGroup>

      <SettingsGroup title={ru ? "Настройка" : "Customize"}>
        <AppMenuEditor menu={menu} onChange={onChange} />
      </SettingsGroup>
    </div>
  );
}
