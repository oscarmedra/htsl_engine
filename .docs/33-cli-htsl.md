# CLI `htsl` (retour E1)

Interface en ligne de commande, bin `htsl` (`packages/core/dist/cli.js`), qui emballe
les API du cœur. Platform tsup gardée en « neutral » (le bundle `index.js` reste
utilisable navigateur) ; `cli.ts` est une 2ᵉ entrée, imports `node:` externes.

## Commandes

- `htsl check <fichier.htsl>` → syntaxe + objets inconnus (A4) + formules KaTeX (A5),
  avec `fichier:ligne:col`, extrait, caret `^` et suggestion. Exit 1 s'il y a des
  erreurs. KaTeX est chargé dynamiquement (`import("katex")`) ; absent → formules non
  validées (message explicite), le reste fonctionne.
- `htsl render <fichier.htsl> [-o out] [--standalone]` → HTML du corps (ou page
  autonome : `<style>mathCss</style>` + CSS KaTeX CDN + contenu).
- `htsl pdf <fichier.htsl> [-o out]` → écrit une page autonome **prête à imprimer** et
  explique d'ouvrir dans un navigateur → « Enregistrer au format PDF » (pas d'écriture
  PDF en CLI sans outil dédié — choix assumé, pas de dépendance lourde type puppeteer).

S'appuie sur `diagnose()` (A4/A5) et `compile()`. Tests : `cli.test.ts` (fumée sur le
binaire, ignorés si dist absent). Suite : 440.
