import { useState, useRef } from "react";
import { Image as ImageIcon, Upload, X, Globe, Sparkles } from "lucide-react";
import { normalizeUrl, type Bookmark, type BookmarkShape, BOOKMARK_SHAPES } from "../lib/settings";
import { BookmarkIcon, getBookmarkShapeClass } from "./BookmarkIcon";
import { BUTTON, BUTTON_PRIMARY, CARD, INPUT } from "./ui";
import { useI18n } from "../lib/i18n";
import { cn } from "../utils/cn";

type Props = {
  initialBookmark?: Bookmark | null;
  defaultShape?: BookmarkShape;
  onSave: (data: { title: string; url: string; customIcon?: string; shape?: BookmarkShape }) => void;
  onClose: () => void;
};

export default function BookmarkDialog({ initialBookmark, defaultShape = "circle", onSave, onClose }: Props) {
  const { t, lang } = useI18n();
  const isRu = lang === "ru";

  const [title, setTitle] = useState(initialBookmark?.title ?? "");
  const [url, setUrl] = useState(initialBookmark?.url ?? "");
  const [customIcon, setCustomIcon] = useState<string | undefined>(initialBookmark?.customIcon);
  const [shape, setShape] = useState<BookmarkShape>(initialBookmark?.shape || defaultShape);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result;
      if (typeof result === "string") {
        setCustomIcon(result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUrl = url.trim();
    if (!cleanUrl) return;
    const cleanTitle = title.trim() || cleanUrl.replace(/^https?:\/\//i, "").replace(/^www\./i, "").split("/")[0];
    onSave({
      title: cleanTitle,
      url: normalizeUrl(cleanUrl),
      customIcon: customIcon?.trim() ? customIcon : undefined,
      shape,
    });
    onClose();
  };

  // Preview dummy bookmark
  const previewBookmark: Bookmark = {
    id: "preview",
    title: title || (isRu ? "Пример" : "Preview"),
    url: url || "https://example.com",
    customIcon,
    shape,
  };

  const shapeLabels: Record<BookmarkShape, { ru: string; en: string }> = {
    circle: { ru: "Круг", en: "Circle" },
    squircle: { ru: "Сквиркл", en: "Squircle" },
    rounded: { ru: "Квадрат", en: "Rounded" },
    teardrop: { ru: "Капля", en: "Teardrop" },
    pebble: { ru: "Галька", en: "Pebble" },
    flower: { ru: "Цветок", en: "Flower" },
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="flex w-full max-w-md flex-col gap-4 rounded-[28px] border border-[var(--line)] bg-[var(--surface)] p-6 shadow-2xl transition-all"
      >
        <div className="flex items-center justify-between pb-1 border-b border-[var(--line)]">
          <h2 className="type-display text-lg font-bold text-[var(--fg)]">
            {initialBookmark
              ? (isRu ? "Редактировать закладку" : "Edit Bookmark")
              : (isRu ? "Новая закладка" : t("bookmarks.new"))}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-[var(--muted)] hover:bg-[var(--surface-container-high)] hover:text-[var(--fg)] transition"
          >
            <X size={17} />
          </button>
        </div>

        {/* Live Icon Preview & Custom Picture Upload */}
        <div className="flex items-center gap-4 rounded-2xl bg-[var(--surface-container-high)] p-3.5 border border-[var(--line)]/60">
          <BookmarkIcon
            bookmark={previewBookmark}
            size={56}
            className="ring-2 ring-[var(--line)] shadow-md"
          />

          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="text-xs font-semibold text-[var(--fg)]">
              {isRu ? "Иконка и форма" : "Icon & Material Shape"}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 rounded-full bg-[var(--surface-container-highest)] px-3 py-1 text-xs font-medium text-[var(--fg)] hover:bg-[var(--primary)] hover:text-[var(--on-primary)] transition active:scale-95 shadow-xs"
              >
                <Upload size={12} />
                <span>{isRu ? "Загрузить фото" : "Upload image"}</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              {customIcon && (
                <button
                  type="button"
                  onClick={() => setCustomIcon(undefined)}
                  className="rounded-full p-1 text-xs text-[var(--muted)] hover:text-red-400 transition"
                  title={isRu ? "Сбросить картинку" : "Reset image"}
                >
                  <X size={14} />
                </button>
              )}
            </div>
            <p className="text-[10px] text-[var(--muted)] truncate">
              {customIcon ? (isRu ? "Пользовательское изображение" : "Custom image active") : (isRu ? "Автоматический favicon сайта" : "Default site favicon")}
            </p>
          </div>
        </div>

        {/* Custom Picture URL Input (Optional) */}
        <div>
          <label className="block text-[11px] font-medium text-[var(--muted)] mb-1 px-1">
            {isRu ? "Ссылка на картинку (опционально):" : "Custom image URL (optional):"}
          </label>
          <input
            type="url"
            value={customIcon?.startsWith("data:") ? "" : (customIcon || "")}
            onChange={(e) => setCustomIcon(e.target.value.trim() || undefined)}
            placeholder="https://.../icon.png"
            className={cn(INPUT, "h-10 text-xs")}
          />
        </div>

        {/* Material Shape Selector */}
        <div>
          <label className="block text-[11px] font-medium text-[var(--muted)] mb-1.5 px-1">
            {isRu ? "Форма значка (Material 3):" : "Icon Shape (Material 3):"}
          </label>
          <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6">
            {BOOKMARK_SHAPES.map((s) => {
              const active = shape === s;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setShape(s)}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-xl p-2 transition text-center",
                    active
                      ? "bg-[var(--primary)] text-[var(--on-primary)] shadow-sm font-semibold"
                      : "bg-[var(--surface-container-high)] text-[var(--muted)] hover:bg-[var(--surface-container-highest)] hover:text-[var(--fg)]"
                  )}
                >
                  <div
                    className={cn(
                      "h-5 w-5 border-2 transition",
                      getBookmarkShapeClass(s),
                      active ? "border-[var(--on-primary)] bg-[var(--on-primary)]/20" : "border-[var(--muted)]"
                    )}
                  />
                  <span className="text-[10px] truncate w-full">{isRu ? shapeLabels[s].ru : shapeLabels[s].en}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Title and URL Inputs */}
        <div className="space-y-2.5 pt-1">
          <div>
            <label className="block text-[11px] font-medium text-[var(--muted)] mb-1 px-1">
              {isRu ? "Название закладки:" : t("bookmarks.name")}
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={isRu ? "Например, YouTube" : t("bookmarks.name")}
              className={cn(INPUT, "h-11")}
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-[var(--muted)] mb-1 px-1">
              {isRu ? "Адрес веб-сайта:" : "Website URL:"}
            </label>
            <input
              autoFocus={!initialBookmark}
              dir="ltr"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="example.com"
              className={cn(INPUT, "h-11")}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-2 flex justify-end gap-2 pt-2 border-t border-[var(--line)]">
          <button
            type="button"
            onClick={onClose}
            className="h-11 rounded-full px-5 text-sm font-medium transition hover:bg-[var(--surface-container-high)]"
          >
            {t("common.cancel")}
          </button>
          <button
            type="submit"
            className={cn(BUTTON_PRIMARY, "h-11 px-6 text-sm shadow-md")}
          >
            {initialBookmark ? (isRu ? "Сохранить" : "Save") : (isRu ? "Добавить" : t("bookmarks.add"))}
          </button>
        </div>
      </form>
    </div>
  );
}
