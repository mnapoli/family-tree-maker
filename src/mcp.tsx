import { renderToString } from "react-dom/server";
import { FamilyTreeSVG } from "./tree.tsx";
import {
  FamilyTreeSchema,
  encodeTree,
  type FamilyTree,
} from "./schema.ts";
import { svgToPng } from "./render-png.ts";
import { zodToJsonSchema } from "./json-schema.ts";

const PROTOCOL_VERSION = "2024-11-05";
const SERVER_INFO = {
  name: "family-tree-maker",
  version: "0.1.0",
};

interface JsonRpcRequest {
  jsonrpc: "2.0";
  id?: string | number | null;
  method: string;
  params?: unknown;
}

interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: string | number | null;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

const TOOL_NAME = "render_family_tree";
const PUBLIC_BASE = "https://family-tree-maker.mnapoli.fr";
const UI_RESOURCE_URI = "ui://family-tree.html";
const UI_RESOURCE_MIME = "text/html+skybridge";

const UI_HTML = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>
  body { margin: 0; padding: 0; background: white; font-family: -apple-system, BlinkMacSystemFont, sans-serif; }
  .wrap { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; padding: 0.5rem; }
  img { max-width: 100%; height: auto; display: block; }
  .edit { font-size: 0.85rem; color: #555; }
  .edit a { color: #2a5fa3; text-decoration: none; }
  .edit a:hover { text-decoration: underline; }
  .loading { color: #999; font-style: italic; padding: 2rem; }
</style>
</head>
<body>
<div class="wrap">
  <img id="img" alt="Family tree" hidden />
  <div id="loading" class="loading">Loading family tree…</div>
  <div class="edit" id="edit" hidden>
    <a id="editLink" target="_blank" rel="noopener">Open in Family Tree Maker ↗</a>
  </div>
</div>
<script>
(function() {
  var imgEl = document.getElementById('img');
  var loadEl = document.getElementById('loading');
  var editEl = document.getElementById('edit');
  var linkEl = document.getElementById('editLink');
  function render(data) {
    if (!data) return;
    var sc = data.structuredContent || data;
    if (!sc || !sc.imageUrl) return;
    imgEl.src = sc.imageUrl;
    imgEl.hidden = false;
    loadEl.hidden = true;
    if (sc.shareUrl) {
      linkEl.href = sc.shareUrl;
      editEl.hidden = false;
    }
  }
  // OpenAI Apps SDK global
  try {
    if (window.openai) {
      if (window.openai.toolOutput) render(window.openai.toolOutput);
      if (typeof window.openai.subscribe === 'function') {
        window.openai.subscribe('toolOutput', render);
      }
    }
  } catch (e) {}
  // Generic MCP Apps / ChatGPT postMessage bridge
  window.addEventListener('message', function(e) {
    var m = e.data;
    if (!m || typeof m !== 'object') return;
    if (m.method === 'ui/notifications/tool-result' || m.method === 'tool/output') {
      render(m.params);
    } else if (m.structuredContent) {
      render(m);
    } else if (m.toolOutput) {
      render(m.toolOutput);
    }
  }, false);
  // Poll window.openai.toolOutput in case it populates late.
  var tries = 0;
  var iv = setInterval(function() {
    tries++;
    try {
      if (window.openai && window.openai.toolOutput) {
        render(window.openai.toolOutput);
        clearInterval(iv);
      }
    } catch (e) {}
    if (tries > 40) clearInterval(iv);
  }, 100);
})();
</script>
</body>
</html>`;

const TOOLS = [
  {
    name: TOOL_NAME,
    description:
      "Render a family tree image (PNG) from structured genealogy data. " +
      "The tree is centered on a married couple and includes optional grandparents (both sides) and children. " +
      "Names are required; birth/death/marriage years are optional and displayed as '?' when unknown.",
    inputSchema: zodToJsonSchema(FamilyTreeSchema),
    _meta: {
      "openai/outputTemplate": UI_RESOURCE_URI,
      "openai/toolInvocation/invoking": "Drawing the family tree…",
      "openai/toolInvocation/invoked": "Family tree ready.",
    },
  },
];

const RESOURCES = [
  {
    uri: UI_RESOURCE_URI,
    name: "Family tree widget",
    mimeType: UI_RESOURCE_MIME,
  },
];

export async function handleMcp(req: Request, _env: Env): Promise<Response> {
  if (req.method === "GET" || req.method === "DELETE") {
    return new Response(null, { status: 405, headers: { allow: "POST" } });
  }
  if (req.method !== "POST") {
    return new Response(null, { status: 405 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonResponse(
      jsonrpcError(null, -32700, "Parse error"),
    );
  }

  const messages = Array.isArray(body) ? body : [body];
  const responses: JsonRpcResponse[] = [];
  for (const raw of messages) {
    const res = await handleMessage(raw as JsonRpcRequest);
    if (res) responses.push(res);
  }

  if (responses.length === 0) {
    return new Response(null, { status: 202 });
  }
  const payload = Array.isArray(body) ? responses : responses[0];
  return jsonResponse(payload);
}

async function handleMessage(msg: JsonRpcRequest): Promise<JsonRpcResponse | null> {
  // Notifications (no id) expect no response.
  const isNotification = msg.id === undefined || msg.id === null;
  const id = msg.id ?? null;

  try {
    switch (msg.method) {
      case "initialize":
        return ok(id, {
          protocolVersion: PROTOCOL_VERSION,
          capabilities: { tools: {}, resources: {} },
          serverInfo: SERVER_INFO,
        });

      case "notifications/initialized":
      case "notifications/cancelled":
        return null;

      case "ping":
        return ok(id, {});

      case "tools/list":
        return ok(id, { tools: TOOLS });

      case "resources/list":
        return ok(id, { resources: RESOURCES });

      case "resources/read": {
        const params = msg.params as { uri?: string };
        if (params?.uri !== UI_RESOURCE_URI) {
          return err(id, -32602, `Unknown resource: ${params?.uri}`);
        }
        return ok(id, {
          contents: [
            {
              uri: UI_RESOURCE_URI,
              mimeType: UI_RESOURCE_MIME,
              text: UI_HTML,
            },
          ],
        });
      }

      case "tools/call": {
        const params = msg.params as { name?: string; arguments?: unknown };
        if (params?.name !== TOOL_NAME) {
          return err(id, -32602, `Unknown tool: ${params?.name}`);
        }
        const parsed = FamilyTreeSchema.safeParse(params.arguments);
        if (!parsed.success) {
          return ok(id, {
            isError: true,
            content: [{
              type: "text",
              text: "Invalid tree data: " + JSON.stringify(parsed.error.issues),
            }],
          });
        }
        const result = await renderTool(parsed.data);
        return ok(id, result);
      }

      default:
        if (isNotification) return null;
        return err(id, -32601, `Method not found: ${msg.method}`);
    }
  } catch (e) {
    if (isNotification) return null;
    return err(id, -32603, (e as Error).message);
  }
}

async function renderTool(tree: FamilyTree) {
  const svg = renderToString(<FamilyTreeSVG tree={tree} asDocument />);
  const png = await svgToPng(svg, { scale: 2 });
  const b64 = bytesToBase64(png);
  const encoded = encodeTree(tree);
  const imageUrl = `${PUBLIC_BASE}/api/tree.png?d=${encoded}`;
  const shareUrl = `${PUBLIC_BASE}/?d=${encoded}`;
  return {
    structuredContent: { imageUrl, shareUrl },
    content: [
      { type: "image", data: b64, mimeType: "image/png" },
      { type: "text", text: `Family tree rendered. Edit: ${shareUrl}` },
    ],
    _meta: {
      "openai/outputTemplate": UI_RESOURCE_URI,
    },
  };
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function ok(id: string | number | null, result: unknown): JsonRpcResponse {
  return { jsonrpc: "2.0", id, result };
}
function err(id: string | number | null, code: number, message: string): JsonRpcResponse {
  return { jsonrpc: "2.0", id, error: { code, message } };
}
function jsonrpcError(id: string | number | null, code: number, message: string): JsonRpcResponse {
  return err(id, code, message);
}
function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
  });
}
