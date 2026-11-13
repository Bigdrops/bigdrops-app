"use client";

import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ExternalLinkIcon,
  Maximize2Icon,
  RefreshCcwIcon,
} from "lucide-react";
import { useState } from "react";
import {
  WebPreview,
  WebPreviewBody,
  WebPreviewConsole,
  WebPreviewNavigation,
  WebPreviewNavigationButton,
  WebPreviewUrl,
} from "@/components/ui/web-preview";

const ID = "web-preview-default";
const HOME = "http://localhost:3000/";

/** The generated app's stylesheet: system colors, so it follows light and dark. */
const STYLE =
  ":root{color-scheme:light dark}body{margin:0;font:14px/1.5 system-ui,sans-serif;background:Canvas;color:CanvasText}nav{display:flex;gap:16px;align-items:center;padding:12px 20px;border-bottom:1px solid color-mix(in srgb,CanvasText 12%,transparent)}nav span{opacity:.6}main{padding:28px 20px;max-width:560px}h1{font-size:26px;line-height:1.2;margin:0 0 8px}p{margin:0 0 16px;opacity:.7}code{font-size:13px}.cta{display:inline-block;padding:7px 14px;border-radius:8px;background:CanvasText;color:Canvas;font-weight:600}.grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}.card{padding:14px;border:1px solid color-mix(in srgb,CanvasText 14%,transparent);border-radius:10px}.card b{display:block;font-size:20px}";

const page = (body: string) =>
  `<!doctype html><html><head><meta charset="utf-8"><style>${STYLE}</style></head><body><nav><b>Acme</b><span>Home</span><span>Pricing</span><span>About</span></nav><main>${body}</main></body></html>`;

/** The pages the model generated, by address. */
const PAGES: Record<string, string> = {
  [`${HOME}about`]: page(
    "<h1>About Acme</h1><p>Six people in Lisbon, building the reports we always wanted.</p>"
  ),
  [`${HOME}pricing`]: page(
    '<h1>Pricing</h1><p>Start free, upgrade when the team grows.</p><div class="grid"><div class="card">Hobby<b>$0</b></div><div class="card">Team<b>$12</b></div></div>'
  ),
  [HOME]: page(
    '<h1>Reports your team reads</h1><p>Acme turns your data into a weekly page, written in plain words. Try <code>/pricing</code> or <code>/about</code> in the address bar.</p><span class="cta">Start free</span>'
  ),
};

const notFound = (url: string) =>
  page(
    `<h1>404</h1><p>No page at <code>${url.replace(/</g, "&lt;")}</code>. Try <code>/pricing</code> or <code>/about</code>.</p>`
  );

/** A path typed alone ("/pricing") opens on the app's origin. */
const resolve = (url: string) =>
  url.startsWith("/") ? `${HOME}${url.slice(1)}` : url;

const logs = [
  {
    level: "log" as const,
    message: "Page loaded successfully",
    timestamp: new Date(2026, 9, 22, 9, 41, 2),
  },
  {
    level: "warn" as const,
    message: "Deprecated API usage detected",
    timestamp: new Date(2026, 9, 22, 9, 41, 7),
  },
  {
    level: "error" as const,
    message: "Failed to load resource: /api/stats (404)",
    timestamp: new Date(2026, 9, 22, 9, 41, 12),
  },
];

const WebPreviewDemo = () => {
  const [url, setUrl] = useState(HOME);
  const html = PAGES[resolve(url)] ?? notFound(url);

  // The open page as a file of its own, in a new tab.
  const openInTab = () => {
    const href = URL.createObjectURL(new Blob([html], { type: "text/html" }));
    window.open(href, "_blank", "noopener");
    setTimeout(() => URL.revokeObjectURL(href), 10_000);
  };

  const maximize = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => undefined);
    } else {
      document
        .getElementById(ID)
        ?.requestFullscreen?.()
        .catch(() => undefined);
    }
  };

  return (
    <WebPreview
      className="h-96 w-full max-w-2xl"
      defaultUrl={HOME}
      id={ID}
      onUrlChange={setUrl}
    >
      <WebPreviewNavigation>
        <WebPreviewNavigationButton action="back" tooltip="Go back">
          <ArrowLeftIcon aria-hidden="true" className="rtl:-scale-x-100" />
        </WebPreviewNavigationButton>
        <WebPreviewNavigationButton action="forward" tooltip="Go forward">
          <ArrowRightIcon aria-hidden="true" className="rtl:-scale-x-100" />
        </WebPreviewNavigationButton>
        <WebPreviewNavigationButton action="reload" tooltip="Reload">
          <RefreshCcwIcon aria-hidden="true" />
        </WebPreviewNavigationButton>
        <WebPreviewUrl />
        <WebPreviewNavigationButton
          onClick={openInTab}
          tooltip="Open in new tab"
        >
          <ExternalLinkIcon aria-hidden="true" />
        </WebPreviewNavigationButton>
        <WebPreviewNavigationButton onClick={maximize} tooltip="Maximize">
          <Maximize2Icon aria-hidden="true" />
        </WebPreviewNavigationButton>
      </WebPreviewNavigation>
      <WebPreviewBody srcDoc={html} />
      <WebPreviewConsole logs={logs} />
    </WebPreview>
  );
};
