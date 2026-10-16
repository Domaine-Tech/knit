# Changelog — v1.0.0

> Version 1.0.0 — Première Version Majeure & Déploiement Production.
> Statut : 📋 Planifié

---

## ✨ Nouveautés

- **Wizard d'initialisation en 3 étapes** :
  - Flux fluide pour créer un coffre-fort neuf avec configuration personnalisée.
  - Flux pour rejoindre un coffre-fort existant via ticket d'invitation P2P.
- **Fichier de partage `.knitshare`** :
  - Configuration d'équipe synchronisée automatiquement (nom, conventions, identité visuelle par défaut).
- **Collaboration visuelle en direct** :
  - Curseurs et sélections distants colorés avec initiales et étiquettes intelligentes rétractables.
  - Barre de présence affichant les collaborateurs et agents IA actifs en temps réel.
- **Volet Historique & Time Travel** :
  - Timeline chronologique des modifications (humaines, IA, P2P).
  - Comparateur de Diff bicolore instantané et restauration en 1 clic sans perte d'historique.
- **Panneau de préférences unifié** :
  - Réglage du thème clair/sombre, curseur HSL, diagnostics réseau P2P et gestion des pairs connectés.
  - Sélecteur de mode de suppression : Corbeille système de l'OS vs Corbeille 100% intégrée au coffre (`.knit/trash/`).
  - Volet dédié Corbeille avec prévisualisation des fichiers supprimés, restauration ciblée et vidage définitif.
- **Intégration OS native & packaging** :
  - Installateurs Windows officiels (`.msi`, `.exe`).
  - Packages Linux (`.AppImage`, `.deb`).
  - Icône de la barre d'état système (Tray) avec état de la synchronisation et raccourcis rapides.
  - Notifications système pour les événements clés (connexion d'un pair, fin de sync).

---

## 🐛 Corrections

- Stabilisation globale de l'OpLog et gestion robuste des réveils après veille système.

---

## 🔧 Technique

- Suite de tests end-to-end automatisés simulant des scénarios réels avec 2 pairs et modifications concurrentes.
- Optimisation de la mémoire vive (< 100 Mo au repos).

---

## 💥 Breaking Changes

- Stabilisation de l'API de vault et du protocole de synchronisation v1.
