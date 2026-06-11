# HTSL — monorepo

Écosystème du langage **HTSL (HyperText Structured Language)** : un balisage
léger qui compile en HTML via un AST (formules KaTeX, scènes Plotly, composants,
repères).

## Paquets

| Paquet | Dossier | Description |
|--------|---------|-------------|
| `htsl` | [`packages/core`](packages/core) | Le moteur : lexer, parser, renderer, registre d'objets `@` + API d'introspection. Zéro dépendance dans le cœur. |
| `@htsl/codemirror` | [`packages/codemirror`](packages/codemirror) | Extensions CodeMirror 6 réutilisables : coloration, autocomplétion, linter. |
| _(privé)_ | [`playground`](playground) | App Vite : éditeur live (consomme `@htsl/codemirror`), rendu, AST. |

## Scripts (racine, npm workspaces)

```bash
npm install        # installe et lie tous les paquets
npm test           # teste tous les paquets
npm run build      # build tous les paquets
npm run dev        # lance le playground
```

## Documentation

- Moteur & langage : [`packages/core/README.md`](packages/core/README.md)
- Intégrer un éditeur HTSL : [`packages/codemirror/README.md`](packages/codemirror/README.md)
- Historique & décisions : `.docs/`, `.history/`
