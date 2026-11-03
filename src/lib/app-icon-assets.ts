/// <reference types="vite/client" />

const pngs = import.meta.glob<string>("../assets/app-art/*.png", { eager: true, query: "?url", import: "default" });
const svgs = import.meta.glob<string>("../assets/app-art/*.svg", { eager: true, query: "?url", import: "default" });
const themed = import.meta.glob<string>("../assets/app-themed/*.svg", { eager: true, query: "?raw", import: "default" });

const files = { ...pngs, ...svgs };
const keyOf = (path: string) => path.split("/").pop()!.replace(/\.(png|svg)$/, "");

/** Original app artwork, bundled locally so the launcher works offline. */
export const APP_ICON_ASSETS: Record<string, string> = Object.fromEntries(Object.entries(files).map(([path, url]) => [keyOf(path), url]));
export const APP_ICON_SVG_ASSETS: Record<string, string> = Object.fromEntries(Object.entries(svgs).map(([path, url]) => [keyOf(path), url]));

/** Generated from local artwork by scripts/build-themed-icons.mjs; never user-supplied markup. */
export const THEMED_ICON_SVGS: Record<string, string> = Object.fromEntries(Object.entries(themed).map(([path, svg]) => [keyOf(path), svg]));
