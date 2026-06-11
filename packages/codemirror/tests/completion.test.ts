import { describe, expect, it } from "vitest";
import { EditorState } from "@codemirror/state";
import { CompletionContext, type CompletionResult } from "@codemirror/autocomplete";
import { registry } from "htsl";
import { htslCompletion } from "../src/completion.js";

const source = htslCompletion(registry);

function complete(doc: string): CompletionResult | null {
  const state = EditorState.create({ doc });
  const ctx = new CompletionContext(state, doc.length, true);
  return source(ctx) as CompletionResult | null;
}
const labels = (doc: string) => complete(doc)?.options.map((o) => o.label) ?? [];

describe("htslCompletion", () => {
  it("suggests objects (paths and aliases) after {@", () => {
    const l = labels("{@mg2.");
    expect(l).toContain("math.geometry.2d.frame");
    expect(l).toContain("mg2.frame");
    expect(l).toContain("repere");
  });

  it("suggests attributes of a known object after [", () => {
    const l = labels("{@mg3.sphere[").sort();
    expect(l).toEqual(["center", "color", "opacity", "radius"]);
  });

  it("suggests document variables after {$", () => {
    expect(labels("{!set theme: x}{!set size: 4}{p:{$")).toEqual(
      expect.arrayContaining(["theme", "size"]),
    );
  });

  it("suggests document components after {@ (updates as they are defined)", () => {
    expect(labels("{!define widget[size]:{div:{$size}}}{@")).toContain("widget");
  });

  it("suggests a component's parameters after [", () => {
    expect(labels("{!define card[title, color=indigo]:{div:x}}{@card[")).toEqual(
      expect.arrayContaining(["title", "color"]),
    );
  });

  it("suggests directives after {!", () => {
    expect(labels("{!")).toEqual(expect.arrayContaining(["define", "set"]));
  });

  it("returns nothing outside a completion context", () => {
    expect(complete("du texte ordinaire")).toBeNull();
  });
});
