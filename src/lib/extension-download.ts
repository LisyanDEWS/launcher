import { buildExtensionFiles, buildZip, extensionFileName } from "./extension";
import type { Settings } from "./settings";

/** Builds and saves the Chrome package without pulling the whole developer screen into view. */
export async function downloadChromiumExtension(settings: Settings): Promise<void> {
  const files = await buildExtensionFiles(settings, "chromium");
  const blob = buildZip(files);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = extensionFileName("chromium");
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1200);
}
