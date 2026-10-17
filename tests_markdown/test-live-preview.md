---
type: note
titre: Demonstration Complete Live Preview
statut: en-cours
priorite: haute
assigne: Thomas
tags: [test, live-preview, sprint-6, markdown]
id: TEST-001
echeance: 2026-10-30
---

# Demonstration Complete Live Preview Knit

Ce document rassemble l'ensemble des fonctionnalites Markdown et des normes visuelles supportees par Knit v0.3.0. Il sert de banc d'essai pour valider le rendu dynamique Live Preview, la synchronisation du curseur et la coherence de la marge.

Consultez egalement les specifications d'architecture dans [[wiki/architecture|Architecture Technique]] et les principes fondamentaux dans [[wiki/piliers|Les 9 Piliers de Knit]].

---

## 1. Niveaux de Titres et Progression Automatique

### Sous-titre Niveau 3
#### Sous-titre Niveau 4
##### Sous-titre Niveau 5
###### Sous-titre Niveau 6 (Majuscules feutrees)

La barre de progression sous le titre principal calcule dynamiquement le pourcentage des taches de ce document.

---

## 2. Les 7 Statuts de Taches Standardises (B-054)

Chaque case ci-dessous est interactive. Un simple clic change son etat selon le cycle standardise :

- [ ] Tache standard a realiser (A faire)
- [/] Tache en cours d'execution (En cours avec jauge)
- [x] Tache validee et terminee (Fait avec texte barre)
- [-] Tache annulee ou abandonnee (Annule)
- [?] Tache en attente d'arbitrage ou question (Question)
- [>] Tache reportee a un sprint ulterieur (Reporte avec fleche)
- [!] Tache urgente necessitant une intervention immediate (Urgent)

---

## 3. Priorites Inline, Mentions et Echeances

- [ ] Corriger le conflit de synchronisation CRDT Yjs !p1 @Thomas @2026-10-20 14:00-15:30
- [ ] Optimiser la palette de couleurs d'accentuation !p2 @vault @2026-10-21
- [ ] Nettoyer les classes CSS obseletes !p3 due: 2026-10-25
- [ ] Deploiement de la version P2P sur le reseau Iroh !p1 @Thomas H.

---

## 4. Formatage Markdown Inline Enrichi

- **Texte en gras** pour souligner les elements essentiels.
- *Texte en italique* pour les nuances et precisions.
- ~~Texte barre~~ pour indiquer les elements depricies.
- `cargo run --release -p knit-app` pour le code en ligne.
- Lien Markdown externe : [Depot GitHub de Knit](https://github.com/Domaine-Tech/knit).
- WikiLink simple : [[accueil.md]].
- WikiLink avec alias : [[wiki/architecture|Consulter l'architecture]].
- WikiLink d'ancre : [[wiki/architecture#Moteur CRDT|Aller au Moteur CRDT]].
- Tags hierarchiques : #dev/rust/p2p #ui/codemirror #sprint-6

---

## 5. Tableaux Markdown GFM (Alignement Parfait 1:1 et Liens Interactifs)

Survolez les liens dans les cellules pour afficher l'aperçu dynamique flottant (US B-053). Utilisez **Ctrl + Clic** pour ouvrir la cible correspondante.

| Type de Cible | Intitulé | Destinataire / Statut | Lien Interactif | Action Attendue |
| :--- | :--- | :---: | :--- | :--- |
| **Note Existante** | Document long | `Validé` | [[test-long-document.md]] | Ouvre la note avec aperçu snippet |
| **Alias WikiLink** | Vue Synthétique | `Actif` | [[test-table.md\|Inventaire Composants]] | Ouvre la vue Tableau |
| **Tableau Kanban** | Tâches P2P | `En cours` | [[test-kanban.md]] | Ouvre le tableau Kanban |
| **Ancre Interne** | Statuts de tâches | `Local` | [[#2. Les 7 Statuts de Taches Standardises (B-054)]] | Défile vers la section 2 |
| **Lien Web Externe** | GitHub Repo | `HTTPS` | [Dépôt GitHub Knit](https://github.com/Domaine-Tech/knit) | Ouvre le navigateur système |
| **URL Brute** | Documentation | `Web` | https://github.com/Domaine-Tech/knit | Ouvre le navigateur |
| **Dossier Local** | Configuration | `Dossier` | [Dossier .knit](./.knit/) | Ouvre l'explorateur de fichiers |
| **Fichier Externe** | Cahier des charges | `Document` | [Spécification Office](./spec-technique.docx) | Ouvre avec l'application par défaut |

Second tableau technique pour valider la synchronisation et l'absence totale de décalage :

| Port | Protocole | Service | Rôle et Lien |
| :--- | :--- | :--- | :--- |
| 11200 | QUIC / UDP | Iroh P2P | Transport pair-à-pair [[test-long-document.md\|Protocole]] |
| 5173 | HTTP / TCP | Vite Dev Server | Interface [Vite Localhost](http://localhost:5173) |
| 1420 | IPC / Rust | Tauri v2 | Pont natif multiplateforme |

---

## 6. Scripts et Blocs de Code avec Bouton Copier

### Script PowerShell de maintenance

```powershell
.\.scripts\audit-fiches-md.ps1
# Corriger automatiquement les blocs de code non types :
.\.scripts\audit-fiches-md.ps1 -FixCodeBlocks
Get-Process | Where-Object { $_.ProcessName -like "*knit*" }
```

### Script Shell Unix / Bash

```bash
#!/usr/bin/env bash
# Verifier la conformite du depot Knit
echo "Lancement des verifications..."
cargo test --workspace
npm run lint --prefix knit-app
echo "Verifications terminees avec succes."
```

### Module TypeScript

```typescript
// Interface de configuration d'un noeud pair P2P
export interface PeerConfig {
  nodeId: string;
  listenPort: number;
  enableRelay: boolean;
  heartbeatIntervalMs: number;
}

export function createPeerNode(config: PeerConfig): Promise<void> {
  console.log("Initialisation du noeud P2P :", config.nodeId);
  return Promise.resolve();
}
```

### Configuration JSON

```json
{
  "name": "knit-demo-vault",
  "version": "0.3.0",
  "features": {
    "crdt": true,
    "p2p": true,
    "livePreview": true
  }
}
```

---

## 7. Diagrammes Mermaid Inline

```mermaid
graph TD
    A[Editeur Markdown Pure] --> B(Moteur CodeMirror 6)
    B --> C{Vue Doc-Driven}
    C -->|type: kanban| D[Tableau Kanban Visuel]
    C -->|type: table| E[Vue Tableau Filtrable]
    C -->|type: note| F[Live Preview Obsidian]
    F --> G[Synchronisation Yjs P2P]
```

---

## 8. Callouts GFM (Alertes Feutrees)

> [!NOTE]
> Information contextuelle sobre : le formatage CommonMark est applique a la volee sans transformer le document en format proprietaire.

> [!TIP]
> Raccourci clavier : utilisez Ctrl+E pour basculer instantanement entre la vue visuelle et le code source brut.

> [!WARNING]
> Attention lors de la modification des en-tetes YAML : veillez a conserver les tirets triples de delimitation.

> [!IMPORTANT]
> L'interoperabilite avec Obsidian et VS Code est garantie par l'absence totale de base de donnees centrale.

---

## 9. Citations et Listes Imbriquees

> La simplicite est la condition prealable a la fiabilite.
> — Edsger W. Dijkstra

1. Premier point structure
   - Sous-element detaille A
   - Sous-element detaille B
2. Deuxieme point structure
   - Validation croisee
   - Synchronisation sans conflit

---

## 10. Images et Médias Intégrés

Image d'architecture réseau avec légende :

![Architecture Réseau P2P Iroh & Synchronisation Décentralisée](https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1200&q=80)

Espace de travail feutré et minimaliste :

![Espace de travail minimaliste Knit](https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80)

Test de fallback gracieux sur image introuvable :

![Schéma local non présent dans le coffre](./assets/schema-inexistant.png)

