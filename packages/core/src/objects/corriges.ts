/**
 * "Corrigés" context (B3): number every `{@exercise}` and `{@quiz}`, give each an
 * anchor, and assign it to the next `{@corriges}` in document order (so one per
 * chapter regroups that chapter's answers). The renderer uses this to turn an inline
 * exercise into a "→ voir le corrigé" link and to emit the regrouped solutions.
 */
import type { ElementNode, Node, ObjectNode } from "../types.js";

export interface CorrigeItem {
  kind: "exercise" | "quiz";
  n: number; // number within its kind
  id: string; // anchor on the inline element
  solId: string; // anchor on the regrouped solution
  /** True when a following {@corriges} regroups it (→ the inline item links to it). */
  inCorriges: boolean;
  title?: string | undefined;
  /** Exercise: the {solution:…} element. */
  solution?: ElementNode | undefined;
  /** Quiz: 0-based indices of the correct options, and the optional {explain:…}. */
  correct?: number[] | undefined;
  explain?: ElementNode | undefined;
}

export interface CorrigeContext {
  /** Inline exercise/quiz node → its item (number, anchors, section). */
  byNode: Map<ObjectNode, CorrigeItem>;
  /** The {@corriges} object → the items it regroups (in order). */
  sections: Map<ObjectNode, CorrigeItem[]>;
}

const els = (node: ObjectNode, tag: string): ElementNode[] =>
  node.children.filter((c): c is ElementNode => c.type === "element" && c.tag === tag);

export function buildCorrigeContext(nodes: Node[]): CorrigeContext {
  const byNode = new Map<ObjectNode, CorrigeItem>();
  const sections = new Map<ObjectNode, CorrigeItem[]>();

  // 1) Flatten exercises / quizzes / corriges in document order.
  type Ev = { kind: "exercise" | "quiz" | "corriges"; node: ObjectNode };
  const events: Ev[] = [];
  const walk = (node: Node): void => {
    if (node.type === "object") {
      if (node.path === "exercise") events.push({ kind: "exercise", node });
      else if (node.path === "quiz") events.push({ kind: "quiz", node });
      else if (node.path === "corriges") events.push({ kind: "corriges", node });
    }
    const kids = (node as { children?: Node[] }).children;
    if (Array.isArray(kids)) for (const c of kids) walk(c);
  };
  nodes.forEach(walk);

  // 2) Number items and attach each to the next {@corriges}.
  let exo = 0;
  let qz = 0;
  let pending: { ev: Ev; item: CorrigeItem }[] = [];
  for (const ev of events) {
    if (ev.kind === "corriges") {
      sections.set(
        ev.node,
        pending.map((p) => p.item),
      );
      for (const p of pending) { p.item.inCorriges = true; byNode.set(p.ev.node, p.item); }
      pending = [];
      continue;
    }
    if (ev.kind === "exercise") {
      const n = ++exo;
      const sol = els(ev.node, "solution")[0];
      pending.push({
        ev,
        item: {
          inCorriges: false,
          kind: "exercise",
          n,
          id: `htsl-exo-${n}`,
          solId: `htsl-corrige-exo-${n}`,
          title: ev.node.attrs["title"],
          solution: sol,
        },
      });
    } else {
      const n = ++qz;
      const correct = els(ev.node, "opt")
        .map((o, i) => (o.attrs["correct"] !== undefined && o.attrs["correct"] !== "false" ? i : -1))
        .filter((i) => i >= 0);
      pending.push({
        ev,
        item: {
          inCorriges: false,
          kind: "quiz",
          n,
          id: `htsl-quiz-${n}`,
          solId: `htsl-corrige-quiz-${n}`,
          correct,
          explain: els(ev.node, "explain")[0],
        },
      });
    }
  }
  // Items with no following {@corriges} still get numbered (inline solution kept).
  for (const p of pending) byNode.set(p.ev.node, p.item);

  return { byNode, sections };
}
