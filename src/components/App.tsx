import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FamilyTreeSVG } from "../tree.tsx";
import {
  FamilyTreeSchema,
  encodeTree,
  type FamilyTree,
  type Person,
  type Couple,
} from "../schema.ts";
import { Form } from "./Form.tsx";

const EMPTY_PERSON: Person = { name: "" };
const EMPTY_COUPLE: Couple = { father: EMPTY_PERSON, mother: EMPTY_PERSON };
const EMPTY_TREE: FamilyTree = {
  couple: EMPTY_COUPLE,
  children: [],
};

interface Props {
  initialTree: FamilyTree | null;
  example: FamilyTree;
  initialError: string | null;
}

export function App({ initialTree, example, initialError }: Props) {
  const [tree, setTree] = useState<FamilyTree>(initialTree ?? EMPTY_TREE);
  const [error, setError] = useState<string | null>(initialError);
  const [showJson, setShowJson] = useState(false);
  const [copyLabel, setCopyLabel] = useState("Copy URL");
  const [downloadLabel, setDownloadLabel] = useState("Download PNG");
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const validated = useMemo(() => {
    // Drop empty-name children so a freshly-added blank row doesn't invalidate
    // the whole tree; the user sees the live preview while filling it in.
    const trimmed: FamilyTree = {
      ...tree,
      children: tree.children.filter((c) => c.name.trim().length > 0),
    };
    const r = FamilyTreeSchema.safeParse(trimmed);
    return r.success ? r.data : null;
  }, [tree]);

  // Keep ?d= in sync with the current tree (debounced).
  useEffect(() => {
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => {
      if (!validated) return;
      const encoded = encodeTree(validated);
      const url = new URL(window.location.href);
      url.searchParams.set("d", encoded);
      window.history.replaceState(null, "", url.toString());
    }, 300);
    return () => {
      if (syncTimer.current) clearTimeout(syncTimer.current);
    };
  }, [validated]);

  const loadExample = useCallback(() => {
    setTree(example);
    setError(null);
  }, [example]);

  const copyUrl = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopyLabel("Copied!");
      setTimeout(() => setCopyLabel("Copy URL"), 1500);
    } catch {
      setCopyLabel("Copy failed");
      setTimeout(() => setCopyLabel("Copy URL"), 1500);
    }
  }, []);

  const downloadPng = useCallback(async () => {
    if (!validated) return;
    setDownloadLabel("Rendering...");
    try {
      const res = await fetch("/api/render", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(validated),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "family-tree.png";
      a.click();
      URL.revokeObjectURL(a.href);
      setDownloadLabel("Downloaded!");
    } catch (e) {
      setDownloadLabel("Failed: " + (e as Error).message);
    }
    setTimeout(() => setDownloadLabel("Download PNG"), 2000);
  }, [validated]);

  const hasContent = Boolean(validated && validated.couple.father.name && validated.couple.mother.name);

  return (
    <div className="app">
      <aside className="form-panel">
        <h1>Family Tree Maker</h1>
        <p className="tagline">
          Fill in names and years — the preview updates live, the URL stays shareable.
        </p>
        {error && <div className="error-banner">Could not load tree from URL: {error}</div>}
        <Form tree={tree} onChange={setTree} />
        <div className="actions">
          <button type="button" className="btn primary" onClick={downloadPng} disabled={!validated}>
            {downloadLabel}
          </button>
          <button type="button" className="btn" onClick={copyUrl} disabled={!validated}>
            {copyLabel}
          </button>
          <button type="button" className="btn" onClick={loadExample}>
            Load example
          </button>
        </div>
        <div className="json-toggle" onClick={() => setShowJson((v) => !v)}>
          {showJson ? "▾ Hide JSON" : "▸ Show JSON"}
        </div>
        {showJson && (
          <JsonEditor tree={tree} onChange={setTree} setError={setError} />
        )}
      </aside>
      <main className={"preview-panel" + (hasContent ? "" : " empty")}>
        {hasContent
          ? <FamilyTreeSVG tree={validated!} />
          : <div>Fill in the parents' names to start.</div>}
      </main>
    </div>
  );
}

function JsonEditor({
  tree,
  onChange,
  setError,
}: {
  tree: FamilyTree;
  onChange: (t: FamilyTree) => void;
  setError: (e: string | null) => void;
}) {
  const [text, setText] = useState(() => JSON.stringify(tree, null, 2));
  const [localErr, setLocalErr] = useState<string | null>(null);

  useEffect(() => {
    setText(JSON.stringify(tree, null, 2));
  }, [tree]);

  return (
    <>
      <textarea
        className="json-editor"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          try {
            const parsed = FamilyTreeSchema.parse(JSON.parse(e.target.value));
            onChange(parsed);
            setLocalErr(null);
            setError(null);
          } catch (err) {
            setLocalErr((err as Error).message);
          }
        }}
      />
      {localErr && <div className="error-banner">{localErr}</div>}
    </>
  );
}
