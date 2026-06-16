# HTSL — monorepo

**HTSL (HyperText Structured Language)** est un langage de balisage léger qui se
compile en HTML via un AST : une syntaxe concise (`{tag.classe:contenu}`), des
**formules** mathématiques (KaTeX), des **scènes géométriques** 2D/3D (Plotly),
des **composants** et **variables**, le tout introspectable et éditable
visuellement.

```htsl
{h1:Théorème de Pythagore}
{p:Dans un triangle rectangle : {@mti: a^2 + b^2 = c^2}.}
{@mg2.scene:
  {@mg2.frame[grid=true]/}
  {@mg2.circle[center="(0,0)", radius=2]/}
}
```

Ce dépôt est un **monorepo npm workspaces** en trois paquets : le moteur, des
extensions d'éditeur réutilisables, et un playground web.

## 🌐 Essayer / utiliser

- **Playground en ligne** : **https://oscarmedra.github.io/htsl_engine/** — écris du HTSL, vois le rendu, partage par lien.
- **Documentation** (dont le manuel d'intégration) : <https://oscarmedra.github.io/htsl_engine/documentation.html>
- **Installer le moteur** : `npm install @noah-medra/htsl-core` ([npm](https://www.npmjs.com/package/@noah-medra/htsl-core))
- **Sans build (CDN)** : `<script src="https://unpkg.com/@noah-medra/htsl-core/dist-min/htsl.auto.global.js"></script>`

---

## Les paquets

| Paquet | Dossier | Rôle | Doc |
|--------|---------|------|-----|
| **`@noah-medra/htsl-core`** | [`packages/core`](packages/core) | Le **moteur** : lexer, parser, renderer, expansion composants/variables, registre d'objets `@`, API d'introspection, conversion HTML→HTSL, **runtime** d'hydratation. **Zéro dépendance** dans le cœur (KaTeX/Plotly sont des peerDependencies optionnelles). | [README](packages/core/README.md) |
| **`@noah-medra/htsl-codemirror`** | [`packages/codemirror`](packages/codemirror) | Extensions **CodeMirror 6** réutilisables : coloration, autocomplétion contextuelle (snippets + commande slash), indentation, linter. Tout est généré depuis l'introspection du moteur. | [README](packages/codemirror/README.md) |
| **`playground`** _(privé)_ | [`playground`](playground) | App **Vite** : édition live, rendu isolé en iframe, **couche d'authoring** (palette d'insertion, aide contextuelle), **édition directe depuis le rendu** (texte et blocs). Consomme les deux paquets ci-dessus. | [README](playground/README.md) |

```
htsl_motor/
├─ packages/
│  ├─ core/         → "@noah-medra/htsl-core"        (le moteur, publié sur npm)
│  └─ codemirror/   → "@noah-medra/htsl-codemirror"  (extensions éditeur, publié)
├─ playground/      → app web (privée)
├─ .docs/           → documentation d'étapes (00…11) + index
└─ .history/        → journal des décisions
```

## Démarrage

```bash
npm install        # installe et lie tous les paquets (workspaces)
npm run dev        # lance le playground (Vite) → http://localhost:5173
npm test           # teste tous les paquets (core 184 + codemirror 29)
npm run build      # build tous les paquets
npm run typecheck  # typecheck tous les paquets
```

> Le playground importe le moteur et `@noah-medra/htsl-codemirror` directement (workspaces),
> avec rechargement à chaud — modifier le cœur se reflète aussitôt.

## Architecture en bref

- **Pipeline du moteur** : `source → lexer (tokens) → parser (AST) → expansion
  (composants/variables) → renderer (HTML)`. Le renderer émet aussi du JSON pour
  les scènes (`data-htsl-scene`) hydraté par Plotly côté page.
- **Tout est objet structuré** : balises HTML, formules, géométrie et composants
  partagent le même AST. Les objets `@` sont décrits dans un **registre
  introspectable** (`registry.list/describe/components`) qui alimente
  l'autocomplétion et la palette — **aucune liste codée en dur** côté outils.
- **Frameworks isolés** : le rendu se fait dans une **iframe**. On charge
  Tailwind, Bootstrap, KaTeX, Plotly… depuis le document HTSL lui-même, sans
  toucher à l'interface.
- **Édition bidirectionnelle** : le moteur peut attacher des **plages source**
  (`ranges: true`) aux nœuds texte et éléments, ce qui permet d'éditer le rendu
  et de réécrire le source (édition de texte sans syntaxe, ou édition d'un bloc
  HTSL entier).

## Capacités principales

- **Langage** : imbrication illimitée, classes/id/attributs, échappement,
  commentaires, conversion inverse **HTML → HTSL**.
- **Mathématiques** : `{@mti}`/`{@mtb}` (+ raccourcis `$…$`/`$$…$$`), équations
  numérotées et références croisées, align/cases/system, fractions — rendu KaTeX
  optionnel, repli LaTeX sinon.
- **Géométrie** : scènes 2D/3D, décor (repère / espace, plan complexe) vs
  acteurs (point, cercle, vecteur, sphère…), rendus en traces Plotly.
- **Composants & variables** : `{!define}`/`{@use}`, `{!set}`/`{$var}`,
  `{$children}`, résolus par expansion d'AST avant rendu.
- **Outillage éditeur** : coloration, autocomplétion (snippets à trous, commande
  `/`), indentation, linter — réutilisables dans n'importe quel CodeMirror.
- **Playground** : palette d'insertion classée (générée depuis l'introspection),
  aide contextuelle, édition du texte et **édition d'un bloc directement dans le
  rendu** (vrai éditeur HTSL translucide), panneaux éditeur/AST masquables.

## Sécurité

Échappement HTML **par défaut** de tout texte et de toute valeur d'attribut
(prévention XSS, non négociable). `allowedTags` transforme toute balise hors
liste en texte inerte. Le rendu du playground est sandboxé en iframe.

## Documentation

- **Moteur & langage** : [`packages/core/README.md`](packages/core/README.md)
- **Intégrer un éditeur HTSL** : [`packages/codemirror/README.md`](packages/codemirror/README.md)
- **Playground & authoring** : [`playground/README.md`](playground/README.md)
- **Étapes de développement** (lexer → … → couche d'authoring) :
  [`.docs/`](.docs/README.md) — un document par étape (00 à 11)
- **Journal des décisions** : [`.history/`](.history)

## Licence

MIT
