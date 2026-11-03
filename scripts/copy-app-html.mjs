/** Copies the built single-file app to public/ so the extension packager can read it at runtime. */
import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
await mkdir(path.join(root, "public"), { recursive: true });
await copyFile(path.join(root, "dist/index.html"), path.join(root, "public/lisyan-app.txt"));
console.log("Copied dist/index.html → public/lisyan-app.txt");
