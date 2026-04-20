import { renderToString } from "react-dom/server";
import { FamilyTreeSVG } from "./tree.tsx";
import {
  FamilyTreeSchema,
  encodeTree,
  type FamilyTree,
} from "./schema.ts";
import { svgToPng } from "./render-png.ts";
import { zodToJsonSchema } from "./json-schema.ts";
import { putShortId } from "./shortener.ts";

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

const TOOLS = [
  {
    name: TOOL_NAME,
    description:
      "Render a family tree image (PNG) from structured genealogy data. " +
      "The tree is centered on a married couple and includes optional grandparents (both sides) and children. " +
      "Names are required; birth/death/marriage years are optional and displayed as '?' when unknown. " +
      "Returns a short URL to the rendered PNG — share it as a markdown image `![Family tree](URL)` " +
      "so the image appears inline in your reply.",
    inputSchema: zodToJsonSchema(FamilyTreeSchema),
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
    },
  },
];

export async function handleMcp(req: Request, env: Env): Promise<Response> {
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
    const res = await handleMessage(raw as JsonRpcRequest, env);
    if (res) responses.push(res);
  }

  if (responses.length === 0) {
    return new Response(null, { status: 202 });
  }
  const payload = Array.isArray(body) ? responses : responses[0];
  return jsonResponse(payload);
}

async function handleMessage(msg: JsonRpcRequest, env: Env): Promise<JsonRpcResponse | null> {
  const isNotification = msg.id === undefined || msg.id === null;
  const id = msg.id ?? null;

  try {
    switch (msg.method) {
      case "initialize":
        return ok(id, {
          protocolVersion: PROTOCOL_VERSION,
          capabilities: { tools: {} },
          serverInfo: SERVER_INFO,
        });

      case "notifications/initialized":
      case "notifications/cancelled":
        return null;

      case "ping":
        return ok(id, {});

      case "tools/list":
        return ok(id, { tools: TOOLS });

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
        const result = await renderTool(parsed.data, env);
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

async function renderTool(tree: FamilyTree, env: Env) {
  const svg = renderToString(<FamilyTreeSVG tree={tree} asDocument />);
  const png = await svgToPng(svg, { scale: 2 });
  const b64 = bytesToBase64(png);
  const encoded = encodeTree(tree);
  const shortId = await putShortId(env.TREES, encoded);
  const imageUrl = `${PUBLIC_BASE}/t/${shortId}.png`;
  return {
    content: [
      { type: "image", data: b64, mimeType: "image/png" },
      { type: "text", text: `![Family tree](${imageUrl})` },
    ],
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
