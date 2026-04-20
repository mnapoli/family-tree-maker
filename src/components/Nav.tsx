export type NavPage = "home" | "mcp" | "api";

export function TopNav({ current }: { current: NavPage }) {
  const item = (id: NavPage, href: string, label: string) => (
    <a
      className={"nav-link" + (current === id ? " active" : "")}
      href={href}
    >
      {label}
    </a>
  );
  return (
    <header className="top-nav">
      <a className="nav-brand" href="/">Family Tree Maker</a>
      <nav className="top-nav-links">
        {item("home", "/", "Tree maker")}
        {item("mcp", "/mcp", "MCP")}
        {item("api", "/api", "API")}
      </nav>
    </header>
  );
}
