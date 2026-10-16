pub mod error;
pub mod markdown;
pub mod network;
pub mod vault;
pub mod watcher;

pub use error::{KnitError, Result};
pub use markdown::{
    compute_relative_path, find_backlinks_in_vault, get_frontmatter_field, parse_frontmatter,
    refactor_links_in_content, refactor_links_in_vault, update_frontmatter_field, FrontmatterDoc,
    LinkRefactorReport,
};
pub use network::{
    compute_blake3_hash, create_invitation, handle_blob_request, store_verified_blob,
    BlobMessage, ConnectedPeerInfo, DiscoveredLanPeer, InvitationTicket, KnitNetworkNode,
    KnitSyncMessage, MdnsService, RemoteNetworkEvent, ALPN_BLOBS, ALPN_SYNC, INVITATION_PREFIX,
};
pub use vault::assets::save_asset;
pub use vault::identity::{
    compute_deterministic_color_index, compute_initials, load_or_generate_identity, PeerIdentity,
    AI_AGENT_COLOR, COLLABORATIVE_PALETTE,
};
pub use vault::tree::{
    commit_trash_to_os, create_dir, create_file, delete_path, read_file_content, read_vault_tree,
    recover_orphaned_trash, rename_file_and_refactor, resolve_safe_path, restore_trash_path,
    trash_path, FileNode, TrashRecord, write_file_content, write_file_content_with_guard,
};
pub use watcher::guard::WriteGuard;
pub use watcher::service::{VaultWatchEvent, VaultWatcher};

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn test_write_guard_behavior() {
        let guard = WriteGuard::new();
        let path = std::path::Path::new("note.md");
        let content1 = b"# Hello Knit";
        let content2 = b"# Hello Knit Modified";

        // Knit commence à écrire
        guard.begin_write(path, content1);
        assert!(!guard.is_external_change(path, content1));

        // Knit termine l'écriture
        guard.end_write(path);
        // Même contenu renvoyé par le watcher -> ignoré
        assert!(!guard.is_external_change(path, content1));

        // Modification par un agent externe (contenu différent)
        assert!(guard.is_external_change(path, content2));
    }

    #[test]
    fn test_vault_tree_and_file_ops() {
        let dir = tempdir().expect("tempdir creation");
        let vault_root = dir.path();

        // Créer des fichiers
        vault::tree::create_file(vault_root, "accueil.md", Some("# Accueil\nBienvenue dans Knit")).expect("create_file");
        vault::tree::create_dir(vault_root, "wiki").expect("create_dir");
        vault::tree::create_file(vault_root, "wiki/architecture.md", Some("# Archi")).expect("create_file in subdir");

        // Lire l'arbre
        let tree = vault::tree::read_vault_tree(vault_root).expect("read_vault_tree");
        assert_eq!(tree.len(), 2); // wiki (dir) et accueil.md (file)
        assert_eq!(tree[0].name, "wiki");
        assert!(tree[0].is_dir);
        assert_eq!(tree[0].children.len(), 1);
        assert_eq!(tree[1].name, "accueil.md");
        assert!(!tree[1].is_dir);

        // Lire et écrire un fichier
        let content = vault::tree::read_file_content(vault_root, "accueil.md").expect("read_file_content");
        assert_eq!(content, "# Accueil\nBienvenue dans Knit");

        vault::tree::write_file_content(vault_root, "accueil.md", "# Nouveau titre").expect("write_file_content");
        let updated = vault::tree::read_file_content(vault_root, "accueil.md").expect("read updated");
        assert_eq!(updated, "# Nouveau titre");
    }

    #[test]
    fn test_trash_and_restore_operations() {
        let dir = tempdir().expect("tempdir creation");
        let vault_root = dir.path();

        // Créer un fichier et un dossier
        vault::tree::create_file(vault_root, "temporaire.md", Some("# A supprimer")).expect("create_file");
        assert!(vault_root.join("temporaire.md").exists());

        // 1. Déplacer vers la corbeille locale
        let record = vault::tree::trash_path(vault_root, "temporaire.md").expect("trash_path");
        assert!(!vault_root.join("temporaire.md").exists());
        assert_eq!(record.original_rel_path, "temporaire.md");
        assert!(!record.is_dir);

        // 2. Restaurer
        let restored_path = vault::tree::restore_trash_path(vault_root, &record.trash_id).expect("restore");
        assert_eq!(restored_path, "temporaire.md");
        assert!(vault_root.join("temporaire.md").exists());
        let content = vault::tree::read_file_content(vault_root, "temporaire.md").expect("read after restore");
        assert_eq!(content, "# A supprimer");

        // 3. Déplacer à nouveau et tester la récupération automatique des orphelins
        let _record2 = vault::tree::trash_path(vault_root, "temporaire.md").expect("trash_path again");
        assert!(!vault_root.join("temporaire.md").exists());
        let recovered = vault::tree::recover_orphaned_trash(vault_root).expect("recover_orphaned");
        assert_eq!(recovered, vec!["temporaire.md".to_string()]);
        assert!(vault_root.join("temporaire.md").exists());

        // 4. Déplacer et commit vers l'OS
        let record3 = vault::tree::trash_path(vault_root, "temporaire.md").expect("trash_path 3");
        vault::tree::commit_trash_to_os(vault_root, &record3.trash_id).expect("commit_trash");
        assert!(!vault_root.join("temporaire.md").exists());
    }

    #[test]
    fn test_path_traversal_protection() {
        let dir = tempdir().expect("tempdir creation");
        let vault_root = dir.path();

        // Tentative avec parent directory ..
        let err1 = vault::tree::resolve_safe_path(vault_root, "../secret.txt");
        assert!(err1.is_err());

        // Tentative imbriquée
        let err2 = vault::tree::resolve_safe_path(vault_root, "docs/../../etc/passwd");
        assert!(err2.is_err());
    }

    #[test]
    fn test_file_filtering_and_special_files() {
        let dir = tempdir().expect("tempdir creation");
        let vault_root = dir.path();

        // Fichiers autorisés
        vault::tree::create_file(vault_root, "note.md", None).expect("create note.md");
        vault::tree::create_file(vault_root, "doc.markdown", None).expect("create doc.markdown");
        vault::tree::create_file(vault_root, "KNIT.md", Some("instructions")).expect("create KNIT.md");

        // Fichiers et dossiers cachés (commençant par '.') ignorés
        vault::tree::create_file(vault_root, ".knitshare", Some("vault_name: test")).expect("create .knitshare");
        vault::tree::create_file(vault_root, ".gitignore", Some("target/")).expect("create .gitignore");
        vault::tree::create_dir(vault_root, ".cursor").expect("create .cursor dir");
        vault::tree::create_file(vault_root, ".cursor/rule.md", None).expect("create inside .cursor");

        // Fichier binaire ignoré
        std::fs::write(vault_root.join("image.png"), b"binary").expect("write image.png");

        let tree = vault::tree::read_vault_tree(vault_root).expect("read tree");
        let names: Vec<String> = tree.into_iter().map(|n| n.name).collect();
        assert!(names.contains(&"note.md".to_string()));
        assert!(names.contains(&"doc.markdown".to_string()));
        assert!(names.contains(&"KNIT.md".to_string()));
        assert!(!names.contains(&".knitshare".to_string()));
        assert!(!names.contains(&".gitignore".to_string()));
        assert!(!names.contains(&".cursor".to_string()));
        assert!(!names.contains(&"image.png".to_string()));
    }

    #[test]
    fn test_auto_link_refactoring_in_vault() {
        let dir = tempdir().expect("tempdir creation");
        let root = dir.path();
        let guard = WriteGuard::new();

        // Créer structure :
        // accueil.md (référence wiki/archi.md)
        // wiki/archi.md
        // wiki/autre.md (référence [[archi]] et [archi](archi.md))
        vault::tree::create_file(
            root,
            "accueil.md",
            Some("# Accueil\nVoir [Architecture](wiki/archi.md) pour les détails.\nWikiLink: [[archi]]."),
        )
        .expect("create accueil.md");

        vault::tree::create_dir(root, "wiki").expect("create wiki dir");
        vault::tree::create_file(root, "wiki/archi.md", Some("# Architecture\nContenu.")).expect("create archi.md");
        vault::tree::create_file(
            root,
            "wiki/autre.md",
            Some("# Autre\nLien relatif direct: [Lien](archi.md) et [[archi]]."),
        )
        .expect("create autre.md");

        // Renommer/déplacer wiki/archi.md vers wiki/core/architecture.md
        let report = vault::tree::rename_file_and_refactor(
            root,
            "wiki/archi.md",
            "wiki/core/architecture.md",
            &guard,
        )
        .expect("rename and refactor");

        assert_eq!(report.files_modified, 2);
        assert_eq!(report.links_updated, 4);

        // Vérifier accueil.md
        let accueil_content = vault::tree::read_file_content(root, "accueil.md").expect("read accueil");
        assert!(accueil_content.contains("[Architecture](wiki/core/architecture.md)"));
        assert!(accueil_content.contains("[[architecture]]"));

        // Vérifier wiki/autre.md
        let autre_content = vault::tree::read_file_content(root, "wiki/autre.md").expect("read autre");
        assert!(autre_content.contains("[Lien](core/architecture.md)"));
        assert!(autre_content.contains("[[architecture]]"));
    }

    #[test]
    fn test_asset_saving_and_naming() {
        let dir = tempdir().expect("tempdir creation");
        let root = dir.path();
        let guard = WriteGuard::new();

        let data = b"fake png image bytes";
        let path1 = vault::assets::save_asset(root, Some("mon schema.png"), data, Some(&guard))
            .expect("save asset 1");
        assert_eq!(path1, "assets/mon_schema.png");
        assert!(root.join("assets/mon_schema.png").exists());

        // Sauvegarder un deuxième avec le même nom (doit insérer un timestamp)
        let path2 = vault::assets::save_asset(root, Some("mon schema.png"), data, Some(&guard))
            .expect("save asset 2");
        assert!(path2.starts_with("assets/mon_schema-"));
        assert!(path2.ends_with(".png"));

        // Sauvegarder sans nom
        let path3 = vault::assets::save_asset(root, None, data, Some(&guard)).expect("save asset 3");
        assert!(path3.starts_with("assets/img-"));
        assert!(path3.ends_with(".png"));
    }

    #[tokio::test]
    async fn test_concurrent_writes_and_watcher_anti_loop() {
        let dir = tempdir().expect("tempdir creation");
        let root = dir.path();
        let guard = WriteGuard::new();

        vault::tree::create_file(root, "test.md", Some("# Initial content")).expect("create file");

        let (_watcher, mut rx) = VaultWatcher::new(root, guard.clone(), |_| {}).expect("watcher");

        // 1. Écriture interne Knit avec WriteGuard -> le watcher doit l'ignorer
        let path = root.join("test.md");
        vault::tree::write_file_content_with_guard(root, "test.md", "# Modified by Knit internally", &guard)
            .expect("write with guard");

        // Attente : aucun événement externe ne doit être émis pour l'écriture interne
        tokio::time::sleep(tokio::time::Duration::from_millis(150)).await;
        let mut had_external = false;
        while let Ok(ev) = rx.try_recv() {
            if let VaultWatchEvent::FileChanged { content, .. } = ev {
                if content == "# Modified by Knit internally" {
                    had_external = true;
                }
            }
        }
        assert!(!had_external, "L'écriture interne Knit ne doit pas déclencher d'événement externe (anti-boucle)");

        // 2. Écriture externe par un agent IA / IDE externe (sans passer par WriteGuard)
        let ai_content = b"# Modified by external AI agent directly on disk";
        std::fs::write(&path, ai_content).expect("external write");

        // Le watcher doit détecter cette vraie modification externe
        let mut detected_ai = false;
        let start = std::time::Instant::now();
        while start.elapsed() < std::time::Duration::from_millis(800) {
            if let Ok(ev) = rx.try_recv() {
                if let VaultWatchEvent::FileChanged { content, path } = ev {
                    if path == "test.md" && content.contains("Modified by external AI agent") {
                        detected_ai = true;
                        break;
                    }
                }
            }
            tokio::time::sleep(tokio::time::Duration::from_millis(50)).await;
        }
        assert!(detected_ai, "Le watcher doit détecter la modification externe de l'agent IA");
    }
}

