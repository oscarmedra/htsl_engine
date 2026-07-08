/**
 * Semantic callout boxes for scientific documents:
 *   {@theorem[title="Pythagore", label=pyth]: … }
 *   {@definition: … }  {@example: … }  {@proof: … }  {@remark: … }  {@warning: … }
 *
 * Numbered types (théorème, définition, propriété, exemple) get a per-type
 * counter; a `{@ref[to=…]/}` resolves to "Théorème N" with a link. Pure render —
 * no JavaScript.
 */
import type { Node, ObjectNode } from "../types.js";

export interface CalloutType {
  path: string;
  /** French display name (singular). */
  name: string;
  numbered: boolean;
  /** CSS tone modifier (`htsl-callout-<tone>`). */
  tone: string;
  aliases: string[];
}

export const CALLOUT_TYPES: CalloutType[] = [
  // Theorem-like statements (numbered).
  { path: "callout.theorem", name: "Théorème", numbered: true, tone: "theorem", aliases: ["theorem", "theoreme", "thm"] },
  { path: "callout.proposition", name: "Proposition", numbered: true, tone: "proposition", aliases: ["proposition"] },
  { path: "callout.lemma", name: "Lemme", numbered: true, tone: "lemma", aliases: ["lemma", "lemme", "lem"] },
  { path: "callout.corollary", name: "Corollaire", numbered: true, tone: "corollary", aliases: ["corollary", "corollaire", "cor"] },
  { path: "callout.claim", name: "Assertion", numbered: true, tone: "claim", aliases: ["claim", "assertion"] },
  { path: "callout.conjecture", name: "Conjecture", numbered: true, tone: "conjecture", aliases: ["conjecture"] },
  // Foundations / statements (numbered).
  { path: "callout.definition", name: "Définition", numbered: true, tone: "definition", aliases: ["definition", "def"] },
  { path: "callout.axiom", name: "Axiome", numbered: true, tone: "axiom", aliases: ["axiom", "axiome"] },
  { path: "callout.property", name: "Propriété", numbered: true, tone: "property", aliases: ["property", "propriete", "prop"] },
  // Assumption & Hypothesis share one "Hypothèse" environment (single counter).
  { path: "callout.hypothesis", name: "Hypothèse", numbered: true, tone: "hypothesis", aliases: ["hypothesis", "assumption", "hypothese", "hyp"] },
  // Constructions & procedures (numbered).
  { path: "callout.construction", name: "Construction", numbered: true, tone: "construction", aliases: ["construction", "constr"] },
  { path: "callout.algorithm", name: "Algorithme", numbered: true, tone: "algorithm", aliases: ["algorithm", "algorithme", "algo"] },
  { path: "callout.example", name: "Exemple", numbered: true, tone: "example", aliases: ["example", "exemple", "ex"] },
  // Commentary (not numbered).
  { path: "callout.notation", name: "Notation", numbered: false, tone: "notation", aliases: ["notation"] },
  { path: "callout.observation", name: "Observation", numbered: false, tone: "observation", aliases: ["observation", "obs"] },
  { path: "callout.proof", name: "Démonstration", numbered: false, tone: "proof", aliases: ["proof", "preuve", "demo"] },
  { path: "callout.remark", name: "Remarque", numbered: false, tone: "remark", aliases: ["remark", "remarque", "rem"] },
  { path: "callout.warning", name: "Attention", numbered: false, tone: "warning", aliases: ["warning", "attention"] },
];

const BY_PATH = new Map(CALLOUT_TYPES.map((t) => [t.path, t]));

/** The cross-reference object: {@ref[to=label]/}. */
export const CALLOUT_REF_PATH = "callout.ref";

export function isCalloutPath(path: string): boolean {
  return BY_PATH.has(path);
}
export function calloutType(path: string): CalloutType | undefined {
  return BY_PATH.get(path);
}

/** Stable HTML id for a labelled callout (anchor for {@ref}). */
export function calloutId(tone: string, label: string): string {
  return `htsl-${tone}-${label.replace(/[^A-Za-z0-9_-]/g, "")}`;
}

export interface CalloutInfo {
  name: string;
  tone: string;
  number?: number;
}
export interface CalloutTarget {
  name: string;
  number: number;
  id: string;
}
export interface CalloutContext {
  info: Map<ObjectNode, CalloutInfo>;
  labels: Map<string, CalloutTarget>;
}

/** Pre-pass: number callouts per type and record labels (for {@ref}). */
export function buildCalloutContext(nodes: Node[]): CalloutContext {
  const counters = new Map<string, number>();
  const info = new Map<ObjectNode, CalloutInfo>();
  const labels = new Map<string, CalloutTarget>();

  const walk = (node: Node): void => {
    if (node.type === "object") {
      const t = BY_PATH.get(node.path);
      if (t) {
        let number: number | undefined;
        if (t.numbered) {
          number = (counters.get(t.path) ?? 0) + 1;
          counters.set(t.path, number);
        }
        info.set(node, { name: t.name, tone: t.tone, ...(number !== undefined ? { number } : {}) });
        const label = node.attrs["label"];
        if (label !== undefined && number !== undefined) {
          labels.set(label, { name: t.name, number, id: calloutId(t.tone, label) });
        }
      }
      node.children.forEach(walk);
    } else if (node.type === "element") {
      node.children.forEach(walk);
    }
  };

  nodes.forEach(walk);
  return { info, labels };
}
