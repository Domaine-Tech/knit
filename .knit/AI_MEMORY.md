# Mémoire Agentique — Coffre Knit

> Registre inter-sessions (~400 tokens). Lire au démarrage ; mettre à jour à chaque jalon.

## 1. Principes & Stack
- Markdown pur sur disque ; pas de BDD propriétaire. React 19 / TS strict / Vite / CM6 Live Preview.
- Rust 2021, Tauri v2 (`knit-core` + `src-tauri`). CRDT Yjs P2P (Iroh/QUIC).
- Vues Doc-Driven : `note | kanban | table | image` (runtime). Médias `assets/` → `ImageView`.
- UI : `contextMenuStore`, tokens `--knit-hue`, zéro emoji (icônes vectorielles).

## 2. ADR Synthétiques
- **ADR-01 (B-043)** : Toute syntaxe/type/bloc → règles IA **et** exemple dans `demo_vault/`.
- **ADR-02 (B-052)** : Autocomplétion `[[` `[[#` `@` `@@` `#` `:` `/` + `KnitSuggestIndex` Rust.
- **ADR-03 (B-053)** : Smart Paste, Auto-Wrap, Tab tableaux, Hover Preview, journal `Ctrl+Shift+J`, backlinks.
- **ADR-04 (B-031a)** : Agenda global `@YYYY-MM-DD`, `@collaborateur`/`@vault` (Sprint 6ter).
- **ADR-05** : Handoff via ce fichier. **ADR-06** : 7 statuts tâches + `!p1..p3` + Mode Zen.
- **ADR-07** : Alignement versions (6 sources) à chaque commit/push/sprint.
- **ADR-08** : Zéro-Émoji UI. **ADR-09 (B-056)** : Debug global unique Header + HUD LP.

## 3. Historique Récent
- **[2026-10-18]** : Vue Image : clic tree média → onglet `docType: image` / `ImageView` (pas de lecture binaire MD).
- **[2026-10-18]** : Tree : médias `assets/` visibles (`tree.rs`) ; SVG schema sans chars de contrôle.
- **[2026-10-18]** : Fix LP mermaid : sauter tout le fence dans `buildDecorations` (sinon fermeture avalait image + knit-toc).
- **[2026-10-18]** : Clôture Sprint 6bis & UX (Prompt 10) : B-047a + micro-jauge `knit-tasks` ; runtime 0.3.0.
- **[2026-10-18]** : `KnitSelect` custom — plus de `<select>` natifs (`forms.css`).
- **[2026-10-17]** : B-056 debug ; Prompts 1–11 ; types `src/types/`.

## 4. Tâches Actives
- [x] Sprint 5 / 6 / 6bis clôturés (dont B-047 / B-047a).
- [ ] **Sprint 6ter** (v0.4.0) : B-031a Agenda & Calendrier Global.
- [ ] Suivi 💡 : B-057 (index FM Rust unifié).
- [ ] **B-043a** (Sprint 7) : Playbook exploitation IA à l'init coffre — doc only backlog, pas de code avant sprint.

