# Architecture Technique de Knit

L'architecture de Knit repose sur 4 piliers technologiques majeurs :

1. **Tauri v2** : Empreinte mémoire minimale (< 30 Mo), démarrage instantané, sécurité native.
2. **CodeMirror 6** : Moteur d'édition modulaire, Live Preview sans latence, Live Preview HUD.
3. **CRDT Yjs & Iroh P2P** : Fusion en temps réel décentralisée sans serveur central obligatoire.
4. **Triple Garde WriteGuard Rust** : Protection contre toute boucle d'écriture entre le Watcher et le CRDT.
