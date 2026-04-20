import type { Couple, FamilyTree, Person } from "../schema.ts";

interface Props {
  tree: FamilyTree;
  onChange: (t: FamilyTree) => void;
}

const EMPTY_PERSON: Person = { name: "" };
const EMPTY_COUPLE: Couple = { father: EMPTY_PERSON, mother: EMPTY_PERSON };

export function Form({ tree, onChange }: Props) {
  const patch = (p: Partial<FamilyTree>) => onChange({ ...tree, ...p });

  const updateCouple = (key: "couple" | "fatherParents" | "motherParents", c: Couple | undefined) => {
    if (key === "couple") patch({ couple: c ?? EMPTY_COUPLE });
    else patch({ [key]: c } as Partial<FamilyTree>);
  };

  const toggleGrandparents = (side: "fatherParents" | "motherParents") => {
    if (tree[side]) {
      const { [side]: _removed, ...rest } = tree;
      onChange({ ...(rest as FamilyTree) });
    } else {
      patch({ [side]: EMPTY_COUPLE } as Partial<FamilyTree>);
    }
  };

  const updateChild = (i: number, c: Person) => {
    const next = tree.children.slice();
    next[i] = c;
    patch({ children: next });
  };
  const removeChild = (i: number) => {
    patch({ children: tree.children.filter((_, idx) => idx !== i) });
  };
  const addChild = () => {
    patch({ children: [...tree.children, { name: "" }] });
  };

  return (
    <>
      <fieldset>
        <legend>Couple</legend>
        <PersonRow
          label="Father"
          person={tree.couple.father}
          onChange={(p) => updateCouple("couple", { ...tree.couple, father: p })}
        />
        <PersonRow
          label="Mother"
          person={tree.couple.mother}
          onChange={(p) => updateCouple("couple", { ...tree.couple, mother: p })}
        />
        <div className="marriage-year">
          <label>Marriage year</label>
          <input
            type="number"
            placeholder="e.g. 1876"
            value={tree.couple.marriageYear ?? ""}
            onChange={(e) =>
              updateCouple("couple", {
                ...tree.couple,
                marriageYear: e.target.value === "" ? undefined : Number(e.target.value),
              })}
          />
        </div>
      </fieldset>

      <CoupleFieldset
        legend="Father's parents"
        enabled={Boolean(tree.fatherParents)}
        couple={tree.fatherParents}
        onToggle={() => toggleGrandparents("fatherParents")}
        onChange={(c) => updateCouple("fatherParents", c)}
      />
      <CoupleFieldset
        legend="Mother's parents"
        enabled={Boolean(tree.motherParents)}
        couple={tree.motherParents}
        onToggle={() => toggleGrandparents("motherParents")}
        onChange={(c) => updateCouple("motherParents", c)}
      />

      <fieldset>
        <legend>Children ({tree.children.length})</legend>
        <div className="children-list">
          <div className="row couple-label">
            <span>Name</span>
            <span>Birth</span>
            <span>Death</span>
            <span />
          </div>
          {tree.children.map((c, i) => (
            <PersonRow
              key={i}
              person={c}
              onChange={(p) => updateChild(i, p)}
              onRemove={() => removeChild(i)}
            />
          ))}
        </div>
        <button type="button" className="btn" onClick={addChild}>+ Add child</button>
      </fieldset>
    </>
  );
}

function PersonRow({
  label,
  person,
  onChange,
  onRemove,
}: {
  label?: string;
  person: Person;
  onChange: (p: Person) => void;
  onRemove?: () => void;
}) {
  const patch = (p: Partial<Person>) => onChange({ ...person, ...p });
  return (
    <div className={"row" + (onRemove ? " child-row" : "")}>
      <input
        type="text"
        placeholder={label ?? "Name"}
        value={person.name}
        onChange={(e) => patch({ name: e.target.value })}
      />
      <input
        type="number"
        placeholder="Birth"
        value={person.birth ?? ""}
        onChange={(e) => patch({ birth: e.target.value === "" ? undefined : Number(e.target.value) })}
      />
      <input
        type="number"
        placeholder="Death"
        value={person.death ?? ""}
        onChange={(e) => patch({ death: e.target.value === "" ? undefined : Number(e.target.value) })}
      />
      {onRemove && (
        <button type="button" className="btn-remove" onClick={onRemove} aria-label="Remove">×</button>
      )}
    </div>
  );
}

function CoupleFieldset({
  legend,
  enabled,
  couple,
  onToggle,
  onChange,
}: {
  legend: string;
  enabled: boolean;
  couple: Couple | undefined;
  onToggle: () => void;
  onChange: (c: Couple | undefined) => void;
}) {
  return (
    <fieldset>
      <legend>
        <label style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", cursor: "pointer" }}>
          <input type="checkbox" checked={enabled} onChange={onToggle} />
          {legend}
        </label>
      </legend>
      {enabled && couple && (
        <>
          <PersonRow
            label="Father"
            person={couple.father}
            onChange={(p) => onChange({ ...couple, father: p })}
          />
          <PersonRow
            label="Mother"
            person={couple.mother}
            onChange={(p) => onChange({ ...couple, mother: p })}
          />
        </>
      )}
    </fieldset>
  );
}
