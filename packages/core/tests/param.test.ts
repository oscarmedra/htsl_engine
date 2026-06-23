import { describe, expect, it } from "vitest";
import { compile, isParamPath } from "../src/index.js";

function scene(html: string): { data: Record<string, unknown>[] } {
  const m = html.match(/data-htsl-scene="([^"]*)"/);
  if (!m) throw new Error("no scene");
  return JSON.parse(m[1]!.replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">"));
}

describe("{@param} interactive parameter", () => {
  it("recognises the param path", () => {
    expect(isParamPath("param")).toBe(true);
    expect(isParamPath("math.plot.fn")).toBe(false);
  });

  it("renders a slider with the declared range and value (no script)", () => {
    const html = compile('{@param[name="a", min=-3, max=3, step=0.5, value=2]/}');
    expect(html).toContain('class="htsl-param-range"');
    expect(html).toContain('data-htsl-param-name="a"');
    expect(html).toContain('min="-3"');
    expect(html).toContain('max="3"');
    expect(html).toContain('value="2"');
    expect(html).toContain('data-htsl-param-value="a">2<');
    expect(html).not.toContain("<script>");
  });

  it("marks a {@plot} interactive when its fn uses a declared parameter", () => {
    const html = compile('{@param[name="a", value=2]/}{@plot[fn="a*sin(x)", xrange="(-3,3)"]/}');
    expect(html).toContain('data-htsl-fn="a*sin(x)"');
    expect(html).toContain('data-htsl-params="a"');
    expect(html).toContain('data-htsl-xrange="-3,3"');
  });

  it("samples the plot at compile time with the parameter's default value", () => {
    // a=2 → y = 2·sin(x); at x=0 (first sample of [0, …]) it is 0, at x=pi/2 → 2
    const html = compile('{@param[name="a", value=2]/}{@plot[fn="a*x", xrange="(0,1)", samples=2]/}');
    const ys = scene(html).data[0]!["y"] as number[];
    expect(ys).toEqual([0, 2]); // 2*0, 2*1
  });

  it("does not mark a plain plot (no parameter) interactive", () => {
    const html = compile('{@plot[fn="sin(x)", xrange="(-3,3)"]/}');
    expect(html).not.toContain("data-htsl-fn=");
  });
});
