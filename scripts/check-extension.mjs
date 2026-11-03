/**
 * Verifies the generated extension package without a browser.
 *
 * Run after `npm run build && node scripts/copy-app-html.mjs`:
 *   node scripts/check-extension.mjs
 *
 * Checks the exact things that used to break packaged releases:
 *  - no inline <script> in the packaged page (MV3/MV2 extension pages block them via CSP,
 *    which is what rendered as a black screen);
 *  - every file referenced by index.html and the manifest exists in the package;
 *  - manifest fields Firefox requires (data_collection_permissions), the new-tab override,
 *    and the built-in favicon content script.
 */
import assert from "node:assert/strict";
import { readFile, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const entry = path.join(root, "scripts/.ext-check-entry.ts");
const out = path.join(root, "scripts/.ext-check.cjs");
await writeFile(entry, 'export { buildExtensionFiles, buildCrx, crxFileName, extensionFileName } from "../src/lib/extension";\nexport { DEFAULT_SETTINGS } from "../src/lib/settings";\n');
const app = await readFile(path.join(root, "public/lisyan-app.txt"), "utf8");
const virtual = "export default " + JSON.stringify(app) + ";";

await build({
  entryPoints: [entry],
  bundle: true,
  platform: "node",
  format: "cjs",
  outfile: out,
  logLevel: "error",
  plugins: [
    {
      name: "app-text",
      setup(b) {
        b.onResolve({ filter: /lisyan-app\.txt\?raw$/ }, () => ({ path: "x", namespace: "app-text" }));
        b.onLoad({ filter: /.*/, namespace: "app-text" }, () => ({ contents: virtual, loader: "js", resolveDir: root }));
      },
    },
  ],
});

const mod = await import(out);
const { buildExtensionFiles, buildCrx, crxFileName, extensionFileName } = mod;
const { DEFAULT_SETTINGS } = mod;

for (const target of ["chromium", "firefox"]) {
  const files = await buildExtensionFiles(DEFAULT_SETTINGS, target);
  const names = files.map((f) => f.path);
  const page = files.find((f) => f.path === "index.html").content;
  const manifest = JSON.parse(files.find((f) => f.path === "manifest.json").content);

  const inlineScripts = page.match(/<script(?![^>]*\bsrc=)[^>]*>/g) || [];
  assert.equal(inlineScripts.length, 0, `${target}: packaged page must not contain inline scripts (MV3 CSP blocks them → black screen): ${inlineScripts.length}`);

  for (const tag of page.matchAll(/<script[^>]*\bsrc="([^"]+)"/g)) {
    assert.ok(names.includes(tag[1]), `${target}: ${tag[1]} referenced by index.html must be packaged`);
  }

  assert.equal(manifest.chrome_url_overrides?.newtab, "index.html", `${target}: new tab overridden`);
  assert.ok(manifest.content_scripts?.some((c) => c.js.includes("favicon-theme.js")), `${target}: favicon content script registered`);
  assert.ok(names.includes("favicon-theme.js"), `${target}: favicon-theme.js packaged`);
  assert.ok(names.includes("background.js"), `${target}: background worker packaged`);
  const bg = files.find((f) => f.path === "background.js").content;
  new Function(bg); // parses
  assert.ok(bg.includes("lisyan:repaint-favicon"), `${target}: background repaints favicons of already-open tabs`);
  assert.ok(bg.includes("lisyan_userscripts"), `${target}: background injects user scripts (mini-Tampermonkey)`);
  const perms = manifest.permissions || [];
  if (target === "chromium") {
    assert.ok(perms.includes("scripting") && perms.includes("tabs"), "MV3 needs scripting+tabs for user scripts");
    assert.ok(manifest.host_permissions?.includes("https://*/*"), "MV3 host permissions");
    assert.equal(manifest.background?.service_worker, "background.js", "MV3 service worker registered");
  } else {
    assert.ok(perms.includes("https://*/*") && perms.includes("tabs"), "MV2 host+tabs permissions");
    assert.ok(manifest.background?.scripts?.includes("background.js"), "MV2 background page registered");
  }
  const cs = files.find((f) => f.path === "favicon-theme.js").content;
  new Function(cs); // parses
  assert.ok(cs.includes('link[rel~="icon"]'), `${target}: content script contains the repaint logic`);

  if (target === "firefox") {
    assert.equal(manifest.manifest_version, 2, "Firefox uses MV2");
    assert.equal(manifest.browser_specific_settings.gecko.data_collection_permissions.required[0], "none", "Firefox data-collection consent declared");
  } else {
    assert.equal(manifest.manifest_version, 3, "Chrome uses MV3");
  }

  console.log(`${extensionFileName(target)}: OK — ${files.length} files, no inline scripts, favicon content script registered, manifest valid`);

// CRX: magic/version, protobuf header, verifiable signature, zip payload.
if (target === "chromium") {
  const crx = new Uint8Array(await (await buildCrx(files)).arrayBuffer());
  assert.equal(Buffer.from(crx.subarray(0, 4)).toString(), "Cr24", "CRX magic");
  const view = new DataView(crx.buffer, crx.byteOffset);
  assert.equal(view.getUint32(4, true), 3, "CRX3 version");
  const headerLength = view.getUint32(8, true);
  assert.equal(crx[12 + headerLength], 0x50, "CRX zip payload starts with PK");
  const { createHash, verify, createPublicKey } = await import("node:crypto");
  // walk protobuf: header -> field 2 proof -> fields 1 (pubkey) + 2 (sig); field 10000 signedData
  const readVarint = (b, at) => { let v = 0, s = 0; for (;;) { const byte = b[at++]; v |= (byte & 0x7f) << s; s += 7; if (!(byte & 0x80)) return [v, at]; } };
  const fields = (b) => { const out = []; let at = 0; while (at < b.length) { let tag; [tag, at] = readVarint(b, at); const len = (() => { let l; [l, at] = readVarint(b, at); return l; })(); out.push([tag >> 3, b.subarray(at, at + len)]); at += len; } return out; };
  const header = crx.subarray(12, 12 + headerLength);
  const hf = fields(header);
  const proof = fields(hf.find((f) => f[0] === 2)[1]);
  const publicDer = proof.find((f) => f[0] === 1)[1];
  const signature = proof.find((f) => f[0] === 2)[1];
  const signedData = hf.find((f) => f[0] === 10000)[1];
  const key = createPublicKey({ key: Buffer.from(publicDer), format: "der", type: "spki" });
  assert.ok(verify("sha256", Buffer.from(signedData), key, Buffer.from(signature)), "CRX signature verifies");
  const id = Array.from(createHash("sha256").update(publicDer).digest().subarray(0, 16))
    .map((b) => "0123456789abcdef"[b >> 4] + "0123456789abcdef"[b & 15])
    .join("")
    .replace(/[0-9a-f]/g, (ch) => String.fromCharCode(97 + parseInt(ch, 16)));
  const headerId = new TextDecoder().decode(fields(signedData).find((f) => f[0] === 1)[1]);
  assert.equal(headerId, id, "CRX id matches key");
  console.log(`${crxFileName()}: OK — CRX3 signature verifies, id=${id}`);
}

}
console.log("Extension packages verified.");
await rm(entry, { force: true });
await rm(out, { force: true });
