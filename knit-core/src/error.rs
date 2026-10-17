use thiserror::Error;

#[derive(Error, Debug)]
pub enum KnitError {
    #[error("Erreur I/O : {0}")]
    Io(#[from] std::io::Error),

    #[error("Erreur de sérialisation JSON : {0}")]
    Json(#[from] serde_json::Error),

    #[error("Chemin invalide ou non autorisé hors du coffre : {0}")]
    InvalidPath(String),

    #[error("Coffre-fort introuvable : {0}")]
    VaultNotFound(String),

    #[error("Fichier introuvable : {0}")]
    FileNotFound(String),

    #[error("Erreur Watcher : {0}")]
    Watcher(String),

    #[error("Erreur Frontmatter : {0}")]
    Frontmatter(String),

    #[error("Erreur Refactoring de liens : {0}")]
    LinkRefactor(String),

    #[error("Erreur Réseau P2P : {0}")]
    Network(String),

    #[error("Erreur Coffre-fort / Snapshot : {0}")]
    Vault(String),

    #[error("Erreur interne : {0}")]
    Custom(String),
}

impl serde::Serialize for KnitError {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

pub type Result<T> = std::result::Result<T, KnitError>;
