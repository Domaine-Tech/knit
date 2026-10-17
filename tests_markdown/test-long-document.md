---
type: note
titre: Test de Robustesse et Long Document (500+ lignes)
statut: en-cours
priorite: haute
tags: [stress-test, performance, scroll, alignment]
id: STRESS-001
---

# Test de Robustesse et Long Document - 500 Lignes

Ce document sert de banc d'essai exhaustif pour valider :
1. L'alignement parfait 1:1 entre les numeros de ligne dans la gouttiere et le texte a l'ecran.
2. La precision du curseur lors d'un clic de souris a la ligne 50, 100, 200, 300, 400 ou 500.
3. L'absence totale de decalage cumulatif du a des tableaux, des blocs de code ou des en-tetes.

---

## Section 01 : Fondations et Architecture

Paragraphe d'introduction sur l'architecture distribuée de Knit.
L'objectif est d'assurer une expérience fluide même sur des fiches techniques très denses.
Chaque ligne ci-dessous permet de vérifier que la hauteur calculée par CodeMirror correspond exactement à l'affichage réel.

- Ligne de liste 01 : Verification du calcul de hauteur
- Ligne de liste 02 : Absence de marges parasites sur les paragraphes
- Ligne de liste 03 : Fluidite du defilement vertical
- Ligne de liste 04 : Maintien du focus lors de la frappe
- Ligne de liste 05 : Coherence de l'indexation Yjs

Texte explicatif complementaire pour intercaler des blocs de texte standards.
Le moteur de rendu Live Preview doit traiter les balises Markdown sans rompre l'arborescence du document virtuel.

---

## Section 02 : Premier Tableau de Donnees

Ce tableau teste la transition d'un bloc de texte vers une grille sans perturber les numeros de lignes de la gouttiere.

| Index | Nom du Service | Port Ecoute | Protocole | Etat |
| :--- | :--- | :---: | :---: | ---: |
| 001 | Daemon Iroh P2P | 11200 | QUIC / UDP | `Actif` |
| 002 | Vite React Server | 5173 | HTTP / TCP | `Actif` |
| 003 | Pont IPC Tauri | 1420 | Local IPC | `Pret` |
| 004 | File Watcher Rust | N/A | inotify / kqueue | `Ecoute` |
| 005 | Indexeur Tantivy | N/A | Memoire | `Veille` |

Paragraphe immediatement sous le tableau pour tester le clic direct apres la derniere ligne de tableau.
Si vous cliquez sur cette phrase, le curseur doit atterrir tres exactement ici sans aucun decalage vers le haut ou vers le bas.

---

## Section 03 : Blocs de Scripts et Commandes Shell

Exemple de script d'administration systeme pour valider les blocs de code en plein milieu du document.

```powershell
# Script de verification d'integrite du coffre Knit
Write-Host "Verification des metadonnees YAML..." -ForegroundColor Cyan
Get-ChildItem -Path . -Filter "*.md" -Recurse | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    if ($content -match "^---\r?\n") {
        Write-Host "OK : $($_.Name)" -ForegroundColor Green
    } else {
        Write-Warning "Frontmatter manquant : $($_.Name)"
    }
}
```

Paragraphe de transition apres le premier bloc de script.
Les commentaires du script ci-dessus sont colores en gris discret et le bouton Copier est accessible en haut a droite.

```bash
#!/usr/bin/env bash
# Script Unix equivalent
for file in $(find . -name "*.md"); do
    head -n 1 "$file" | grep -q "^---" && echo "Valide: $file" || echo "Invalide: $file"
done
```

---

## Section 04 : Liste de Taches et Suivi Operationnel

Test de la liste des taches avec statuts et priorites :

- [x] Initialiser le projet Tauri v2 avec React 19 et Vite
- [x] Integrer CodeMirror 6 avec support complet de Markdown
- [x] Configurer la police a chasse fixe pour les blocs de code
- [/] Valider l'alignement de la marge de gauche sur les longs documents
- [/] Optimiser le rendu dynamique des tableaux Markdown GFM
- [?] Envisager la prise en charge des diagrammes de Gantt Mermaid
- [!] Corriger immediatement tout saut visuel lors de la frappe en bas de page
- [>] Reporter l'exportation PDF avancee a la version v0.4.0
- [-] Abandonner l'idee d'une base de donnees SQLite centrale pour rester 100% Markdown pur

---

## Section 05 : Second Tableau Technique

| Parametre | Valeur par Defaut | Plage Autorisee | Unite | Description |
| :--- | :--- | :--- | :--- | :--- |
| `heartbeat_ms` | 5000 | 1000 - 60000 | ms | Frequence de signalisation P2P |
| `max_peers` | 32 | 1 - 256 | unites | Nombre maximal de pairs connectes |
| `debounce_ms` | 100 | 20 - 500 | ms | Temporisation de la garde d'ecriture |
| `theme_hue` | 215 | 0 - 360 | deg | Teinte d'accentuation HSL |
| `reading_width` | 760 | 600 - 1600 | px | Largeur de confort de lecture |

Observation : ce second tableau demontre que meme apres plusieurs structures tabulaires, la marge de gauche reste parfaitement coordonnee avec chaque ligne.

---

## Section 06 : Paragraphes de Remplissage et Test de Navigation

Paragraphe 01 : L'informatique distribuee repose sur des compromis clairs entre disponibilite et coherence.
Paragraphe 02 : Dans Knit, l'approche Local-First accorde une priorite absolue a la continuite du travail local.
Paragraphe 03 : Tout fichier est stocke sur le disque dur de l'utilisateur sous forme de texte brut.
Paragraphe 04 : Aucune coupure de reseau ne peut interrompre la saisie de texte.
Paragraphe 05 : Lorsque deux utilisateurs modifient la meme note en meme temps, l'algorithme Yjs resout les conflits sans perte.
Paragraphe 06 : La synchronisation utilise des deltas minimaux transmis via le protocole QUIC.
Paragraphe 07 : L'absence de serveur central garantit une confidentialite totale.
Paragraphe 08 : Chaque coffre-fort numerique est autonome et portable.
Paragraphe 09 : Les metadonnees Frontmatter sont preservees intactes d'un outil a l'autre.
Paragraphe 10 : Cette neutralite technique assure la perennite des ecrits sur plusieurs decennies.

---

## Section 07 : Code TypeScript et Logique Metier

```typescript
// Structure representant un delta de synchronisation Yjs
export interface SyncMessage {
  type: "sync-step-1" | "sync-step-2" | "sync-update";
  docId: string;
  payload: Uint8Array;
  timestamp: number;
}

export function handleIncomingUpdate(msg: SyncMessage): void {
  // Application du delta binaire sur le document Yjs local
  if (msg.payload.length > 0) {
    console.log(`Application de la mise a jour pour ${msg.docId} (${msg.payload.length} octets)`);
  }
}
```

---

## Section 08 : Troisieme Tableau de Synthese

| Module | Fichier Source | Lignes de Code | Statut Test |
| :--- | :--- | :---: | :---: |
| livePreviewExtension | `livePreviewExtension.ts` | ~600 | `Passe` |
| mermaidExtension | `mermaidExtension.ts` | ~250 | `Passe` |
| smartUxExtension | `smartUxExtension.ts` | ~180 | `Passe` |
| vaultStore | `vaultStore.ts` | ~1300 | `Passe` |
| crdtManager | `crdtManager.ts` | ~450 | `Passe` |

---

## Section 09 : Alertes et Citations Prolongees

> [!NOTE]
> Cette note d'information teste le comportement des bordures laterales colorees sur les fichiers longs.

> [!TIP]
> Astuce d'edition : tapez deux crochets pour declencher l'autocompletion omni-trigger unifiee.

> [!WARNING]
> Les modifications directes hors de Knit doivent respecter l'encodage UTF-8 sans BOM.

---

## Section 10 : Conclusion du Document de Test

Paragraphe final situe au-dela de la ligne 250 du document.
Si vous faites defiler la page jusqu'ici et que vous cliquez sur n'importe quel mot de cette derniere phrase :
- Le curseur doit atterrir exactement la ou pointe votre souris.
- Le numero de ligne actif a gauche dans la marge doit correspondre tres exactement a la ligne courante.
- Aucun ecart ni scintillement ne doit survenir.
