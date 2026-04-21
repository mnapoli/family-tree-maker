# Family Tree Maker

Render minimalist family tree diagrams from a structured JSON payload. Centered on a married couple, with optional grandparents (both sides) and children.

Live at [family-tree-maker.mnapoli.fr](https://family-tree-maker.mnapoli.fr).

Runs on Cloudflare Workers: SSR (Hono + React 19), a small HTTP API, and a remote MCP server so Claude / ChatGPT can render trees directly from a conversation.

## Develop

```sh
npm install
npm run fonts   # download the Cormorant Garamond font once
npm run dev
```

Then open http://localhost:8787.

## Build & deploy

```sh
npm run build
npm run deploy
```

Note: [`wrangler.jsonc`](wrangler.jsonc) hardcodes `family-tree-maker.mnapoli.fr` as a custom domain route. If you fork this project, change or remove that route before deploying.

## Endpoints

- `GET /` — UI (form + live preview, SSR on first load, hydrated on the client)
- `POST /api/render` — JSON tree → PNG
- `GET /api/tree.svg?d=<encoded>` — SVG
- `GET /api/tree.png?d=<encoded>` — PNG
- `POST /mcp` — remote MCP server (Streamable HTTP, single tool `render_family_tree`)

See `/api` and `/mcp` on the live site for the full schema and usage.

## License

[MIT](LICENSE)
