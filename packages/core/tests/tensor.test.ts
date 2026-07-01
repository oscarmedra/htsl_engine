import { describe, expect, it } from "vitest";
import { parse, latexOfObject } from "../src/index.js";
import type { ObjectNode } from "../src/types.js";

function tex(src: string): string {
  const node = parse(src)[0];
  if (!node || node.type !== "object") throw new Error("expected an object node");
  return latexOfObject(node as ObjectNode);
}

describe("matrix/vector delimiters (delim)", () => {
  it("defaults to parentheses (pmatrix)", () => {
    expect(tex(`{@mom:{row:1,2}{row:3,4}}`)).toContain("\\begin{pmatrix}");
  });

  it("bracket → bmatrix [ ]", () => {
    expect(tex(`{@mom[delim=bracket]:{row:1,2}{row:3,4}}`)).toContain("\\begin{bmatrix}");
  });

  it("bar → vmatrix (determinant)", () => {
    expect(tex(`{@mom[delim=bar]:{row:1,2}{row:3,4}}`)).toContain("\\begin{vmatrix}");
  });

  it("norm → Vmatrix", () => {
    expect(tex(`{@mov[delim=norm]:{c:1}{c:2}}`)).toContain("\\begin{Vmatrix}");
  });

  it("none → plain matrix, brace → Bmatrix", () => {
    expect(tex(`{@mov[delim=none]:{c:1}{c:2}}`)).toContain("\\begin{matrix}");
    expect(tex(`{@mom[delim=brace]:{row:1,2}}`)).toContain("\\begin{Bmatrix}");
  });

  it("accepts French synonyms (crochet)", () => {
    expect(tex(`{@mom[delim=crochet]:{row:1,2}}`)).toContain("\\begin{bmatrix}");
  });
});

describe("@mot — unified vector / matrix / tensor", () => {
  it("column vector from {c:…}", () => {
    expect(tex(`{@mot:{c:1}{c:2}{c:3}}`)).toBe("\\begin{pmatrix} 1 \\\\ 2 \\\\ 3 \\end{pmatrix}");
  });

  it("matrix from {row:…}", () => {
    expect(tex(`{@mot:{row:1,2}{row:3,4}}`)).toBe("\\begin{pmatrix} 1 & 2 \\\\ 3 & 4 \\end{pmatrix}");
  });

  it("row vector from a single {row:…}", () => {
    expect(tex(`{@mot:{row:1,2,3}}`)).toBe("\\begin{pmatrix} 1 & 2 & 3 \\end{pmatrix}");
  });

  it("orient=col transposes a single row into a column", () => {
    expect(tex(`{@mot[orient=col]:{row:1,2,3}}`)).toBe("\\begin{pmatrix} 1 \\\\ 2 \\\\ 3 \\end{pmatrix}");
  });

  it("tensor: labelled 2D slices side by side", () => {
    const t = tex(`{@mot[delim=bracket]:{slice[label="k=1"]:{row:1,0}{row:0,1}}{slice[label="k=2"]:{row:0,1}{row:1,0}}}`);
    expect(t).toContain("\\underset{k=1}{\\begin{bmatrix} 1 & 0 \\\\ 0 & 1 \\end{bmatrix}}");
    expect(t).toContain("\\quad");
    expect(t).toContain("\\underset{k=2}{\\begin{bmatrix} 0 & 1 \\\\ 1 & 0 \\end{bmatrix}}");
  });

  it("tensor slices auto-number when unlabelled", () => {
    expect(tex(`{@mot:{slice:{row:1}}{slice:{row:2}}}`)).toContain("\\underset{1}{");
  });
});
