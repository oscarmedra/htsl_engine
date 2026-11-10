#!/usr/bin/env node
// verify — contrôle approfondi du rendu AVANT livraison (au-delà du lint) :
//   • compile strict (avec KaTeX si dispo → valide les formules)
//   • objets @ inexistants (isKnownObject) — ex. {@table} au lieu de {table}
//   • noeuds d'erreur en mode tolérant (accolades/formules déséquilibrées)
//   • balisage HTSL resté visible dans le rendu (« {@ », « ${ »)
//   • scène dynamique (Plotly/Three) DANS un {@slider} → boucle de ré-hydratation
//     en page autonome (vérifier dans un vrai navigateur)
//   • comptes (objets, formules, encadrés, slides, pages) pour le message de livraison
// NE remplace PAS la vérif visuelle navigateur (débordements, captures).
// Usage : node verify.mjs <fichier.htsl|.html> [...]
import { readFileSync } from "node:fs";
import { loadEngine, loadKatex, extractHtsl, walk } from "./_engine.mjs";

const files = process.argv.slice(2);
if (!files.length) { console.error("usage : node verify.mjs <fichier.htsl|.html> [...]"); process.exit(2); }

const eng = await loadEngine();
const { parse, compile, isKnownObject, resolvePath, documentComponents } = eng;
const katex = await loadKatex();
if (!katex) console.log("ℹ KaTeX absent : les formules ne sont pas validées ici (fais la vérif navigateur).");

const canon = (p) => { try { return resolvePath(p); } catch { return p; } };
const isDynamicScene = (cp) =>
  cp.startsWith("scene.3d") ||
  cp.startsWith("math.geometry") ||
  cp === "math.plot.fn" || cp.startsWith("math.plot") ||
  cp === "chart";

let totalProblems = 0;
for (const f of files) {
  const problems = [];
  const warnings = [];
  let src;
  try { src = extractHtsl(readFileSync(f, "utf8"), f); }
  catch (e) { console.log(`❌ ${f} — lecture impossible : ${e.message}`); totalProblems++; continue; }

  // 1) compile strict (+ KaTeX)
  try { compile(src, { mode: "strict", katex }); }
  catch (e) { problems.push("compile strict : " + e.message.split("\n")[0]); }

  // 2) AST tolérant pour l'analyse structurelle
  let ast = [];
  try { ast = parse(src, { mode: "tolerant" }); } catch (e) { problems.push("parse : " + e.message.split("\n")[0]); }

  // composants {!define} locaux : ne pas les signaler comme objets inexistants
  const defined = new Set();
  try { for (const c of documentComponents(ast) || []) defined.add(typeof c === "string" ? c : c?.name); } catch { /* ignore */ }

  const unknown = new Set();
  let nbObj = 0, nbInSlider = new Set();
  walk(ast, (n, anc) => {
    if (n.type === "error") problems.push(`erreur AST (l.${n.loc?.line ?? "?"}) : ${n.message || "balisage malformé"}`);
    if (n.type === "object") {
      nbObj++;
      if (!isKnownObject(n.path) && !defined.has(n.path)) unknown.add(n.path);
      const cp = canon(n.path);
      const inSlider = anc.some((a) => a.type === "object" && canon(a.path).startsWith("slider"));
      if (inSlider && isDynamicScene(cp)) nbInSlider.add(cp);
    }
  });
  for (const p of unknown) problems.push(`objet inexistant {@${p}} — vérifie le registre (objects.md) ; un élément HTML s'écrit sans @, ex. {table}`);
  for (const cp of nbInSlider) warnings.push(`scène dynamique {@${cp}} dans un {@slider} → risque de boucle de ré-hydratation en page autonome : sors la scène du slider, ou vérifie dans un vrai navigateur`);

  // 3) rendu + balisage resté VISIBLE (hors <style>/<script>/attributs → texte seul)
  let html = "";
  try { html = compile(src, { katex }); } catch { /* déjà signalé */ }
  const visible = html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]*>/g, "");
  if (/\{@|\$\{/.test(visible)) problems.push("balisage HTSL resté visible dans le rendu (« {@ ») — objet non reconnu / accolade de trop");

  // 4) comptes (indicatifs, pour la livraison)
  const count = (re) => (html.match(re) || []).length;
  const stats = {
    objets: nbObj,
    formules: count(/htsl-math-(inline|block)/g),
    encadrés: count(/htsl-callout/g),
    slides: count(/data-htsl-slide|htsl-slide(?!r)/g),
    pages: count(/htsl-doc-page|data-htsl-page/g),
    scènes: count(/htsl-scene|htsl-three/g),
  };

  const ok = problems.length === 0;
  console.log(`${ok ? "✅" : "❌"} ${f}`);
  console.log(`   ${Object.entries(stats).filter(([, v]) => v).map(([k, v]) => `${v} ${k}`).join(" · ") || "aucun objet"}`);
  for (const w of warnings) console.log(`   ⚠ ${w}`);
  for (const p of problems) console.log(`   ✗ ${p}`);
  if (!ok) totalProblems += problems.length;
  console.log("");
}
console.log(totalProblems ? `${totalProblems} problème(s) à corriger avant livraison.` : "Rien à signaler (hors vérif visuelle navigateur).");
process.exit(totalProblems ? 1 : 0);
