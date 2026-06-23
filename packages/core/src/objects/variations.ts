/**
 * French-style **tableau de variations** and **tableau de signes**.
 *
 *   {@variations[var="x", fn="f(x)"]:
 *     {pt[x="-\infty", y="+\infty"]/} {down/}
 *     {pt[x="0", y="-3"]/} {up/}
 *     {pt[x="+\infty", y="+\infty"]/}
 *   }
 *
 *   {@signs[var="x", fn="x^2-1"]:
 *     {pt[x="-\infty"]/} {s: +} {pt[x="-1", zero]/} {s: -} {pt[x="1", zero]/} {s: +} {pt[x="+\infty"]/}
 *   }
 *
 * Pure render (a CSS grid) — no JavaScript. Cell values are rendered with KaTeX.
 */
import type { ElementNode, KatexLike, ObjectNode } from "../types.js";
import { inlineMath } from "./math.js";

export function isVariationsPath(path: string): boolean {
  return path === "variations" || path === "signs";
}

function gridColumns(nPoints: number): string {
  const cols = ["auto"];
  for (let i = 0; i < nPoints; i++) {
    cols.push("minmax(2.4rem, 1fr)");
    if (i < nPoints - 1) cols.push("2.2rem");
  }
  return cols.join(" ");
}

interface Pt {
  x: string;
  y: string;
  zero: boolean;
}

/** Read the alternating `{pt}` / arrow|sign children in source order. */
function collect(node: ObjectNode): { points: Pt[]; between: string[] } {
  const points: Pt[] = [];
  const between: string[] = [];
  for (const c of node.children) {
    if (c.type !== "element") continue;
    const el = c as ElementNode;
    if (el.tag === "pt") {
      points.push({ x: el.attrs["x"] ?? "", y: el.attrs["y"] ?? "", zero: el.attrs["zero"] !== undefined });
    } else if (el.tag === "up" || el.tag === "down") {
      between.push(el.tag);
    } else if (el.tag === "s") {
      between.push(textOf(el));
    }
  }
  return { points, between };
}

function textOf(el: ElementNode): string {
  return el.children.map((c) => (c.type === "text" ? c.value : "")).join("").trim();
}

export function renderVariations(node: ObjectNode, katex: KatexLike | undefined, hashAttr: string): string {
  if (node.path === "signs") return renderSigns(node, katex, hashAttr);

  const { points, between: arrows } = collect(node);
  const varName = node.attrs["var"] ?? "x";
  const fnName = node.attrs["fn"] ?? "f(x)";

  // Position of each value: derived from the surrounding arrows.
  const pos = points.map((_, i) =>
    i === 0
      ? arrows[0] === "up"
        ? "bottom"
        : "top"
      : arrows[i - 1] === "up"
        ? "top"
        : "bottom",
  );

  let row1 = `<div class="htsl-vt-cell htsl-vt-r1 htsl-vt-label">${inlineMath(varName, katex)}</div>`;
  let row2 = `<div class="htsl-vt-cell htsl-vt-r2 htsl-vt-label">${inlineMath(fnName, katex)}</div>`;
  points.forEach((p, i) => {
    row1 += `<div class="htsl-vt-cell htsl-vt-r1 htsl-vt-x">${inlineMath(p.x, katex)}</div>`;
    row2 += `<div class="htsl-vt-cell htsl-vt-r2 htsl-vt-val htsl-vt-${pos[i]}">${inlineMath(p.y, katex)}</div>`;
    if (i < points.length - 1) {
      row1 += `<div class="htsl-vt-cell htsl-vt-r1"></div>`;
      row2 += `<div class="htsl-vt-cell htsl-vt-r2 htsl-vt-arrow">${arrows[i] === "up" ? "↗" : "↘"}</div>`;
    }
  });
  return wrap(gridColumns(points.length), row1 + row2, hashAttr);
}

function renderSigns(node: ObjectNode, katex: KatexLike | undefined, hashAttr: string): string {
  const { points, between: signs } = collect(node);
  const varName = node.attrs["var"] ?? "x";
  const fnName = node.attrs["fn"] ?? "f(x)";

  let row1 = `<div class="htsl-vt-cell htsl-vt-r1 htsl-vt-label">${inlineMath(varName, katex)}</div>`;
  let row2 = `<div class="htsl-vt-cell htsl-vt-r2 htsl-vt-label">${inlineMath(fnName, katex)}</div>`;
  points.forEach((p, i) => {
    row1 += `<div class="htsl-vt-cell htsl-vt-r1 htsl-vt-x">${inlineMath(p.x, katex)}</div>`;
    // a root shows a 0 in the value row, otherwise an empty separator cell
    row2 += `<div class="htsl-vt-cell htsl-vt-r2 htsl-vt-sign htsl-vt-zero">${p.zero ? "0" : ""}</div>`;
    if (i < points.length - 1) {
      row1 += `<div class="htsl-vt-cell htsl-vt-r1"></div>`;
      const sign = signs[i] ?? "";
      row2 += `<div class="htsl-vt-cell htsl-vt-r2 htsl-vt-sign">${sign === "+" ? "+" : sign === "-" ? "−" : sign}</div>`;
    }
  });
  return wrap(gridColumns(points.length), row1 + row2, hashAttr);
}

function wrap(columns: string, cells: string, hashAttr: string): string {
  return (
    `<div class="htsl-vt"${hashAttr}>` +
    `<div class="htsl-vt-grid" style="grid-template-columns:${columns}">${cells}</div>` +
    `</div>`
  );
}
