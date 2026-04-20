import "./app.css";
import { createRoot } from "react-dom/client";
import { App } from "./components/App.tsx";
import type { FamilyTree } from "./schema.ts";

interface InitialData {
  tree: FamilyTree | null;
  example: FamilyTree;
  error: string | null;
}

const root = document.getElementById("root");
if (!root) throw new Error("#root missing");

let initial: InitialData = { tree: null, example: {} as FamilyTree, error: null };
const raw = root.getAttribute("data-initial");
if (raw) {
  try {
    initial = JSON.parse(raw.replace(/&#39;/g, "'").replace(/&lt;/g, "<"));
  } catch {
    // fall back to defaults
  }
}

// Clear the SSR placeholder content before hydrating the full app.
root.innerHTML = "";

createRoot(root).render(
  <App
    initialTree={initial.tree}
    example={initial.example}
    initialError={initial.error}
  />,
);
