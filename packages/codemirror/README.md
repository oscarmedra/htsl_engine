# @htsl/codemirror

Extensions [CodeMirror 6](https://codemirror.net) réutilisables pour le langage
**HTSL** : coloration syntaxique, autocomplétion contextuelle et linter.

```bash
npm install @htsl/codemirror @htsl/core codemirror
```

`@codemirror/*`, `@lezer/highlight` et `@htsl/core` sont des **peerDependencies**.

## Ajouter un éditeur HTSL en moins de 10 lignes

```ts
import { EditorView, basicSetup } from "codemirror";
import { keymap } from "@codemirror/view";
import { indentWithTab } from "@codemirror/commands";
import { autocompletion } from "@codemirror/autocomplete";
import { parse, registry } from "@htsl/core";
import { htslLanguage, htslCompletion, htslLinter } from "@htsl/codemirror";

new EditorView({
  parent: document.querySelector("#editor")!,
  doc: "{div.box:Bonjour {@mti: x^2}}",
  extensions: [
    basicSetup,
    htslLanguage(),                                              // coloration + indentation
    autocompletion({ override: [htslCompletion(registry)] }),    // snippets + commande slash
    htslLinter(parse),                                           // diagnostics
    keymap.of([indentWithTab]),                                  // Tab / Maj-Tab
  ],
});
```

> Ces trois extensions alimentent **les deux éditeurs du playground** : l'éditeur
> principal et l'éditeur de bloc flottant ouvert depuis le rendu — même
> coloration, même autocomplétion, même indentation.

## API

| Export | Rôle |
|--------|------|
| `htslLanguage()` | `LanguageSupport` : coloration via un `StreamLanguage` écrit à la main (accolades, balises, `.classes`, `#id`, `[attributs]` — noms/valeurs/chaînes distingués —, `@objets`/composants, directives `{!define}`/`{!set}`, variables `{$x}`, math `$…$`/`$$…$$`, commentaires, échappements). Le corps de `{script:…}`/`{style:…}` est coloré **comme du JS/CSS** (mots-clés, nombres, chaînes, commentaires, gabarits multi-lignes). Fournit aussi l'**indentation** (profondeur d'accolades : Entrée auto-indente, `}` se réindente) et le **pliage de code** (`foldService` : replie tout bloc `{…}`/`{@…}` multi-ligne ; accolades dans les chaînes/échappements ignorées). Côté éditeur, ajoutez `indentWithTab` au keymap, et `codeFolding()` + `foldGutter()` + `foldKeymap` pour la gouttière de pliage. |
| `htslCompletion(registry)` | Source d'autocomplétion contextuelle branchée sur l'introspection : `{@`→objets/composants (insérés comme **snippets à trous**), `/`→commande slash en début de ligne (objets, balises HTML, composants), `[`→attributs typés, `{$`→variables, `{!`→directives. Les snippets viennent du champ `snippet` des métadonnées. |
| `htslLinter(parse)` | Extension `linter` : diagnostics soulignés depuis les `HTSLError` du mode tolérant (ligne/colonne + message). |

Helpers : `htslTokens(src)` (tokenisation, pour tests/outils), `htslDiagnostics(text, parse)` (diagnostics bruts `{ line, col, message }`).

## Notes

- `htslCompletion` accepte n'importe quel objet d'introspection compatible
  (`list` / `describe` / `components` / `variables`) — passez `registry` de `@htsl/core`,
  ou un registre étendu.
- **Commande slash** : la source renvoie les entrées quand l'autocomplétion est
  ouverte sur un `/` en début de ligne. CodeMirror n'auto-active pas sur un
  non-mot ; l'hôte doit donc appeler `startCompletion(view)` quand l'utilisateur
  tape `/` seul en début de ligne (un `updateListener` suffit — voir
  `playground/src/main.ts`).
- Le linter utilise le **mode tolérant** du parser : il ne lève jamais, et chaque
  problème de syntaxe devient un diagnostic localisé.
- Tests : 29 (tokenisation, complétion, snippets, slash, indentation, linter).
