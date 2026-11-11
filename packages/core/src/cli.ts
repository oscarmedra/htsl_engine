#!/usr/bin/env node
/**
 * `htsl` — command-line interface for the HTSL engine (E1).
 *
 *   htsl check  <file.htsl>              syntax, unknown objects, KaTeX formulas
 *   htsl render <file.htsl> [-o out]     HTML (body) ; --standalone = full page
 *   htsl pdf    <file.htsl> [-o out]     print-ready standalone HTML (open → Save as PDF)
 *
 * Exit code 1 when `check` finds errors, or on any fatal error.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { basename } from "node:path";
import { compile, diagnose, mathCss, type Diagnostic, type KatexLike } from "./index.js";

const KATEX_CDN = "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css";

/** Try to load KaTeX so formulas can be validated / rendered; null if unavailable. */
async function loadKatex(): Promise<KatexLike | null> {
  try {
    const mod = (await import("katex")) as { default?: KatexLike } & KatexLike;
    return (mod.default ?? mod) as KatexLike;
  } catch {
    return null;
  }
}

function read(file: string): string {
  try {
    return readFileSync(file, "utf8");
  } catch {
    process.stderr.write(`htsl: fichier introuvable : ${file}\n`);
    process.exit(1);
  }
}

/** Pretty one-line report for a diagnostic. */
function formatDiagnostic(file: string, d: Diagnostic): string {
  const where = `${file}:${d.line}:${d.col}`;
  const hint = d.suggestion ? `  (essayez : ${d.suggestion})` : "";
  const line = d.excerpt !== undefined ? `\n  ${d.excerpt}\n  ${" ".repeat(Math.max(0, d.col - 1))}^` : "";
  return `${where}  ${d.severity}: ${d.message}${hint}${line}`;
}

async function cmdCheck(file: string): Promise<number> {
  const src = read(file);
  const katex = await loadKatex();
  const diags = diagnose(src, katex ? { katex } : {});
  if (diags.length === 0) {
    process.stdout.write(`✓ ${file} : aucun problème${katex ? "" : " (formules non validées — KaTeX absent)"}\n`);
    return 0;
  }
  for (const d of diags) process.stdout.write(formatDiagnostic(file, d) + "\n");
  const errors = diags.filter((d) => d.severity === "error").length;
  process.stdout.write(`\n${diags.length} problème(s), ${errors} erreur(s).\n`);
  return errors > 0 ? 1 : 0;
}

/** Wrap compiled body HTML into a self-contained, print-ready page. */
function standalone(bodyHtml: string, title: string): string {
  return (
    `<!doctype html>\n<html lang="fr">\n<head>\n<meta charset="utf-8">\n` +
    `<meta name="viewport" content="width=device-width, initial-scale=1">\n` +
    `<title>${title}</title>\n` +
    `<link rel="stylesheet" href="${KATEX_CDN}">\n` +
    `<style>\n${mathCss}\n</style>\n</head>\n<body>\n${bodyHtml}\n</body>\n</html>\n`
  );
}

async function cmdRender(file: string, out: string | null, full: boolean, chapters: boolean): Promise<number> {
  const src = read(file);
  const katex = await loadKatex();
  let html: string;
  try {
    html = compile(src, { ...(katex ? { katex } : {}), chapterNumbering: chapters });
  } catch (e) {
    process.stderr.write(`htsl: ${(e as Error).message}\n`);
    return 1;
  }
  const output = full ? standalone(html, basename(file).replace(/\.[^.]+$/, "")) : html;
  if (out) {
    writeFileSync(out, output);
    process.stdout.write(`écrit ${out}\n`);
  } else {
    process.stdout.write(output + "\n");
  }
  return 0;
}

async function cmdPdf(file: string, out: string | null, chapters: boolean): Promise<number> {
  const target = out ?? file.replace(/\.[^.]+$/, "") + ".html";
  const code = await cmdRender(file, target, true, chapters);
  if (code === 0) {
    process.stdout.write(
      `\nPage prête à l'impression : ${target}\n` +
        `Ouvre-la dans un navigateur puis « Imprimer → Enregistrer au format PDF ».\n` +
        `(Un navigateur ne peut pas écrire un PDF en ligne de commande sans outil dédié.)\n`,
    );
  }
  return code;
}

function usage(): void {
  process.stdout.write(
    `htsl — moteur HTSL\n\n` +
      `  htsl check  <fichier.htsl>              vérifie (syntaxe, objets inconnus, formules)\n` +
      `  htsl render <fichier.htsl> [-o out] [--standalone]   rend en HTML\n` +
      `  htsl pdf    <fichier.htsl> [-o out]     page HTML prête à imprimer en PDF\n`,
  );
}

async function main(): Promise<void> {
  const [cmd, ...rest] = process.argv.slice(2);
  const files = rest.filter((a) => !a.startsWith("-"));
  const outIdx = rest.findIndex((a) => a === "-o" || a === "--out");
  const out = outIdx >= 0 ? (rest[outIdx + 1] ?? null) : null;
  const full = rest.includes("--standalone");
  const chapters = rest.includes("--chapters");
  const file = files[0];

  if (!cmd || cmd === "-h" || cmd === "--help" || cmd === "help") {
    usage();
    process.exit(0);
  }
  if (!file && cmd !== "help") {
    process.stderr.write(`htsl: fichier manquant pour « ${cmd} ».\n`);
    usage();
    process.exit(1);
  }

  let code = 1;
  if (cmd === "check") code = await cmdCheck(file!);
  else if (cmd === "render") code = await cmdRender(file!, out, full, chapters);
  else if (cmd === "pdf") code = await cmdPdf(file!, out, chapters);
  else {
    process.stderr.write(`htsl: commande inconnue « ${cmd} ».\n`);
    usage();
    code = 1;
  }
  process.exit(code);
}

void main();
