import { type FamilyTree, type Couple, formatLifespan } from "./schema.ts";

export const FONT = {
  grandparent: 44,
  parent: 52,
  child: 52,
  date: 22,
  marriage: 22,
};

const GAP = {
  pairInner: 80,          // between two grandparents in a pair
  sibling: 60,            // between children columns
  parentPair: 200,        // min gap between father name and mother name (hosts marriage year)
  dateMargin: 40,         // between parent name and its date
  gpPairBlocks: 140,      // min gap between left and right grandparent blocks
  marginX: 100,
  marginY: 80,
};

const ROW = {
  gpTextToUnderline: 10,
  gpUnderlineDrop: 80,           // from gp underline Y down to joiner bar
  gpJoinerToParent: 90,          // from joiner bar down to top of parent text
  parentTextToUnderline: 10,
  parentUnderlineToJoiner: 80,   // underline down to marriage joiner
  joinerToChildrenBus: 100,      // marriage joiner down to children bus
  busToChildText: 90,
  childTextToUnderline: 8,
  underlineToDate: 28,
};

const UNDERLINE = {
  thickness: 1.5,
  padName: 8,   // extend underline slightly beyond name edges
};

const STROKE = {
  width: 1.3,
  color: "#2b2b2b",
};

// Estimated text width. Cormorant Garamond is fairly narrow.
// Factors tuned to give a slight over-estimate so underlines & layout never clip text.
export function textWidth(text: string, fontSize: number, bold = false): number {
  const factor = bold ? 0.5 : 0.46;
  return text.length * fontSize * factor;
}

export interface NameBox {
  name: string;
  centerX: number;
  textY: number;         // baseline y
  width: number;
  underlineY: number;
  underlineX1: number;
  underlineX2: number;
}

export interface DateLabel {
  x: number;             // anchor x
  y: number;             // baseline y
  text: string;
  anchor: "start" | "middle" | "end";
}

export interface PairLayout {
  father: NameBox;
  mother: NameBox;
  centerX: number;       // drop point x (where line descends to child)
  joinerY: number;       // horizontal joiner bar y
  joinerX1: number;
  joinerX2: number;
  dropToChildY: number;  // y where drop ends (top of child text area)
}

export interface ParentsLayout {
  father: NameBox;
  mother: NameBox;
  fatherDate?: DateLabel;
  motherDate?: DateLabel;
  marriageLabel?: DateLabel;
  joinerY: number;       // horizontal bar between parent underlines (w/ marriage year)
  joinerX1: number;
  joinerX2: number;
  centerX: number;
  dropToChildrenBusY: number;
}

export interface ChildLayout {
  name: NameBox;
  date?: DateLabel;
  branchX: number;       // x where vertical drop from bus reaches this child
  branchTopY: number;    // top of vertical (children bus Y)
  branchBottomY: number; // where vertical meets child name top
}

export interface TreeLayout {
  width: number;
  height: number;
  leftGp?: PairLayout;
  rightGp?: PairLayout;
  parents: ParentsLayout;
  children: ChildLayout[];
  childrenBusY: number;
  childrenBusX1: number;
  childrenBusX2: number;
  parentsToBusX: number; // x of the vertical from parents-joiner down to children bus
}

export function layoutTree(tree: FamilyTree): TreeLayout {
  const { couple, fatherParents, motherParents, children } = tree;

  // ── children row widths ────────────────────────────────────────────
  const childInfo = children.map((c) => {
    const nameW = textWidth(c.name, FONT.child, true);
    const dateText = formatLifespan(c);
    const dateW = dateText ? textWidth(dateText, FONT.date) : 0;
    return { nameW, dateW, colW: Math.max(nameW, dateW) };
  });
  const childrenContentW = childInfo.reduce((a, c) => a + c.colW, 0)
    + Math.max(0, childInfo.length - 1) * GAP.sibling;

  // ── parents row widths ─────────────────────────────────────────────
  const fatherNameW = textWidth(couple.father.name, FONT.parent, true);
  const motherNameW = textWidth(couple.mother.name, FONT.parent, true);
  const fatherDateText = formatLifespan(couple.father);
  const motherDateText = formatLifespan(couple.mother);
  const fatherDateW = fatherDateText ? textWidth(fatherDateText, FONT.date) : 0;
  const motherDateW = motherDateText ? textWidth(motherDateText, FONT.date) : 0;

  // ── grandparent pair widths ────────────────────────────────────────
  const pairContentW = (p?: Couple) => {
    if (!p) return 0;
    return textWidth(p.father.name, FONT.grandparent)
      + GAP.pairInner
      + textWidth(p.mother.name, FONT.grandparent);
  };
  const leftGpW = pairContentW(fatherParents);
  const rightGpW = pairContentW(motherParents);

  // Expand gap between parents so grandparent pairs (each centered on its parent)
  // don't overlap. Required center-to-center distance between parents =
  // leftGpW/2 + GAP.gpPairBlocks + rightGpW/2.
  // Actual center-to-center = fatherNameW/2 + parentPairGap + motherNameW/2.
  const requiredParentCenterDist = (leftGpW && rightGpW)
    ? leftGpW / 2 + GAP.gpPairBlocks + rightGpW / 2
    : 0;
  const baseParentCenterDist = fatherNameW / 2 + GAP.parentPair + motherNameW / 2;
  const extraPush = Math.max(0, requiredParentCenterDist - baseParentCenterDist);
  const parentPairGap = GAP.parentPair + extraPush;

  // ── canvas width: place marriageCenter at canvas center ────────────
  // Compute how far content extends left/right of marriageCenter; the canvas
  // must be wide enough to hold the larger side symmetrically so children
  // (centered on marriageCenter) don't collide with the margin.
  const leftFromMarriage = Math.max(
    parentPairGap / 2 + fatherNameW + (fatherDateW ? GAP.dateMargin + fatherDateW : 0),
    leftGpW ? parentPairGap / 2 + fatherNameW / 2 + leftGpW / 2 : 0,
    childrenContentW / 2,
  );
  const rightFromMarriage = Math.max(
    parentPairGap / 2 + motherNameW + (motherDateW ? GAP.dateMargin + motherDateW : 0),
    rightGpW ? parentPairGap / 2 + motherNameW / 2 + rightGpW / 2 : 0,
    childrenContentW / 2,
  );
  const halfExtent = Math.max(leftFromMarriage, rightFromMarriage);
  const width = 2 * halfExtent + 2 * GAP.marginX;
  const centerX = width / 2;

  // ── vertical positions ─────────────────────────────────────────────
  let y = GAP.marginY;
  const hasGp = Boolean(fatherParents || motherParents);
  let gpTextY = 0, gpUnderlineY = 0, gpJoinerY = 0;
  if (hasGp) {
    gpTextY = y + FONT.grandparent * 0.82; // baseline
    gpUnderlineY = gpTextY + ROW.gpTextToUnderline;
    gpJoinerY = gpUnderlineY + ROW.gpUnderlineDrop;
    y = gpJoinerY + ROW.gpJoinerToParent;
  }
  const parentTextY = y + FONT.parent * 0.82;
  const parentUnderlineY = parentTextY + ROW.parentTextToUnderline;
  const parentsJoinerY = parentUnderlineY + ROW.parentUnderlineToJoiner;
  const hasChildren = children.length > 0;
  const childrenBusY = parentsJoinerY + ROW.joinerToChildrenBus;
  const childTextY = childrenBusY + ROW.busToChildText + FONT.child * 0.82;
  const childUnderlineY = childTextY + ROW.childTextToUnderline;
  const childDateY = childUnderlineY + ROW.underlineToDate;
  const height = hasChildren
    ? childDateY + GAP.marginY
    : parentsJoinerY + GAP.marginY;

  // ── parents: build x positions centered on centerX (= marriageCenter) ─
  const marriageCenter = centerX;
  const fatherNameRight = marriageCenter - parentPairGap / 2;
  const fatherNameLeft = fatherNameRight - fatherNameW;
  const fatherNameCenter = fatherNameLeft + fatherNameW / 2;
  const motherNameLeft = marriageCenter + parentPairGap / 2;
  const motherNameRight = motherNameLeft + motherNameW;
  const motherNameCenter = motherNameLeft + motherNameW / 2;

  const fatherBox: NameBox = {
    name: couple.father.name,
    centerX: fatherNameCenter,
    textY: parentTextY,
    width: fatherNameW,
    underlineY: parentUnderlineY,
    underlineX1: fatherNameLeft - UNDERLINE.padName,
    underlineX2: fatherNameRight + UNDERLINE.padName,
  };
  const motherBox: NameBox = {
    name: couple.mother.name,
    centerX: motherNameCenter,
    textY: parentTextY,
    width: motherNameW,
    underlineY: parentUnderlineY,
    underlineX1: motherNameLeft - UNDERLINE.padName,
    underlineX2: motherNameRight + UNDERLINE.padName,
  };

  const parents: ParentsLayout = {
    father: fatherBox,
    mother: motherBox,
    fatherDate: fatherDateText ? {
      x: fatherNameLeft - GAP.dateMargin,
      y: parentTextY,
      text: fatherDateText,
      anchor: "end",
    } : undefined,
    motherDate: motherDateText ? {
      x: motherNameRight + GAP.dateMargin,
      y: parentTextY,
      text: motherDateText,
      anchor: "start",
    } : undefined,
    marriageLabel: couple.marriageYear != null ? {
      x: marriageCenter,
      y: parentsJoinerY - 14,
      text: String(couple.marriageYear),
      anchor: "middle",
    } : undefined,
    joinerY: parentsJoinerY,
    joinerX1: fatherNameCenter,
    joinerX2: motherNameCenter,
    centerX: marriageCenter,
    dropToChildrenBusY: childrenBusY,
  };

  // ── grandparents: each pair centered on its parent ─────────────────
  const makePair = (pair: Couple | undefined, anchorX: number): PairLayout | undefined => {
    if (!pair) return undefined;
    const fW = textWidth(pair.father.name, FONT.grandparent);
    const mW = textWidth(pair.mother.name, FONT.grandparent);
    const totalW = fW + GAP.pairInner + mW;
    const leftEdge = anchorX - totalW / 2;
    const fCenter = leftEdge + fW / 2;
    const mCenter = leftEdge + fW + GAP.pairInner + mW / 2;
    const fBox: NameBox = {
      name: pair.father.name,
      centerX: fCenter,
      textY: gpTextY,
      width: fW,
      underlineY: gpUnderlineY,
      underlineX1: fCenter - fW / 2 - UNDERLINE.padName,
      underlineX2: fCenter + fW / 2 + UNDERLINE.padName,
    };
    const mBox: NameBox = {
      name: pair.mother.name,
      centerX: mCenter,
      textY: gpTextY,
      width: mW,
      underlineY: gpUnderlineY,
      underlineX1: mCenter - mW / 2 - UNDERLINE.padName,
      underlineX2: mCenter + mW / 2 + UNDERLINE.padName,
    };
    return {
      father: fBox,
      mother: mBox,
      centerX: anchorX,
      joinerY: gpJoinerY,
      joinerX1: fCenter,
      joinerX2: mCenter,
      dropToChildY: parentTextY - FONT.parent * 0.82, // top of parent text
    };
  };

  const leftGp = makePair(fatherParents, fatherNameCenter);
  const rightGp = makePair(motherParents, motherNameCenter);

  // ── children: positioned horizontally centered on marriageCenter ──
  const childrenLeft = marriageCenter - childrenContentW / 2;
  let cx = childrenLeft;
  const childrenOut: ChildLayout[] = children.map((c, i) => {
    const { nameW, colW } = childInfo[i];
    const colLeft = cx;
    const colCenter = colLeft + colW / 2;
    cx += colW + GAP.sibling;
    const nameBox: NameBox = {
      name: c.name,
      centerX: colCenter,
      textY: childTextY,
      width: nameW,
      underlineY: childUnderlineY,
      underlineX1: colCenter - nameW / 2 - UNDERLINE.padName,
      underlineX2: colCenter + nameW / 2 + UNDERLINE.padName,
    };
    const dateText = formatLifespan(c);
    const date: DateLabel | undefined = dateText ? {
      x: colCenter,
      y: childDateY,
      text: dateText,
      anchor: "middle",
    } : undefined;
    return {
      name: nameBox,
      date,
      branchX: colCenter,
      branchTopY: childrenBusY,
      branchBottomY: childTextY - FONT.child * 0.82,
    };
  });

  const childrenBusX1 = childrenOut.length > 0 ? childrenOut[0].branchX : marriageCenter;
  const childrenBusX2 = childrenOut.length > 0 ? childrenOut[childrenOut.length - 1].branchX : marriageCenter;

  return {
    width,
    height,
    leftGp,
    rightGp,
    parents,
    children: childrenOut,
    childrenBusY,
    childrenBusX1,
    childrenBusX2,
    parentsToBusX: marriageCenter,
  };
}

export const TOKENS = { UNDERLINE, STROKE };
