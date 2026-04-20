import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import { FamilyTreeSVG } from "./tree.tsx";
import { EXAMPLE_TREE, type FamilyTree } from "./schema.ts";

function render(tree: FamilyTree): string {
  return renderToString(<FamilyTreeSVG tree={tree} asDocument />);
}

describe("FamilyTreeSVG", () => {
  it("couple only — no children, no grandparents", async () => {
    const svg = render({
      couple: {
        father: { name: "John Doe", birth: 1900, death: 1970 },
        mother: { name: "Jane Doe", birth: 1905, death: 1980 },
        marriageYear: 1925,
      },
      children: [],
    });
    await expect(svg).toMatchFileSnapshot("__snapshots__/couple-only.svg");
  });

  it("couple with one child", async () => {
    const svg = render({
      couple: {
        father: { name: "John Doe", birth: 1900 },
        mother: { name: "Jane Doe", birth: 1905 },
        marriageYear: 1925,
      },
      children: [{ name: "Kid One", birth: 1926 }],
    });
    await expect(svg).toMatchFileSnapshot("__snapshots__/couple-one-child.svg");
  });

  it("couple with grandparents on both sides, no children", async () => {
    const svg = render({
      couple: {
        father: { name: "John Doe" },
        mother: { name: "Jane Doe" },
      },
      fatherParents: {
        father: { name: "Grandpa Doe" },
        mother: { name: "Grandma Doe" },
      },
      motherParents: {
        father: { name: "Grandpa Smith" },
        mother: { name: "Grandma Smith" },
      },
      children: [],
    });
    await expect(svg).toMatchFileSnapshot("__snapshots__/grandparents-no-children.svg");
  });

  it("couple with only father's grandparents", async () => {
    const svg = render({
      couple: {
        father: { name: "John Doe", birth: 1900 },
        mother: { name: "Jane Doe", birth: 1905 },
      },
      fatherParents: {
        father: { name: "Grandpa Doe" },
        mother: { name: "Grandma Doe" },
      },
      children: [{ name: "Kid" }],
    });
    await expect(svg).toMatchFileSnapshot("__snapshots__/father-gp-only.svg");
  });

  it("asymmetric date blocks — regression for left-margin overflow", async () => {
    // Short father name + short date on left, long mother name + date on right.
    // Before the fix, marriageCenter drifted left of canvas center and
    // children centered on it overflowed the left margin.
    const svg = render({
      couple: {
        father: { name: "Vito", birth: 1854 },
        mother: { name: "Giuseppa Grammatico", birth: 1860 },
        marriageYear: 1876,
      },
      children: [
        { name: "Nicolo" },
        { name: "Rosaria" },
        { name: "Giuseppe" },
        { name: "Girolamo" },
        { name: "Lorenzo" },
        { name: "Francesco" },
        { name: "Teresa" },
        { name: "Mario" },
      ],
    });
    await expect(svg).toMatchFileSnapshot("__snapshots__/asymmetric-dates.svg");
  });

  it("full example tree", async () => {
    const svg = render(EXAMPLE_TREE);
    await expect(svg).toMatchFileSnapshot("__snapshots__/example-tree.svg");
  });
});
