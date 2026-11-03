import { useEffect } from "react";

/**
 * Draws the launcher's "L" mark on a canvas in the current Material palette and sets it as the
 * tab favicon — so the new-tab page in the extension is themed too.
 *
 * The palette is read from the CSS variables that App already writes to <html>, so the favicon
 * follows theme, colour source and wallpaper-derived palettes with no extra state.
 */
function currentVars() {
  const styles = getComputedStyle(document.documentElement);
  return {
    primary: styles.getPropertyValue("--primary").trim() || "#f5f5f7",
    onPrimary: styles.getPropertyValue("--on-primary").trim() || "#111113",
  };
}

function drawFavicon(size = 64): string {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) return "";
  const { primary, onPrimary } = currentVars();

  // Squircle-ish rounded square in the primary colour.
  const radius = size * 0.3;
  context.fillStyle = primary;
  context.beginPath();
  context.roundRect(0, 0, size, size, radius);
  context.fill();

  // The "L" mark in the on-primary colour.
  context.fillStyle = onPrimary;
  context.font = `900 ${Math.round(size * 0.62)}px "Roboto Flex", system-ui, sans-serif`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText("L", size / 2, size / 2 + size * 0.03);

  return canvas.toDataURL("image/png");
}

function setFavicon(href: string) {
  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }
  link.type = "image/png";
  link.href = href;

  // iOS Safari uses apple-touch-icon for the home-screen tile.
  let touch = document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]');
  if (!touch) {
    touch = document.createElement("link");
    touch.rel = "apple-touch-icon";
    document.head.appendChild(touch);
  }
  touch.href = href;
}

/**
 * Keeps the tab favicon in sync with the palette. Re-draws whenever the palette or theme changes
 * (the variables App writes onto <html> are observed directly) and on font load, so the "L" never
 * renders in a fallback font.
 */
export function useThemedFavicon(deps: unknown[]) {
  useEffect(() => {
    const update = () => setFavicon(drawFavicon());
    update();

    // Repaint whenever any colour variable changes on <html>.
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["style", "data-theme"] });

    // The mark is drawn with Roboto Flex — repaint once the webfont is actually in.
    if (document.fonts?.ready) void document.fonts.ready.then(update);

    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
