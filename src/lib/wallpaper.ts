import { useCallback, useEffect, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { idbDelete, idbGet, idbSet } from "./idb";
import type { Settings } from "./settings";

export const WALLPAPER_FILE_KEY = "wallpaper";
/** Longest edge after downscaling — plenty for a 2.5K display, keeps storage and memory small. */
const MAX_EDGE = 2560;
/** Originals up to this size are stored untouched (no re-encoding). */
const MAX_ORIGINAL_BYTES = 2_500_000;

export type WallpaperError = "type" | "save" | "link";
export type WallpaperStatus = { kind: "idle" } | { kind: "busy" } | { kind: "error"; code: WallpaperError };

async function downscale(file: File): Promise<Blob> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    // e.g. SVG without intrinsic size — store the original as is.
    return file;
  }
  try {
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size <= MAX_ORIGINAL_BYTES) return file;
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) return file;
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.86));
    return blob ?? file;
  } finally {
    bitmap.close();
  }
}

function probeImage(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("Image failed to load"));
    image.src = url;
  });
}

export function useWallpaper(settings: Settings, setSettings: Dispatch<SetStateAction<Settings>>) {
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [fileVersion, setFileVersion] = useState(0);
  const [missingFile, setMissingFile] = useState(false);
  const [status, setStatus] = useState<WallpaperStatus>({ kind: "idle" });

  // Resolve the stored file into an object URL whenever the source is "file".
  useEffect(() => {
    if (settings.wallpaperSource !== "file") {
      setFileUrl(null);
      setMissingFile(false);
      return;
    }
    let cancelled = false;
    let objectUrl: string | null = null;
    idbGet<Blob>(WALLPAPER_FILE_KEY)
      .then((blob) => {
        if (cancelled) return;
        if (blob) {
          objectUrl = URL.createObjectURL(blob);
          setFileUrl(objectUrl);
          setMissingFile(false);
        } else {
          setFileUrl(null);
          setMissingFile(true);
        }
      })
      .catch(() => {
        if (cancelled) return;
        setFileUrl(null);
        setMissingFile(true);
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [settings.wallpaperSource, fileVersion]);

  const uploadFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) {
        setStatus({ kind: "error", code: "type" });
        return;
      }
      setStatus({ kind: "busy" });
      try {
        const blob = await downscale(file);
        await idbSet(WALLPAPER_FILE_KEY, blob);
        setFileVersion((version) => version + 1);
        setSettings((current) => ({ ...current, wallpaperSource: "file" }));
        setStatus({ kind: "idle" });
      } catch {
        setStatus({ kind: "error", code: "save" });
      }
    },
    [setSettings],
  );

  const applyUrl = useCallback(
    async (raw: string) => {
      const url = raw.trim();
      if (!url) return;
      setStatus({ kind: "busy" });
      try {
        await probeImage(url);
        setSettings((current) => ({ ...current, wallpaperSource: "url", wallpaperUrl: url }));
        setStatus({ kind: "idle" });
      } catch {
        setStatus({ kind: "error", code: "link" });
      }
    },
    [setSettings],
  );

  const remove = useCallback(async () => {
    const hadFile = settings.wallpaperSource === "file";
    setSettings((current) => ({ ...current, wallpaperSource: "none" }));
    setStatus({ kind: "idle" });
    if (hadFile) {
      try {
        await idbDelete(WALLPAPER_FILE_KEY);
      } catch {
        // Nothing to recover from: the wallpaper is already switched off.
      }
    }
  }, [settings.wallpaperSource, setSettings]);

  const url = settings.wallpaperSource === "file" ? fileUrl : settings.wallpaperSource === "url" ? settings.wallpaperUrl || null : null;

  const refresh = useCallback(() => setFileVersion((version) => version + 1), []);

  return { url, status, missingFile, uploadFile, applyUrl, remove, refresh };
}

export type WallpaperController = ReturnType<typeof useWallpaper>;
