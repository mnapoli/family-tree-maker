import { Hono } from "hono";
import { renderToString } from "react-dom/server";
import { FamilyTreeSVG } from "./tree.tsx";
import {
  FamilyTreeSchema,
  decodeTree,
  encodeTree,
  EXAMPLE_TREE,
  type FamilyTree,
} from "./schema.ts";
import { svgToPng, RenderTooLargeError } from "./render-png.ts";
import { consume } from "./rate-limit.ts";
import { handleMcp } from "./mcp.tsx";
import { TopNav, type NavPage } from "./components/Nav.tsx";
import { McpDocs } from "./components/McpDocs.tsx";
import { ApiDocs } from "./components/ApiDocs.tsx";

const app = new Hono<{ Bindings: Env }>();

const RENDER_LIMIT = { capacity: 30, refillPerSec: 0.5 }; // ~30 burst, 1 per 2s

function clientIp(req: Request): string {
  return req.headers.get("cf-connecting-ip")
    ?? req.headers.get("x-forwarded-for")?.split(",")[0].trim()
    ?? "unknown";
}

function svgString(tree: FamilyTree): string {
  return renderToString(<FamilyTreeSVG tree={tree} asDocument />);
}

function cssLink(isDev: boolean): string {
  return isDev
    ? `<link rel="stylesheet" href="http://localhost:5173/src/app.css" />`
    : `<link rel="stylesheet" href="/assets/client.css" />`;
}

function headCommon(title: string): string {
  return `<meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;700&display=swap" rel="stylesheet" />`;
}

function docsPage(opts: {
  isDev: boolean;
  title: string;
  current: NavPage;
  bodyHtml: string;
}): string {
  const nav = renderToString(<TopNav current={opts.current} />);
  return `<!doctype html>
<html lang="en">
<head>
  ${headCommon(opts.title)}
  ${cssLink(opts.isDev)}
</head>
<body>
  ${nav}
  <main>${opts.bodyHtml}</main>
</body>
</html>`;
}

// ── GET / ── SSR page with form + preview ─────────────────────────────
app.get("/", (c) => {
  const encoded = c.req.query("d");
  let tree: FamilyTree | null = null;
  let loadError: string | null = null;
  if (encoded) {
    try {
      tree = decodeTree(encoded);
    } catch (e) {
      loadError = (e as Error).message;
    }
  }
  const initialTree = tree ?? null;
  const initialData = JSON.stringify({
    tree: initialTree,
    example: EXAMPLE_TREE,
    error: loadError,
  });

  const previewSvg = tree ? svgString(tree) : "";
  const isDev = c.env.DEV === "true";
  const devHead = isDev
    ? `<script type="module">
      import RefreshRuntime from "http://localhost:5173/@react-refresh"
      RefreshRuntime.injectIntoGlobalHook(window)
      window.$RefreshReg$ = () => {}
      window.$RefreshSig$ = () => (type) => type
      window.__vite_plugin_react_preamble_installed__ = true
    </script>
    <script type="module" src="http://localhost:5173/@vite/client"></script>`
    : `<link rel="stylesheet" href="/assets/client.css" />`;
  const clientScript = isDev
    ? `<script type="module" src="http://localhost:5173/src/client.tsx"></script>`
    : `<script type="module" src="/assets/client.js"></script>`;

  const nav = renderToString(<TopNav current="home" />);

  const html = `<!doctype html>
<html lang="en">
<head>
  ${headCommon("Family Tree Maker")}
  ${devHead}
</head>
<body>
  ${nav}
  <div id="root" data-initial='${initialData.replace(/'/g, "&#39;").replace(/</g, "&lt;")}'>
    <div class="ssr-preview">${previewSvg}</div>
  </div>
  ${clientScript}
</body>
</html>`;
  return c.html(html);
});

// ── GET /mcp ── MCP server documentation ─────────────────────────────
app.get("/mcp", (c) => {
  const html = docsPage({
    isDev: c.env.DEV === "true",
    title: "MCP Server — Family Tree Maker",
    current: "mcp",
    bodyHtml: renderToString(<McpDocs />),
  });
  return c.html(html);
});

// ── GET /api ── HTTP API documentation ───────────────────────────────
app.get("/api", (c) => {
  const html = docsPage({
    isDev: c.env.DEV === "true",
    title: "HTTP API — Family Tree Maker",
    current: "api",
    bodyHtml: renderToString(<ApiDocs />),
  });
  return c.html(html);
});

// ── POST /api/render ── JSON tree → PNG ──────────────────────────────
app.post("/api/render", async (c) => {
  const rl = consume(clientIp(c.req.raw), RENDER_LIMIT);
  if (!rl.ok) {
    return c.json({ error: "rate_limited", retryAfter: rl.retryAfter }, 429, {
      "retry-after": String(rl.retryAfter ?? 1),
    });
  }

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "invalid_json" }, 400);
  }

  const parsed = FamilyTreeSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "invalid_tree", issues: parsed.error.issues }, 400);
  }

  const scaleRaw = Number(c.req.query("scale") ?? "2");
  const scale = Number.isFinite(scaleRaw) ? Math.min(Math.max(scaleRaw, 0.5), 4) : 2;

  const svg = svgString(parsed.data);
  try {
    const png = await svgToPng(svg, { scale });
    return new Response(png as BodyInit, {
      status: 200,
      headers: {
        "content-type": "image/png",
        "cache-control": "public, max-age=3600",
        "x-share-url": "/?d=" + encodeTree(parsed.data),
      },
    });
  } catch (e) {
    if (e instanceof RenderTooLargeError) {
      return c.json({ error: "too_large", detail: e.message }, 413);
    }
    return c.json({ error: "render_failed", detail: (e as Error).message }, 500);
  }
});

// ── GET /api/tree.svg ── SVG version (handy for debugging) ──────────
app.get("/api/tree.svg", (c) => {
  const encoded = c.req.query("d");
  if (!encoded) return c.json({ error: "missing_d" }, 400);
  let tree: FamilyTree;
  try {
    tree = decodeTree(encoded);
  } catch (e) {
    return c.json({ error: "invalid_d", detail: (e as Error).message }, 400);
  }
  return new Response(svgString(tree), {
    headers: { "content-type": "image/svg+xml; charset=utf-8" },
  });
});

// ── GET /api/tree.png ── PNG by encoded share param (for MCP embeds) ─
app.get("/api/tree.png", async (c) => {
  const rl = consume(clientIp(c.req.raw), RENDER_LIMIT);
  if (!rl.ok) {
    return c.json({ error: "rate_limited", retryAfter: rl.retryAfter }, 429, {
      "retry-after": String(rl.retryAfter ?? 1),
    });
  }
  const encoded = c.req.query("d");
  if (!encoded) return c.json({ error: "missing_d" }, 400);
  let tree: FamilyTree;
  try {
    tree = decodeTree(encoded);
  } catch (e) {
    return c.json({ error: "invalid_d", detail: (e as Error).message }, 400);
  }
  const scaleRaw = Number(c.req.query("scale") ?? "2");
  const scale = Number.isFinite(scaleRaw) ? Math.min(Math.max(scaleRaw, 0.5), 4) : 2;
  try {
    const png = await svgToPng(svgString(tree), { scale });
    return new Response(png as BodyInit, {
      status: 200,
      headers: {
        "content-type": "image/png",
        "cache-control": "public, max-age=3600",
      },
    });
  } catch (e) {
    if (e instanceof RenderTooLargeError) {
      return c.json({ error: "too_large", detail: e.message }, 413);
    }
    return c.json({ error: "render_failed", detail: (e as Error).message }, 500);
  }
});

// ── POST /mcp ── Remote MCP over Streamable HTTP ─────────────────────
app.post("/mcp", (c) => handleMcp(c.req.raw, c.env));

// ── Static asset fallback ────────────────────────────────────────────
app.get("*", (c) => c.env.ASSETS.fetch(c.req.raw));

export default app;
