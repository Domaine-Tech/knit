pub mod assets;
pub mod config;
pub mod hash;
pub mod identity;
pub mod init;
pub mod init_templates;
pub mod snapshot;
pub mod tree;
pub mod walk;

pub use assets::*;
pub use config::{
    load_vault_config, save_vault_config, TrashMode, VaultLocalConfig,
};
pub use hash::{compute_blake3_hash, compute_file_blake3};
pub use identity::*;
pub use init::{
    init_vault, is_vault_initialized, prepare_join_vault, InitVaultOptions, InitVaultResult,
};
pub use snapshot::*;
pub use tree::*;
pub use walk::{
    iter_vault_md_files, is_always_excluded_name, is_dot_entry_name, is_ignored_dir_name,
    is_watcher_ignored_name, should_descend, VaultMdFile,
};
