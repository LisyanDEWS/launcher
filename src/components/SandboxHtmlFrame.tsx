import { useEffect, useMemo, useRef } from "react";

type Props = {
  /** Trusted, already-token-substituted document body markup for the widget. */
  html: string;
  /** Extra CSS applied inside the frame (font family for the Matrix style). */
  fontFamily?: string;
  className?: string;
  style?: React.CSSProperties;
  title?: string;
};

const FRAME_STYLE = `html,body{margin:0;padding:0;width:100%;height:100%;overflow:hidden}
body{display:flex;flex-direction:column;font-family:var(--f,system-ui,sans-serif)}
*{box-sizing:border-box}`;

/**
 * Renders custom widget markup inside a sandboxed frame.
 *
 * Sandboxed without `allow-same-origin`, so the widget can never reach the
 * launcher's storage or the extension APIs, and `srcdoc` avoids innerHTML
 * assignment on the host page entirely (Firefox Add-ons linter requirement).
 * A keychange reloads the frame, which also stops any scripts the widget started.
 */
export default function SandboxHtmlFrame({ html, fontFamily, className, style, title = "Widget" }: Props) {
  const frame = useRef<HTMLIFrameElement>(null);
  const doc = useMemo(
    () =>
      `<!doctype html><html><head><meta charset="utf-8"><style>${FRAME_STYLE}</style></head><body>${html}</body></html>`,
    [html, fontFamily],
  );

  // Reload on the next tick so a widget's own script cannot interrupt the parent render.
  useEffect(() => {
    if (frame.current) frame.current.srcdoc = doc;
  }, [doc]);

  return (
    <iframe
      ref={frame}
      title={title}
      className={className}
      style={{ border: 0, width: "100%", height: "100%", display: "block", ...style }}
      sandbox="allow-scripts"
      referrerPolicy="no-referrer"
      data-font={fontFamily ? "matrix" : undefined}
      data-f={fontFamily ?? ""}
    />
  );
}
