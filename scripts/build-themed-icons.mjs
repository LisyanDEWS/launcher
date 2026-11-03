import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DOMParser, XMLSerializer } from "@xmldom/xmldom";
import { Resvg } from "@resvg/resvg-js";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.join(root, "src/assets/app-art");
const output = path.join(root, "src/assets/app-themed");
const prefix = "__AP_ICON_ID__";
const serializer = new XMLSerializer();
const paints = ["fill", "stroke", "stop-color"];
const shapes = new Set(["path", "rect", "circle", "ellipse", "polygon", "polyline", "line", "text", "use"]);
const removedTags = new Set(["style", "script", "foreignObject", "filter", "metadata", "namedview", "title", "desc"]);

const elements = (node) => {
  const result = [];
  const visit = (current) => {
    if (current.nodeType === 1) result.push(current);
    for (let child = current.firstChild; child; child = child.nextSibling) visit(child);
  };
  visit(node);
  return result;
};
const localName = (node) => node.localName || node.nodeName.replace(/^.*:/, "");
const declarations = (text) => Object.fromEntries(
  text.split(";").filter((rule) => rule.includes(":")).map((rule) => {
    const split = rule.indexOf(":");
    return [rule.slice(0, split).trim(), rule.slice(split + 1).trim()];
  }),
);
const role = (name) => `var(--ap-logo-${name})`;

function rgb(value) {
  const color = value.trim().toLowerCase();
  const named = { white: "#ffffff", black: "#000000", red: "#ff0000", blue: "#0000ff", green: "#008000" };
  const text = named[color] ?? color;
  if (/^#[0-9a-f]{3}$/i.test(text)) return [...text.slice(1)].map((c) => parseInt(c + c, 16) / 255);
  if (/^#[0-9a-f]{6}$/i.test(text)) return [1, 3, 5].map((i) => parseInt(text.slice(i, i + 2), 16) / 255);
  if (text.startsWith("rgb(")) {
    const parts = text.slice(4, -1).split(/[,\s]+/).filter(Boolean);
    if (parts.length === 3) return parts.map((v) => parseFloat(v) / (v.includes("%") ? 100 : 255));
  }
  return null;
}

function characteristics([r, g, b]) {
  const hi = Math.max(r, g, b), lo = Math.min(r, g, b), d = hi - lo;
  let hue = d === 0 ? 0 : hi === r ? (g - b) / d : hi === g ? (b - r) / d + 2 : (r - g) / d + 4;
  hue = ((hue * 60) % 360 + 360) % 360;
  return { hue, chroma: d, light: (hi + lo) / 2, brightness: r * 0.2126 + g * 0.7152 + b * 0.0722 };
}

function dominantHue(values) {
  const bins = new Map();
  for (const value of values) {
    const c = rgb(value);
    if (!c) continue;
    const { hue, chroma } = characteristics(c);
    if (chroma < 0.12) continue;
    const bin = Math.floor(hue / 45);
    bins.set(bin, (bins.get(bin) ?? 0) + 1);
  }
  const strongest = [...bins].sort((a, b) => b[1] - a[1])[0];
  return strongest ? strongest[0] * 45 + 22.5 : 220;
}

/** Remove the source pigment, then assign each structural paint a Material role. */
function colorRole(value, dominant, monochrome = false) {
  const c = rgb(value);
  if (!c) return value === "currentColor" ? role("ink") : value;
  if (monochrome) return role("ink");
  const { hue, chroma, light, brightness } = characteristics(c);
  if (chroma < 0.12) {
    if (light > 0.88) return role("paper");
    if (light > 0.62) return role("soft");
    return light < 0.2 ? role("deep") : role("ink");
  }
  const distance = Math.min(Math.abs(hue - dominant), 360 - Math.abs(hue - dominant));
  if (distance > 125) return brightness > 0.65 ? role("accent-soft") : role("accent");
  if (distance > 65) return role("middle");
  if (light > 0.57 || brightness > 0.74) return role("soft");
  if (light < 0.39) return role("deep");
  return role("ink");
}

function expandStyles(svg) {
  const rules = [];
  for (const element of elements(svg)) {
    if (localName(element) !== "style") continue;
    for (const match of element.textContent.matchAll(/([^{}]+)\{([^{}]+)\}/g)) {
      for (const selector of match[1].split(",")) rules.push([selector.trim(), declarations(match[2])]);
    }
  }
  for (const element of elements(svg)) {
    let computed = {};
    const classes = (element.getAttribute("class") || "").split(/\s+/);
    for (const [selector, values] of rules) {
      if (selector.startsWith(".") && classes.includes(selector.slice(1))) computed = { ...computed, ...values };
    }
    computed = { ...computed, ...declarations(element.getAttribute("style") || "") };
    for (const [name, value] of Object.entries(computed)) {
      if (name === "mask-type") element.setAttribute("data-mask-mode", value);
      else element.setAttribute(name, value);
    }
    element.removeAttribute("style");
    element.removeAttribute("class");
  }
}

function inMask(element) {
  for (let parent = element; parent?.nodeType === 1; parent = parent.parentNode) {
    if (["mask", "clipPath"].includes(localName(parent))) return true;
  }
  return false;
}

function scopeIds(svg) {
  const idMap = new Map();
  for (const element of elements(svg)) {
    const id = element.getAttribute("id");
    if (id) idMap.set(id, `${prefix}${id.replace(/[^a-zA-Z0-9_-]/g, "_")}`);
  }
  for (const element of elements(svg)) {
    for (const attr of Array.from(element.attributes)) {
      let value = attr.value.replace(/url\(\s*['"]?#([^)'"\s]+)['"]?\s*\)/g, (_, id) => `url(#${idMap.get(id) ?? id})`);
      if (attr.name === "id") value = idMap.get(value) ?? value;
      if (attr.localName === "href" && value.startsWith("#")) value = `#${idMap.get(value.slice(1)) ?? value.slice(1)}`;
      element.setAttribute(attr.name, value);
    }
  }
}

function vectorTemplate(text, key) {
  // Illustrator export metadata can contain unresolved namespace entities.
  text = text.replace(/\s+xmlns:[\w-]+=(['"])(&ns_[^;]+;)\1/g, "");
  text = text.replace(/&ns_[a-z_]+;/gi, "");
  const doc = new DOMParser().parseFromString(text, "image/svg+xml");
  const svg = doc.documentElement;
  expandStyles(svg);
  const monochrome = ["g_aistudio", "g_notebooklm"].includes(key);
  const colors = elements(svg).flatMap((el) => inMask(el) ? [] : paints.map((name) => el.getAttribute(name)).filter(Boolean));
  const dominant = dominantHue(colors);

  for (const element of elements(svg)) {
    const tag = localName(element);
    if (removedTags.has(tag) || tag.startsWith("fe")) {
      element.parentNode?.removeChild(element);
      continue;
    }
    if (element.getAttribute("display") === "none") {
      element.parentNode?.removeChild(element);
      continue;
    }
    // Native masks keep their white/black coverage, rather than receiving visible paint roles.
    const masked = inMask(element);
    if (!masked) {
      for (const paint of paints) {
        if (element.hasAttribute(paint)) element.setAttribute(paint, colorRole(element.getAttribute(paint), dominant, monochrome));
      }
      if (tag === "stop" && !element.hasAttribute("stop-color")) element.setAttribute("stop-color", role("deep"));
      if (shapes.has(tag) && !element.hasAttribute("fill") && !element.hasAttribute("id")) {
        let parent = element.parentNode;
        while (parent?.nodeType === 1 && !parent.hasAttribute("fill")) parent = parent.parentNode;
        if (!parent || parent.nodeType !== 1) element.setAttribute("fill", role("ink"));
      }
    }
    for (const attr of Array.from(element.attributes)) {
      if (/^on/i.test(attr.name) || ["filter", "mix-blend-mode", "enable-background"].includes(attr.name)) element.removeAttribute(attr.name);
      if (attr.localName === "href" && !attr.value.startsWith("#")) element.removeAttribute(attr.name);
    }
    if (element.hasAttribute("data-mask-mode")) {
      const mode = element.getAttribute("data-mask-mode");
      element.setAttribute("style", `mask-type:${mode === "alpha" ? "alpha" : "luminance"}`);
      element.removeAttribute("data-mask-mode");
    }
  }
  if (!svg.hasAttribute("fill")) svg.setAttribute("fill", role("ink"));
  svg.removeAttribute("width");
  svg.removeAttribute("height");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  scopeIds(svg);
  return serializer.serializeToString(svg);
}

/** Raster exceptions become white alpha masks; only the final rectangles carry theme colours. */
async function rasterTemplate(text) {
  const png = new Resvg(text, { fitTo: { mode: "width", value: 192 } }).render().asPng();
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const colors = [];
  for (let i = 0; i < data.length; i += 16) if (data[i + 3] > 220) colors.push(`rgb(${data[i]},${data[i + 1]},${data[i + 2]})`);
  const dominant = dominantHue(colors);
  const layers = new Map();
  for (let i = 0; i < data.length; i += 4) {
    if (!data[i + 3]) continue;
    const paint = colorRole(`rgb(${data[i]},${data[i + 1]},${data[i + 2]})`, dominant);
    if (!layers.has(paint)) layers.set(paint, Buffer.alloc(data.length));
    const layer = layers.get(paint);
    layer[i] = layer[i + 1] = layer[i + 2] = 255;
    layer[i + 3] = data[i + 3];
  }
  const masks = [], rectangles = [];
  let index = 0;
  for (const [paint, data] of layers) {
    const png = await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
    const id = `${prefix}mask-${index++}`;
    masks.push(`<mask id="${id}" maskUnits="userSpaceOnUse" x="0" y="0" width="${info.width}" height="${info.height}" style="mask-type:alpha"><image width="${info.width}" height="${info.height}" href="data:image/png;base64,${png.toString("base64")}"/></mask>`);
    rectangles.push(`<rect width="${info.width}" height="${info.height}" fill="${paint}" mask="url(#${id})"/>`);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${info.width} ${info.height}" aria-hidden="true" focusable="false"><defs>${masks.join("")}</defs>${rectangles.join("")}</svg>`;
}

await mkdir(output, { recursive: true });
let vectors = 0, rasters = 0;
for (const file of (await readdir(source)).filter((file) => file.endsWith(".svg")).sort()) {
  const text = await readFile(path.join(source, file), "utf8");
  const raster = /<(?:\w+:)?image\b/.test(text);
  const themed = raster ? await rasterTemplate(text) : vectorTemplate(text, path.basename(file, ".svg"));
  await writeFile(path.join(output, file), `${themed}\n`);
  if (raster) rasters++; else vectors++;
}
console.log(`Generated ${vectors} theme-role SVGs and ${rasters} white-mask SVGs.`);