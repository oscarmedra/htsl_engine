// Résolution portable du moteur HTSL + helpers partagés par lint.mjs / verify.mjs.
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

/** Charge @noah-medra/htsl-core, où qu'il soit. Ordre : $HTSL_CORE, paquet npm,
 *  puis packages/core/dist/index.js en remontant l'arborescence. */
export async function loadEngine() {
  if (process.env.HTSL_CORE) return import(pathToFileURL(process.env.HTSL_CORE).href);
  try { return await import("@noah-medra/htsl-core"); } catch { /* fallback */ }
  let dir = dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 10; i++) {
    const p = join(dir, "packages/core/dist/index.js");
    if (existsSync(p)) return import(pathToFileURL(p).href);
    const up = dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  throw new Error(
    "Moteur HTSL introuvable. Installe @noah-medra/htsl-core, exécute depuis le monorepo, " +
    "ou définis HTSL_CORE=/chemin/vers/packages/core/dist/index.js"
  );
}

/** KaTeX si disponible (valide les formules hors navigateur), sinon null. */
export async function loadKatex() {
  try { const k = await import("katex"); return k.default || k; } catch { return null; }
}

/** Extrait le HTSL : fichier .htsl brut, ou contenu du <script type="text/htsl"> d'un .html. */
export function extractHtsl(src, file) {
  if (/\.html?$/i.test(file)) {
    const m = src.match(/<script[^>]*type=["']text\/htsl["'][^>]*>([\s\S]*?)<\/script>/i);
    if (m) return m[1];
  }
  return src;
}

/** Parcours récursif de l'AST avec la pile des ancêtres (chemins @ canoniques). */
export function walk(nodes, visit, ancestors = []) {
  for (const n of nodes || []) {
    visit(n, ancestors);
    if (n.children) walk(n.children, visit, [...ancestors, n]);
  }
}
