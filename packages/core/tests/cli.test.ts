import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { existsSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const cli = fileURLToPath(new URL("../dist/cli.js", import.meta.url));
const run = (args: string[]): { out: string; code: number } => {
  try {
    const out = execFileSync("node", [cli, ...args], { encoding: "utf8" });
    return { out, code: 0 };
  } catch (e) {
    const err = e as { status?: number; stdout?: string };
    return { out: err.stdout ?? "", code: err.status ?? 1 };
  }
};

// Smoke tests against the built binary; skipped when the dist is not built yet.
describe.skipIf(!existsSync(cli))("htsl CLI (E1)", () => {
  const dir = existsSync(cli) ? mkdtempSync(join(tmpdir(), "htsl-")) : "";

  it("check: reports errors and exits 1", () => {
    const f = join(dir, "bad.htsl");
    writeFileSync(f, "{@table:x}\n");
    const { out, code } = run(["check", f]);
    expect(out).toContain("objet inconnu {@table}");
    expect(code).toBe(1);
  });

  it("check: clean file exits 0", () => {
    const f = join(dir, "ok.htsl");
    writeFileSync(f, "{p:bonjour {strong:toi}}\n");
    const { out, code } = run(["check", f]);
    expect(out).toContain("aucun problème");
    expect(code).toBe(0);
  });

  it("render: emits HTML", () => {
    const f = join(dir, "r.htsl");
    writeFileSync(f, "{h1:Titre}\n");
    expect(run(["render", f]).out).toContain("<h1>Titre</h1>");
  });
});
