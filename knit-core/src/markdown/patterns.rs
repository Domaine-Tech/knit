use regex::Regex;
use std::sync::LazyLock;

/// Tags inline `#tag` (accepte espace ou `(` avant le #).
pub static INLINE_TAG_RE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?:^|[\s(])#([a-zA-Z0-9_\-\/]+)").expect("inline tag regex valide")
});

/// WikiLinks `[[cible]]` ou `[[cible|alias]]`.
pub static WIKILINK_RE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"\[\[([^\]|]+)(?:\|([^\]]+))?\]\]").expect("wikilink regex valide")
});

/// Liens Markdown `[Label](cible)` / `![Alt](cible)` avec titre optionnel.
pub static MDLINK_RE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r#"(!?\[[^\]]*\])\(([^)\s]+)(?:\s+("[^"]*"|'[^']*'))?\)"#)
        .expect("mdlink regex valide")
});
