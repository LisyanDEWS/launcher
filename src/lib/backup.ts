import { idbGet } from "./idb";
import { sanitizeBookmarks, sanitizeHistory, sanitizeSettings, type Bookmark, type Settings } from "./settings";
import { WALLPAPER_FILE_KEY } from "./wallpaper";

const FORMAT = "lisyan-backup";
const VERSION = 1;
const MAX_BACKUP_BYTES = 32 * 1024 * 1024;
const MAX_WALLPAPER_BYTES = 20 * 1024 * 1024;

export type RestorePayload = {
  settings: Settings;
  bookmarks: Bookmark[];
  history: string[];
  wallpaper: Blob | null;
};

type BackupFile = {
  format: typeof FORMAT;
  version: typeof VERSION;
  exportedAt: string;
  data: {
    settings: Settings;
    bookmarks: Bookmark[];
    history: string[];
    wallpaperFile: { type: string; base64: string } | null;
  };
};

function toBase64(bytes: Uint8Array) {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function fromBase64(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Export preferences, bookmarks, recent searches and any uploaded wallpaper in one JSON file. */
export async function createBackupFile(data: { settings: Settings; bookmarks: Bookmark[]; history: string[] }) {
  let wallpaperFile: BackupFile["data"]["wallpaperFile"] = null;
  if (data.settings.wallpaperSource === "file") {
    const wallpaper = await idbGet<Blob>(WALLPAPER_FILE_KEY).catch(() => undefined);
    if (wallpaper) {
      if (wallpaper.size > MAX_WALLPAPER_BYTES) throw new Error("The uploaded wallpaper is too large to include in a backup.");
      wallpaperFile = { type: wallpaper.type || "image/jpeg", base64: toBase64(new Uint8Array(await wallpaper.arrayBuffer())) };
    }
  }

  const backup: BackupFile = {
    format: FORMAT,
    version: VERSION,
    exportedAt: new Date().toISOString(),
    data: { ...data, wallpaperFile },
  };
  return new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
}

/** Parse and sanitize a backup before it is allowed to replace the current data. */
export async function readBackupFile(file: File): Promise<RestorePayload> {
  if (file.size <= 0 || file.size > MAX_BACKUP_BYTES) throw new Error("Choose a valid backup file smaller than 32 MB.");

  let parsed: unknown;
  try {
    parsed = JSON.parse(await file.text());
  } catch {
    throw new Error("This file is not valid JSON.");
  }

  if (!parsed || typeof parsed !== "object") throw new Error("This does not look like a LisYan backup.");
  const root = parsed as Record<string, unknown>;
  if (root.format !== FORMAT || root.version !== VERSION || !root.data || typeof root.data !== "object") {
    throw new Error("This is not a supported LisYan backup file.");
  }

  const data = root.data as Record<string, unknown>;
  if (!data.settings || typeof data.settings !== "object") throw new Error("The backup is missing its settings.");

  let wallpaper: Blob | null = null;
  const rawWallpaper = data.wallpaperFile;
  if (rawWallpaper && typeof rawWallpaper === "object") {
    const item = rawWallpaper as Record<string, unknown>;
    if (typeof item.type !== "string" || !item.type.startsWith("image/") || typeof item.base64 !== "string") {
      throw new Error("The wallpaper in this backup is not a valid image.");
    }
    if (item.base64.length > Math.ceil((MAX_WALLPAPER_BYTES * 4) / 3) + 8) throw new Error("The wallpaper in this backup is too large.");
    let bytes: Uint8Array;
    try {
      bytes = fromBase64(item.base64);
    } catch {
      throw new Error("The wallpaper data in this backup is damaged.");
    }
    if (!bytes.length || bytes.length > MAX_WALLPAPER_BYTES) throw new Error("The wallpaper in this backup is too large.");
    const buffer = new ArrayBuffer(bytes.length);
    new Uint8Array(buffer).set(bytes);
    wallpaper = new Blob([buffer], { type: item.type });
  }

  const settings = sanitizeSettings(data.settings);
  if (wallpaper) settings.wallpaperSource = "file";
  else if (settings.wallpaperSource === "file") settings.wallpaperSource = "none";

  return {
    settings,
    bookmarks: sanitizeBookmarks(data.bookmarks),
    history: sanitizeHistory(data.history),
    wallpaper,
  };
}