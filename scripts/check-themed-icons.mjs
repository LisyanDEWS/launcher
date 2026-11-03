import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { DOMParser } from "@xmldom/xmldom";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = (await readdir(path.join(root, "src/assets/app-art"))).filter((name) => name.endsWith(".svg")).sort();
const generated = (await readdir(path.join(root, "src/assets/app-themed"))).filter((name) => name.endsWith(".svg")).sort();
assert.deepEqual(generated, source, "Every original icon must have a Material-painted counterpart");

let maskCount = 0;
for (const name of generated) {
  const markup = await readFile(path.join(root, "src/assets/app-themed", name), "utf8");
  const doc = new DOMParser().parseFromString(markup, "image/svg+xml");
  const svg = doc.documentElement;
  assert(svg.getAttribute("viewBox"), `${name}: missing viewBox`);
  assert(markup.includes("var(--ap-logo-"), `${name}: missing direct theme paint`);
  const elements = Array.from(doc.getElementsByTagName("*"));
  const ids = elements.filter((el) => el.hasAttribute("id")).map((el) => el.getAttribute("id"));
  assert.equal(new Set(ids).size, ids.length, `${name}: duplicate IDs`);
  for (const id of ids) assert(id.startsWith("__AP_ICON_ID__"), `${name}: unscoped ID`);

  for (const el of elements) {
    const tag = el.localName || el.nodeName;
    assert(!["filter", "style", "script", "foreignObject"].includes(tag), `${name}: unsafe or legacy paint layer ${tag}`);
    assert(!el.hasAttribute("filter") && !el.hasAttribute("mix-blend-mode"), `${name}: old filter pipeline survived`);
    if (tag === "stop") assert(el.hasAttribute("stop-color"), `${name}: gradient has an implicit black stop`);
    for (const attribute of Array.from(el.attributes)) {
      for (const match of attribute.value.matchAll(/url\(#([^)]+)\)/g)) assert(ids.includes(match[1]), `${name}: broken reference ${match[1]}`);
    }
    if (tag !== "image") continue;
    const image = el.getAttribute("href");
    assert(image.startsWith("data:image/png;base64,"), `${name}: raster mask must be local`);
    const { data } = await sharp(Buffer.from(image.split(",")[1], "base64")).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    for (let i = 0; i < data.length; i += 4) {
      if (!data[i + 3]) continue;
      assert(data[i] === 255 && data[i + 1] === 255 && data[i + 2] === 255, `${name}: residual pigment in a white alpha mask`);
    }
    maskCount++;
  }
}

const css = await readFile(path.join(root, "src/index.css"), "utf8");
const iconStyles = css.slice(css.indexOf("/* ---------- App icons ---------- */"), css.indexOf("/* Compact edit affordance"));
assert(!/mix-blend-mode\s*:|filter\s*:(?!\s*none)|\.ap-ico--themed::after/.test(iconStyles), "Icons must not use grayscale, blend filters, or full-tile overlays");
console.log(`Verified ${generated.length} theme-role icons, ${maskCount} pigment-free masks, and border-free icon styles.`);