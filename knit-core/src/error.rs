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

    #[error("Erreur Watcher : {0}")]
    Watcher(String),

    #[error("Erreur Frontmatter : {0}")]
    Frontmatter(String),

    #[error("Erreur Refactoring de liens : {0}")]
    LinkRefactor(String),

    #[error("Erreur Réseau P2P : {0}")]
    Network(String),

    #[error("Erreur interne : {0}")]
    Custom(String),
}

pub type Result<T> = std::result::Result<T, KnitError>;
