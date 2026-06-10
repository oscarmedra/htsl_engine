# 00 — Initialisation du projet

## Objectif

Mettre en place les fondations du projet : versionnement git et conventions de
suivi (documentation et historique).

## Étapes réalisées

### 1. Initialisation de git

- `git init` exécuté à la racine du projet.
- Branche par défaut renommée de `master` vers `main`.
- Premier commit créé avec les fichiers existants :
  - `.groupedtimelineinclude`
  - `.specs/brd.md`
  - `.specs/prd.md`
  - `.specs/requirements.md`

### 2. Mise en place des conventions de suivi

Deux dossiers sont maintenus en continu tout au long du développement :

- **`.docs/`** — documentation des différentes étapes (fichiers `.md`).
- **`.history/`** — journal continu de toutes les actions réalisées.

Ces dossiers doivent être créés s'ils n'existent pas, et tenus à jour au fur et
à mesure de l'avancement.

## État actuel

Le projet est versionné, sur la branche `main`, et les conventions de suivi sont
en place. Le développement applicatif n'a pas encore commencé (seules les specs
existent dans `.specs/`).
