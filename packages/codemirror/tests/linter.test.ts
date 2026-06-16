import { describe, expect, it } from "vitest";
import { parse } from "htsl-engine";
import { htslDiagnostics } from "../src/linter.js";

describe("htslDiagnostics", () => {
  it("reports an unclosed tag with line/column", () => {
    const ds = htslDiagnostics("{p:hello", parse);
    expect(ds).toHaveLength(1);
    expect(ds[0]!.message).toMatch(/jamais fermée/);
    expect(ds[0]!.line).toBe(1);
    expect(typeof ds[0]!.col).toBe("number");
  });

  it("reports an orphan closing brace", () => {
    expect(htslDiagnostics("hello}", parse).some((d) => /orpheline/.test(d.message))).toBe(true);
  });

  it("reports the error at the right line for multi-line input", () => {
    const ds = htslDiagnostics("{p:ok}\n{bad", parse);
    expect(ds.some((d) => d.line === 2 && /jamais fermée/.test(d.message))).toBe(true);
  });

  it("returns no diagnostics for valid input", () => {
    expect(htslDiagnostics("{p:ok}{div.box:{span:hi}}", parse)).toEqual([]);
  });

  it("never throws (tolerant) and reports something on malformed input", () => {
    expect(() => htslDiagnostics("{a[x=]:{@", parse)).not.toThrow();
    expect(htslDiagnostics("{a[x=]", parse).length).toBeGreaterThanOrEqual(1);
  });
});
