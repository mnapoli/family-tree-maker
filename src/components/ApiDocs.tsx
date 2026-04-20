const BASE = "https://family-tree-maker.mnapoli.fr";

const EXAMPLE_BODY = `{
  "couple": {
    "father": { "name": "Vito Napoli", "birth": 1854 },
    "mother": { "name": "Giuseppa Grammatico", "birth": 1860 },
    "marriageYear": 1876
  },
  "fatherParents": {
    "father": { "name": "Girolamo Napoli" },
    "mother": { "name": "Teresa Poma" }
  },
  "motherParents": {
    "father": { "name": "Nicolo Grammatico" },
    "mother": { "name": "Rosaria Rizzo" }
  },
  "children": [
    { "name": "Nicolo", "birth": 1880 },
    { "name": "Rosaria", "birth": 1891 },
    { "name": "Mario" }
  ]
}`;

export function ApiDocs() {
  return (
    <article className="docs">
      <h1>HTTP API</h1>
      <p className="lead">
        Render family tree images directly from your scripts, without going
        through the MCP protocol.
      </p>

      <p>
        Base URL: <code>{BASE}</code>
      </p>

      <h2>POST /api/render</h2>
      <p>
        Renders a family tree as a PNG image.
      </p>

      <h3>Request</h3>
      <table>
        <tbody>
          <tr><th>Method</th><td><code>POST</code></td></tr>
          <tr><th>Path</th><td><code>/api/render</code></td></tr>
          <tr><th>Content-Type</th><td><code>application/json</code></td></tr>
          <tr>
            <th>Query params</th>
            <td>
              <code>scale</code> (optional, 0.5 – 4, default <code>2</code>) —
              pixel density multiplier.
            </td>
          </tr>
          <tr>
            <th>Body</th>
            <td>
              A <code>FamilyTree</code> JSON object (see <a href="#schema">schema</a>).
            </td>
          </tr>
        </tbody>
      </table>

      <h3>Response</h3>
      <ul>
        <li><code>200</code> — <code>image/png</code> body.</li>
        <li>
          Header <code>x-share-url</code> — path to re-open the tree in the
          web UI (append to the base URL).
        </li>
        <li><code>400</code> — invalid JSON or invalid tree.</li>
        <li><code>413</code> — rendered image exceeds size limits.</li>
        <li><code>429</code> — rate limit hit (see <code>retry-after</code>).</li>
      </ul>

      <h3>Example</h3>
      <pre><code>{`curl -X POST '${BASE}/api/render?scale=2' \\
  -H 'content-type: application/json' \\
  -d '${EXAMPLE_BODY.replace(/\n/g, " ").replace(/\s+/g, " ")}' \\
  --output tree.png`}</code></pre>

      <h2>GET /api/tree.svg</h2>
      <p>
        Returns the SVG for a tree encoded in a shareable URL. Handy for
        debugging or embedding in HTML.
      </p>
      <table>
        <tbody>
          <tr><th>Method</th><td><code>GET</code></td></tr>
          <tr><th>Path</th><td><code>/api/tree.svg</code></td></tr>
          <tr>
            <th>Query params</th>
            <td>
              <code>d</code> (required) — the base64url-encoded tree as
              produced by the <code>?d=</code> query string on the home page.
            </td>
          </tr>
        </tbody>
      </table>
      <pre><code>{`curl '${BASE}/api/tree.svg?d=<encoded>' > tree.svg`}</code></pre>

      <h2 id="schema">Schema</h2>
      <p>A <code>FamilyTree</code> has this shape:</p>
      <pre><code>{`type FamilyTree = {
  couple: Couple;           // required — the central couple
  fatherParents?: Couple;   // optional — father's parents (grandparents)
  motherParents?: Couple;   // optional — mother's parents (grandparents)
  children?: Person[];      // up to 20
};

type Couple = {
  father: Person;
  mother: Person;
  marriageYear?: number;
};

type Person = {
  name: string;             // 1 – 50 chars
  birth?: number;           // integer year, -3000 to 3000
  death?: number;
};`}</code></pre>
      <p>
        Missing birth or death years are displayed as <code>?</code> in the
        rendered tree.
      </p>

      <h2>Rate limits</h2>
      <p>
        The render endpoint is limited per client IP: a token bucket of 30
        requests with a refill of one every two seconds. Exceeding the limit
        returns <code>429</code> with a <code>retry-after</code> header (in
        seconds).
      </p>

      <h2>Prefer MCP?</h2>
      <p>
        If you're integrating with an AI assistant rather than a backend
        service, the <a href="/mcp">MCP endpoint</a> gives you the same
        rendering capability wrapped in a tool that ChatGPT and Claude can
        call directly.
      </p>
    </article>
  );
}
