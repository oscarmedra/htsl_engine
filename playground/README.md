# HTSL — Playground

Éditeur web interactif pour le moteur HTSL : édition à la frappe, rendu live
(KaTeX + Plotly), AST repliable, coloration syntaxique et autocomplétion
contextuelle branchée sur l'API d'introspection du moteur.

## Démarrage

Depuis la racine du dépôt (workspace) :

```bash
npm install
npm run playground         # serveur de dev (Vite)
npm run playground:build   # build statique → playground/dist/
```

ou depuis ce dossier : `npm run dev` / `npm run build`.

Le moteur est importé depuis `../src` via un alias Vite (rechargement à chaud).

## Fonctionnalités

- **Trois panneaux redimensionnables** : éditeur CodeMirror 6 · rendu HTML · AST
  JSON (masquable via la case « AST »).
- **Rendu à la frappe** (debounce ~150 ms), **parser tolérant** : les erreurs
  s'affichent en bandeau ET sont soulignées dans l'éditeur (ligne/colonne de
  `HTSLError`). La page ne casse jamais.
- **Coloration syntaxique** HTSL écrite à la main (StreamLanguage) : accolades,
  balises, `.classes`, `#id`, `[attributs]`, `@objets`/composants, directives
  `{!define}`/`{!set}`, variables `{$x}`, math `$…$`/`$$…$$`, commentaires,
  échappements.
- **Autocomplétion contextuelle** (API d'introspection) :
  - après `{@` : objets et composants (chemins et alias, avec description) ;
  - après `[` : attributs de l'objet (types et défauts) ;
  - après `{$` : variables du document ;
  - après `{!` : directives.
  Les suggestions se mettent à jour quand on définit de nouveaux composants.
- **KaTeX** et **Plotly** chargés par le playground et injectés au moteur
  (architecture peerDependency).
- **Exemples préchargés**, boutons **Copier HTML** / **Télécharger** / **Partager**
  (lien par hash d'URL, rechargé à l'ouverture).

## Tailwind

Le **Tailwind Play CDN** (JIT au runtime) est chargé : les classes Tailwind
écrites dans le HTSL sont stylées dans le panneau de rendu. Écrivez-les via
l'attribut `class` (chaîne entre guillemets), car le raccourci `.classe` n'accepte
que des identifiants simples (pas de `:` ni `/`) :

```htsl
{div[class="bg-white ring-1 ring-slate-200 rounded-xl p-4 hover:shadow-md"]:
  {h2[class="text-lg font-semibold text-indigo-600"]:Titre}
}
```

Les variantes (`hover:`, `md:`, `w-1/2`, valeurs arbitraires `p-[10px]`) passent
toutes par `[class="…"]`. Le *Preflight* (reset global) est désactivé pour ne pas
perturber l'interface du playground — utilisez `ring-1` plutôt que `border` pour
les contours. Voir l'exemple « Mise en page Tailwind ».

