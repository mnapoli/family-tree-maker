const MCP_URL = "https://family-tree-maker.mnapoli.fr/mcp";

export function McpDocs() {
  return (
    <article className="docs">
      <h1>MCP Server</h1>
      <p className="lead">
        Family Tree Maker ships with a remote{" "}
        <a href="https://modelcontextprotocol.io" target="_blank" rel="noreferrer">
          Model Context Protocol
        </a>{" "}
        server so that ChatGPT, Claude, and other MCP-capable assistants can render
        family tree PNGs directly from your conversation.
      </p>

      <h2>Endpoint</h2>
      <pre><code>{MCP_URL}</code></pre>
      <p>
        Transport: MCP over Streamable HTTP (single <code>POST</code>).
        No authentication — the server is public and rate-limited per IP.
      </p>

      <h2>Tool</h2>
      <p>
        The server exposes a single tool:{" "}
        <code>render_family_tree</code>.
      </p>
      <p>
        It takes a <code>FamilyTree</code> JSON object (see the{" "}
        <a href="/api">API docs</a> for the full schema) and returns
        a PNG image of the tree plus a shareable URL back into this app.
      </p>

      <h2>Use it in Claude</h2>

      <h3>Claude.ai (web)</h3>
      <ol>
        <li>Open <strong>Settings → Connectors</strong>.</li>
        <li>
          Click <strong>Add custom connector</strong> and paste:
          <pre><code>{MCP_URL}</code></pre>
        </li>
        <li>Give it a name like <em>Family Tree Maker</em> and save.</li>
      </ol>

      <h3>Claude Desktop</h3>
      <p>
        Open <strong>Settings → Connectors</strong> and add a new custom
        connector with the URL above, same as on the web.
      </p>

      <h3>Claude Code (CLI)</h3>
      <pre><code>{`claude mcp add --transport http \\
  family-tree-maker ${MCP_URL}`}</code></pre>

      <h2>Use it in ChatGPT</h2>
      <p>
        ChatGPT supports remote MCP servers on Plus / Pro / Team / Enterprise
        plans via custom connectors.
      </p>
      <ol>
        <li>
          Open <strong>Settings → Connectors</strong> (you may need to enable{" "}
          <em>Developer mode</em> first).
        </li>
        <li>
          Click <strong>Create</strong> (or <strong>Add</strong>) and enter the
          URL:
          <pre><code>{MCP_URL}</code></pre>
        </li>
        <li>
          Set the authentication to <strong>No authentication</strong> and
          save.
        </li>
        <li>
          In a new conversation, enable the connector from the composer's tools
          menu.
        </li>
      </ol>

      <h2>Example prompt</h2>
      <div className="callout">
        <em>
          Render a family tree for Vito Napoli (born 1854) and Giuseppa
          Grammatico (born 1860), married in 1876. Their children were Nicolo,
          Rosaria, Giuseppe, Girolamo, Lorenzo, Francesco, Teresa, and Mario.
        </em>
      </div>
      <p>
        The assistant will call <code>render_family_tree</code> with a
        structured payload and return the PNG inline, along with a link back
        to this app for further editing.
      </p>
    </article>
  );
}
