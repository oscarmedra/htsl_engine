#!/usr/bin/env node
// lint — compilation stricte du HTSL : 0 erreur exigée avant toute livraison.
// Usage : node lint.mjs <fichier.htsl|.html> [autres…]
import { readFileSync } from "node:fs";
import { loadEngine, extractHtsl } from "./_engine.mjs";

const files = process.argv.slice(2);
if (!files.length) {
  console.error("usage : node lint.mjs <fichier.htsl|.html> [...]");
  process.exit(2);
}
const { compile } = await loadEngine();
let bad = 0;
for (const f of files) {
  let src;
  try { src = extractHtsl(readFileSync(f, "utf8"), f); }
  catch (e) { bad++; console.log(`❌ ${f} — lecture impossible : ${e.message}`); continue; }
  try { compile(src, { mode: "strict" }); console.log(`✅ ${f} — compile OK`); }
  catch (e) { bad++; console.log(`❌ ${f}\n${e.message}\n`); }
}
console.log(bad ? `\n${bad} fichier(s) en erreur.` : `\nTout compile (${files.length}).`);
process.exit(bad ? 1 : 0);
