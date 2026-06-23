import { describe, expect, it } from "vitest";
import { compile, isChartPath } from "../src/index.js";

/** Compile HTSL and decode the Plotly figure embedded in the htsl-scene node. */
function spec(src: string): { data: Record<string, unknown>[]; layout: Record<string, unknown> } {
  const m = compile(src).match(/data-htsl-scene="([^"]*)"/);
  if (!m) throw new Error("no scene node");
  const json = m[1]!.replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
  return JSON.parse(json);
}

describe("{@chart}", () => {
  it("recognises the chart path", () => {
    expect(isChartPath("chart")).toBe(true);
    expect(isChartPath("math.plot.fn")).toBe(false);
  });

  it("emits a declarative Plotly scene node (no script)", () => {
    const html = compile('{@chart[type="bar"]: {pt[x="A", y=1]/}}');
    expect(html).toContain('class="htsl-scene');
    expect(html).toContain("data-htsl-scene=");
    expect(html).not.toContain("<script>");
  });

  it("builds a bar chart from {pt} points", () => {
    const d = spec('{@chart[type="bar", title="Notes"]: {pt[x="Lun", y=12]/} {pt[x="Mar", y=19]/}}').data[0]!;
    expect(d["type"]).toBe("bar");
    expect(d["x"]).toEqual(["Lun", "Mar"]);
    expect(d["y"]).toEqual([12, 19]);
  });

  it("builds a pie chart (labels + values)", () => {
    const d = spec('{@chart[type="pie"]: {pt[x="A", y=30]/} {pt[x="B", y=70]/}}').data[0]!;
    expect(d["type"]).toBe("pie");
    expect(d["labels"]).toEqual(["A", "B"]);
    expect(d["values"]).toEqual([30, 70]);
  });

  it("builds a histogram from the values attribute", () => {
    const d = spec('{@chart[type="histogram", values="2,3,3,4", bins=4]/}').data[0]!;
    expect(d["type"]).toBe("histogram");
    expect(d["x"]).toEqual([2, 3, 3, 4]);
    expect(d["nbinsx"]).toBe(4);
  });

  it("keeps numeric x numeric (line) and defaults to bar", () => {
    const line = spec('{@chart[type="line"]: {pt[x=1, y=2]/} {pt[x=2, y=5]/}}').data[0]!;
    expect(line["type"]).toBe("scatter");
    expect(line["x"]).toEqual([1, 2]);
    expect(spec("{@chart: {pt[x=\"A\", y=1]/}}").data[0]!["type"]).toBe("bar");
  });
});
