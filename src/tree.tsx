import type { FamilyTree } from "./schema.ts";
import {
  FONT,
  layoutTree,
  TOKENS,
  type ChildLayout,
  type DateLabel,
  type NameBox,
  type PairLayout,
  type ParentsLayout,
  type TreeLayout,
} from "./layout.ts";

const SERIF = "'Cormorant Garamond', 'EB Garamond', Georgia, serif";

function Underline({ box }: { box: NameBox }) {
  return (
    <line
      x1={box.underlineX1}
      y1={box.underlineY}
      x2={box.underlineX2}
      y2={box.underlineY}
      stroke={TOKENS.STROKE.color}
      strokeWidth={TOKENS.UNDERLINE.thickness}
    />
  );
}

function DateText({ d }: { d: DateLabel }) {
  return (
    <text
      x={d.x}
      y={d.y}
      textAnchor={d.anchor}
      fontFamily={SERIF}
      fontSize={FONT.date}
      fill="#444"
    >
      {d.text}
    </text>
  );
}

function NameText({
  box,
  size,
  bold,
  color = "#1a1a1a",
}: {
  box: NameBox;
  size: number;
  bold?: boolean;
  color?: string;
}) {
  return (
    <text
      x={box.centerX}
      y={box.textY}
      textAnchor="middle"
      fontFamily={SERIF}
      fontSize={size}
      fontWeight={bold ? 700 : 400}
      fill={color}
    >
      {box.name}
    </text>
  );
}

function Line(props: { x1: number; y1: number; x2: number; y2: number }) {
  return (
    <line
      {...props}
      stroke={TOKENS.STROKE.color}
      strokeWidth={TOKENS.STROKE.width}
    />
  );
}

function GrandparentPair({ pair, dropX }: { pair: PairLayout; dropX: number }) {
  return (
    <g>
      <NameText box={pair.father} size={FONT.grandparent} color="#555" />
      <NameText box={pair.mother} size={FONT.grandparent} color="#555" />
      <Underline box={pair.father} />
      <Underline box={pair.mother} />
      {/* inner drops from each name down to joiner bar */}
      <Line x1={pair.joinerX1} y1={pair.father.underlineY} x2={pair.joinerX1} y2={pair.joinerY} />
      <Line x1={pair.joinerX2} y1={pair.mother.underlineY} x2={pair.joinerX2} y2={pair.joinerY} />
      {/* horizontal joiner bar */}
      <Line x1={pair.joinerX1} y1={pair.joinerY} x2={pair.joinerX2} y2={pair.joinerY} />
      {/* drop from joiner bar down to the parent name top */}
      <Line x1={dropX} y1={pair.joinerY} x2={dropX} y2={pair.dropToChildY} />
    </g>
  );
}

function ParentsRow({ parents }: { parents: ParentsLayout }) {
  return (
    <g>
      <NameText box={parents.father} size={FONT.parent} bold />
      <NameText box={parents.mother} size={FONT.parent} bold />
      {parents.fatherDate && <DateText d={parents.fatherDate} />}
      {parents.motherDate && <DateText d={parents.motherDate} />}
      <Underline box={parents.father} />
      <Underline box={parents.mother} />
      {/* inner drops from each parent underline down to joiner */}
      <Line x1={parents.joinerX1} y1={parents.father.underlineY} x2={parents.joinerX1} y2={parents.joinerY} />
      <Line x1={parents.joinerX2} y1={parents.mother.underlineY} x2={parents.joinerX2} y2={parents.joinerY} />
      {/* joiner bar (interrupted by marriage label) */}
      <Line x1={parents.joinerX1} y1={parents.joinerY} x2={parents.joinerX2} y2={parents.joinerY} />
      {parents.marriageLabel && <DateText d={parents.marriageLabel} />}
    </g>
  );
}

function Child({ c }: { c: ChildLayout }) {
  return (
    <g>
      <NameText box={c.name} size={FONT.child} bold />
      {c.date && <DateText d={c.date} />}
      {/* vertical from bus down to child name */}
      <Line x1={c.branchX} y1={c.branchTopY} x2={c.branchX} y2={c.branchBottomY} />
    </g>
  );
}

export function FamilyTreeSVG({
  tree,
  asDocument = false,
}: {
  tree: FamilyTree;
  asDocument?: boolean;
}) {
  const L: TreeLayout = layoutTree(tree);
  const svgProps: Record<string, unknown> = {
    viewBox: `0 0 ${L.width} ${L.height}`,
    width: L.width,
    height: L.height,
    xmlns: "http://www.w3.org/2000/svg",
  };
  if (asDocument) {
    svgProps["xmlnsXlink"] = "http://www.w3.org/1999/xlink";
  }

  return (
    <svg {...svgProps}>
      {L.leftGp && (
        <GrandparentPair pair={L.leftGp} dropX={L.parents.father.centerX} />
      )}
      {L.rightGp && (
        <GrandparentPair pair={L.rightGp} dropX={L.parents.mother.centerX} />
      )}
      <ParentsRow parents={L.parents} />
      {L.children.length > 0 && (
        <>
          {/* drop from parents joiner down to children bus */}
          <line
            x1={L.parentsToBusX}
            y1={L.parents.joinerY}
            x2={L.parentsToBusX}
            y2={L.childrenBusY}
            stroke={TOKENS.STROKE.color}
            strokeWidth={TOKENS.STROKE.width}
          />
          {/* horizontal children bus */}
          <line
            x1={Math.min(L.childrenBusX1, L.parentsToBusX)}
            y1={L.childrenBusY}
            x2={Math.max(L.childrenBusX2, L.parentsToBusX)}
            y2={L.childrenBusY}
            stroke={TOKENS.STROKE.color}
            strokeWidth={TOKENS.STROKE.width}
          />
        </>
      )}
      {L.children.map((c, i) => (
        <Child key={i} c={c} />
      ))}
    </svg>
  );
}
