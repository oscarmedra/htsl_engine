# Documentation — htsl_motor

Ce dossier contient la documentation des différentes étapes du développement du projet.

Chaque étape majeure du développement est documentée dans un fichier `.md` dédié,
décrivant ce qui a été fait, pourquoi, et comment cela fonctionne.

## Index des documents

| Document | Description |
|----------|-------------|
| `README.md` | Présentation du dossier de documentation (ce fichier) |
| `00-initialisation.md` | Initialisation du dépôt git et mise en place des conventions |
| `01-moteur-htsl-v0.1.md` | Première version fonctionnelle du moteur HTSL (lexer, parser, renderer, API, tests) |
| `02-conversion-html-vers-htsl.md` | Conversion inverse HTML → HTSL (parseHtml, toHtsl, fromHtml) |
| `03-collection-math-text.md` | Fondation des objets `{@...}` + collection math.text.* (LaTeX/KaTeX, numérotation, refs) |
| `04-composants-et-variables.md` | Composants `{!define}`/`{@use}` et variables `{!set}`/`{$var}` par expansion d'AST |
| `05-geometrie-plotly.md` | Objets géométriques (mg2/mg3) rendus en traces Plotly via un conteneur `scene` |
| `06-reperes-scene.md` | Objets de repère (décor) : `mg2.frame`/`repere`, `mg3.space`, plan complexe + `cpoint` |
| `07-introspection-et-playground.md` | API d'introspection (registry.list/describe) + playground web Vite/CodeMirror |
