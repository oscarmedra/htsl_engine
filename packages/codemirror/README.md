# @htsl/codemirror

Extensions [CodeMirror 6](https://codemirror.net) réutilisables pour le langage
**HTSL** : coloration syntaxique, autocomplétion contextuelle et linter.

```bash
npm install @htsl/codemirror htsl codemirror
```

`@codemirror/*`, `@lezer/highlight` et `htsl` sont des **peerDependencies**.

## Ajouter un éditeur HTSL en moins de 10 lignes

```ts
import { EditorView, basicSetup } from "codemirror";
import { autocompletion } from "@codemirror/autocomplete";
import { parse, registry } from "htsl";
import { htslLanguage, htslCompletion, htslLinter } from "@htsl/codemirror";

new EditorView({
  parent: document.querySelector("#editor")!,
  doc: "{div.box:Bonjour {@mti: x^2}}",
  extensions: [
    basicSetup,
    htslLanguage(),
    autocompletion({ override: [htslCompletion(registry)] }),
    htslLinter(parse),
  ],
});
```

## API

| Export | Rôle |
|--------|------|
| `htslLanguage()` | `LanguageSupport` : coloration via un `StreamLanguage` écrit à la main (accolades, balises, `.classes`, `#id`, `[attributs]` — noms/valeurs/chaînes distingués —, `@objets`/composants, directives `{!define}`/`{!set}`, variables `{$x}`, math `$…$`/`$$…$$`, commentaires, échappements). Fournit aussi l'**indentation** (profondeur d'accolades : Entrée auto-indente, `}` se réindente). Côté éditeur, ajoutez `indentWithTab` au keymap pour Tab/Shift-Tab. |
| `htslCompletion(registry)` | Source d'autocomplétion contextuelle branchée sur l'introspection : `{@`→objets/composants (insérés comme **snippets à trous**), `/`→commande slash en début de ligne (objets, balises HTML, composants), `[`→attributs typés, `{$`→variables, `{!`→directives. Les snippets viennent du champ `snippet` des métadonnées. |
| `htslLinter(parse)` | Extension `linter` : diagnostics soulignés depuis les `HTSLError` du mode tolérant (ligne/colonne + message). |

Helpers : `htslTokens(src)` (tokenisation, pour tests/outils), `htslDiagnostics(text, parse)` (diagnostics bruts `{ line, col, message }`).

## Notes

- `htslCompletion` accepte n'importe quel objet d'introspection compatible
  (`list` / `describe` / `components` / `variables`) — passez `registry` de `htsl`,
  ou un registre étendu.
- Le linter utilise le **mode tolérant** du parser : il ne lève jamais, et chaque
  problème de syntaxe devient un diagnostic localisé.
