# Changelog — v1.1.1

> Patch : dépendances majeures, DevSecOps CI, validation du canal updater depuis v1.1.0.

## Nouveautés
- Job CI **DevSecOps** : gitleaks, `npm audit`, `cargo audit`, `cargo deny`.
- Prompt 11 : update deps (majeurs inclus) avant push `main` (`VERSIONING.md` §1ter).

## Corrections / Technique
- Rust : `notify` 8.2, `ed25519-dalek` 3, `rand` 0.10, `base64` 0.23.
- npm : TypeScript 7, `@types/node` 26 + lockfile à jour.
- Ignores RUSTSEC zip documentés (contrainte `tauri-plugin-updater`).

## Breaking Changes
- Aucun.
