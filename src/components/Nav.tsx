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
        <a
          className="nav-link nav-github"
          href="https://github.com/mnapoli/family-tree-maker"
          target="_blank"
          rel="noreferrer"
          aria-label="View source on GitHub"
          title="View source on GitHub"
        >
          <GitHubIcon />
        </a>
      </nav>
    </header>
  );
}

function GitHubIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 .5C5.73.5.5 5.73.5 12c0 5.08 3.29 9.38 7.86 10.9.58.11.79-.25.79-.56 0-.28-.01-1.02-.02-2-3.2.7-3.87-1.54-3.87-1.54-.52-1.33-1.28-1.68-1.28-1.68-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.47.11-3.06 0 0 .97-.31 3.18 1.18a11.05 11.05 0 0 1 5.79 0c2.21-1.49 3.18-1.18 3.18-1.18.63 1.59.23 2.77.11 3.06.74.81 1.19 1.84 1.19 3.1 0 4.42-2.69 5.4-5.25 5.68.41.35.78 1.05.78 2.12 0 1.53-.01 2.76-.01 3.14 0 .31.21.68.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.73 18.27.5 12 .5z"/>
    </svg>
  );
}
