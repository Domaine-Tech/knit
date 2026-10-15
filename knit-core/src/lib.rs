pub mod error;
pub mod vault;
pub mod watcher;

pub use error::{KnitError, Result};
pub use vault::tree::FileNode;
pub use watcher::guard::WriteGuard;

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
        vault::tree::create_file(vault_root, ".knitshare", Some("vault_name: test")).expect("create .knitshare");
        vault::tree::create_file(vault_root, "KNIT.md", Some("instructions")).expect("create KNIT.md");

        // Fichier ignoré (binaire, non supporté)
        std::fs::write(vault_root.join("image.png"), b"binary").expect("write image.png");

        let tree = vault::tree::read_vault_tree(vault_root).expect("read tree");
        let names: Vec<String> = tree.into_iter().map(|n| n.name).collect();
        assert!(names.contains(&"note.md".to_string()));
        assert!(names.contains(&"doc.markdown".to_string()));
        assert!(names.contains(&".knitshare".to_string()));
        assert!(names.contains(&"KNIT.md".to_string()));
        assert!(!names.contains(&"image.png".to_string()));
    }
}
