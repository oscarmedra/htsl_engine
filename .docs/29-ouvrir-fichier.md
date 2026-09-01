# 29 — Ouvrir & enregistrer un fichier .htsl (Brave inclus)

Ouvrir le **contenu d'un fichier** `.htsl` dans l'éditeur (au lieu du copier-coller)
et le réenregistrer — **dans tous les navigateurs, y compris Brave**.

## Pourquoi pas « ouvrir un dossier »

La première version utilisait l'API **File System Access** (`showDirectoryPicker`)
pour ouvrir un dossier entier. Mais **Brave désactive cette API** (choix de vie
privée) → le sélecteur de dossier ne s'ouvrait pas. Et le besoin réel était plus
simple : juste **un fichier**. On a donc pivoté.

## Fonctionnement (`files.ts` + `main.ts`)

- **📂 Ouvrir** (topbar) → `openFilePicker()` :
  - si `showOpenFilePicker` existe **et fonctionne** (Chrome/Edge) → on récupère un
    **handle** (permet la réécriture en place) ;
  - sinon (Brave/Firefox/Safari, ou API bloquée) → repli **`<input type="file">`**
    classique, universel.
- Le contenu est chargé dans l'éditeur ; le **nom** du fichier + un point **« ● »**
  (non enregistré) s'affichent à côté de « Éditeur HTSL ».
- **Ctrl/Cmd + S** :
  - avec un handle (Chrome/Edge) → **réécrit le fichier en place** (`writeBack`) ;
  - sinon (Brave…) → **télécharge** le `.htsl` (`downloadText`) sous son nom → tu
    remplaces le fichier dans ton repo et tu commits.
- Confirmation si on ouvre un autre fichier avec des modifications non enregistrées.
- git reste entièrement à toi.

## Détails

- `files.ts` : `openFilePicker` (FS Access → repli input), `canWriteBack`,
  `writeBack`, `downloadText`. Casts `any` bornés (types FS Access inégaux).
- `main.ts` : état `currentFile {handle?, name}` / `fileDirty` / `loadingFile` ;
  hook « dirty » dans l'updateListener (ignoré pendant un chargement) ; Ctrl/Cmd+S
  global (preventDefault).

## Vérifié

Câblage vérifié en navigateur (bouton « 📂 Ouvrir », plus d'ancien tiroir dossier,
`window.htslView` prêt donc le bloc s'exécute sans erreur). ⚠️ Le sélecteur de
fichier exige un vrai clic → à tester côté utilisateur (Brave = input + téléchargement).
