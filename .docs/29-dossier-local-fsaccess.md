# 29 — Éditer un dossier local (File System Access)

Ouvrir un **clone local** d'un repo `.htsl`, éditer / créer / enregistrer les
fichiers **directement sur le disque**, puis commiter avec git. Aucun serveur,
aucun jeton, fonctionne avec les repos **privés**. Playground uniquement.

## Fonctionnement

- **📂 Dossier** (topbar) → `showDirectoryPicker({ mode: "readwrite" })`. Le tiroir
  liste tous les `.htsl` (récursif, chemins relatifs ; `.git`/`node_modules`/`dist`
  ignorés). « Ouvrir… » change de dossier.
- **Clic sur un fichier** → lu et chargé dans l'éditeur ; le nom + un point
  « ● » (non enregistré) s'affichent à côté de « Éditeur HTSL ».
- **Ctrl/Cmd + S** → réécrit le fichier courant sur le disque (`createWritable`).
- **＋ Nouveau** → crée un `.htsl` (sous-chemins `dossier/fichier.htsl` supportés).
- **Réouverture** : le handle du dernier dossier est gardé en **IndexedDB** ; le
  bouton retente de le rouvrir (une redemande d'autorisation) avant de proposer le
  sélecteur.
- **git reste à toi** : le playground n'écrit que les fichiers ; tu commits/push
  normalement.

## Détails

- `playground/src/files.ts` : `fsSupported`, `pickFolder`, `ensurePermission`
  (query/request), `listHtsl` (récursif), `readFile`, `writeFile`, `createFile`
  (crée les sous-dossiers), `rememberFolder`/`lastFolder` (IndexedDB).
- `main.ts` : état `currentDir`/`currentFile`/`fileDirty`/`loadingFile` ; hook
  « dirty » dans l'updateListener (ignoré pendant un chargement programmatique) ;
  `Ctrl/Cmd+S` global (preventDefault). Confirmation si on ouvre un autre fichier
  avec des modifications non enregistrées.
- Types de l'API encore inégaux selon les versions de TS → casts `any` bornés
  dans `files.ts`.
- **Repli** : navigateurs sans l'API (Firefox/Safari) → message + « Télécharger ».

## Vérification

Câblage vérifié en navigateur (bouton, tiroir, boutons Ouvrir/Nouveau, indicateur
de fichier présents ; `fsSupported` vrai ; aucune erreur console ; build OK).
⚠️ Le **flux réel** (sélecteur de dossier, lecture/écriture) exige un **vrai clic
utilisateur** et n'est pas automatisable — à valider côté utilisateur.
