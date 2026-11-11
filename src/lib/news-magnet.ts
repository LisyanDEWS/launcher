import { useEffect, useState } from "react";

/**
 * Two "pages" live in one document: the launcher (search + widgets, one screen tall) and the news
 * sheet underneath it. Scrolling therefore has two magnetic rest points — the top of the launcher
 * and the top of the news sheet — and eases into whichever one is nearer when the user stops.
 * Inside the news sheet scrolling is free again.
 */

const SHEET = ".news-band";

const reduced = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

const sheetTop = () => {
  const sheet = document.querySelector<HTMLElement>(SHEET);
  return sheet ? sheet.getBoundingClientRect().top + window.scrollY : Number.POSITIVE_INFINITY;
};

/**
 * Only an actual keystroke pauses the magnet. The search field is focused on load, so mere focus
 * must not count — otherwise the page would never snap until the user clicks away.
 */
let lastKeyAt = 0;
const typing = () => Date.now() - lastKeyAt < 900;

/**
 * While a page change is being animated (handle, "back to search", a magnet snap) the user's own
 * intent must win: the magnet waits until the animation has landed. Without this the smooth scroll
 * from the handle was immediately cancelled by the snap back to the launcher.
 */
let lockUntil = 0;
const locked = () => Date.now() < lockUntil;
const lock = (ms: number) => {
  lockUntil = Math.max(lockUntil, Date.now() + ms);
};

/**
 * Page-change animation owned by us: a browser "smooth" scroll can be cancelled by layout changes
 * while the feed renders, which left the page halfway. This rAF tween always lands on the target,
 * and the magnet ignores scroll events until it is done.
 */
let tweenFrame = 0;
function tweenScrollTo(target: number, duration = reduced() ? 0 : 620) {
  window.cancelAnimationFrame(tweenFrame);
  const from = window.scrollY;
  const distance = target - from;
  if (!duration || Math.abs(distance) < 2) {
    window.scrollTo(0, target);
    return;
  }
  const start = performance.now();
  lock(duration + 260);
  const step = (now: number) => {
    const t = Math.min(1, (now - start) / duration);
    // easeInOutCubic — soft start, soft landing.
    const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    window.scrollTo(0, from + distance * eased);
    if (t < 1) tweenFrame = requestAnimationFrame(step);
  };
  tweenFrame = requestAnimationFrame(step);
}

export function scrollToNews() {
  const top = sheetTop();
  if (!Number.isFinite(top)) return;
  tweenScrollTo(top);
}

export function scrollToLauncher() {
  tweenScrollTo(0);
}

/** Cancels an in-flight page-change animation (a real user gesture always wins). */
const stopTween = () => {
  window.cancelAnimationFrame(tweenFrame);
  tweenFrame = 0;
};

/**
 * True while the news sheet is the page the user is looking at. The launcher's floating controls
 * (the "edit home screen" button) step aside when this is on, so they cannot sit on the feed.
 */
export function useInNews(): boolean {
  const [inNews, setInNews] = useState(false);
  useEffect(() => {
    const sheet = document.querySelector<HTMLElement>(SHEET);
    if (!sheet) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          // Consider the news "entered" once its top edge passes the upper third of the screen.
          setInNews(entry.isIntersecting && entry.intersectionRect.height > Math.min(160, window.innerHeight * 0.25));
        }
      },
      { threshold: [0, 0.08, 0.2, 0.45] },
    );
    observer.observe(sheet);
    const onScroll = () => {
      const top = sheet.getBoundingClientRect().top;
      setInNews(top <= window.innerHeight * 0.55);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, []);
  return inNews;
}

export function useNewsMagnet(enabled: boolean, editing: boolean) {
  useEffect(() => {
    if (!enabled || editing) return;

    let timer = 0;
    let programmatic = false;
    let programmaticTimer = 0;
    let touching = false;

    const settle = () => {
      if (programmatic || touching || typing() || locked()) return;
      const sheet = sheetTop();
      if (!Number.isFinite(sheet)) return;
      const y = window.scrollY;
      // Below the sheet's top edge: the feed is being read, so scrolling is free.
      if (y > sheet + 24) return;
      const toLauncher = Math.abs(y);
      const toSheet = Math.abs(y - sheet);
      if (Math.min(toLauncher, toSheet) < 3) return;
      const target = toLauncher <= toSheet ? 0 : sheet;
      programmatic = true;
      lock(900);
      window.clearTimeout(programmaticTimer);
      programmaticTimer = window.setTimeout(() => (programmatic = false), 900);
      window.scrollTo({ top: target, behavior: reduced() ? "auto" : "smooth" });
    };

    const onScroll = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(settle, 140);
    };
    const onScrollEnd = () => {
      window.clearTimeout(timer);
      settle();
    };
    const onTouchStart = () => {
      stopTween();
      touching = true;
      window.clearTimeout(timer);
    };
    const onTouchEnd = () => {
      touching = false;
      window.clearTimeout(timer);
      timer = window.setTimeout(settle, 220);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key.length === 1 || event.key === "Backspace" || event.key === "Delete") lastKeyAt = Date.now();
    };

    const onWheel = () => stopTween();
    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("scrollend", onScrollEnd);
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("touchcancel", onTouchEnd, { passive: true });

    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(programmaticTimer);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("wheel", onWheel);
      window.cancelAnimationFrame(tweenFrame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("scrollend", onScrollEnd);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [enabled, editing]);
}
