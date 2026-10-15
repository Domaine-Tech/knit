use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct FrontmatterDoc {
    pub has_frontmatter: bool,
    pub raw_frontmatter: Option<String>,
    pub fields: HashMap<String, String>,
    pub ordered_keys: Vec<String>,
    pub body: String,
}

/// Parse un document Markdown avec ou sans bloc Frontmatter YAML (--- ... ---)
/// Préserve rigoureusement le Markdown pur et l'intégrité des données sans reformater arbitrairement.
pub fn parse_frontmatter(content: &str) -> FrontmatterDoc {
    let clean = content.strip_prefix('\u{feff}').unwrap_or(content);

    let trimmed_start = clean.trim_start();
    if !trimmed_start.starts_with("---") {
        return FrontmatterDoc {
            has_frontmatter: false,
            raw_frontmatter: None,
            fields: HashMap::new(),
            ordered_keys: Vec::new(),
            body: clean.to_string(),
        };
    }

    // On cherche la ligne de début `---` et la ligne de fin `---`
    let mut lines = clean.split('\n');
    let first_line = lines.next();
    if first_line.map(|l| l.trim()) != Some("---") {
        return FrontmatterDoc {
            has_frontmatter: false,
            raw_frontmatter: None,
            fields: HashMap::new(),
            ordered_keys: Vec::new(),
            body: clean.to_string(),
        };
    }

    let mut fm_lines = Vec::new();
    let mut found_closing = false;
    let mut body_lines = Vec::new();

    for line in lines {
        if !found_closing {
            if line.trim() == "---" {
                found_closing = true;
            } else {
                fm_lines.push(line);
            }
        } else {
            body_lines.push(line);
        }
    }

    if !found_closing {
        // Pas de fermeture --- valide, on traite tout comme du corps
        return FrontmatterDoc {
            has_frontmatter: false,
            raw_frontmatter: None,
            fields: HashMap::new(),
            ordered_keys: Vec::new(),
            body: clean.to_string(),
        };
    }

    let raw_frontmatter = fm_lines.join("\n");
    let mut fields = HashMap::new();
    let mut ordered_keys = Vec::new();

    for line in &fm_lines {
        let trimmed = line.trim();
        if trimmed.starts_with('#') || trimmed.is_empty() {
            continue;
        }

        if let Some((k, v)) = trimmed.split_once(':') {
            let key = k.trim().to_string();
            let mut val = v.trim();

            // Enlever les guillemets englobants si présents
            if ((val.starts_with('"') && val.ends_with('"'))
                || (val.starts_with('\'') && val.ends_with('\'')))
                && val.len() >= 2
            {
                val = &val[1..val.len() - 1];
            }

            if !fields.contains_key(&key) {
                ordered_keys.push(key.clone());
            }
            fields.insert(key, val.to_string());
        }
    }

    let body = body_lines.join("\n");

    FrontmatterDoc {
        has_frontmatter: true,
        raw_frontmatter: Some(raw_frontmatter),
        fields,
        ordered_keys,
        body,
    }
}

/// Met à jour ou insère une clé dans le frontmatter sans réordonner les clés existantes
/// et sans altérer le reste du corps Markdown.
pub fn update_frontmatter_field(content: &str, target_key: &str, new_value: &str) -> String {
    let clean = content.strip_prefix('\u{feff}').unwrap_or(content);

    let doc = parse_frontmatter(clean);
    let target_key = target_key.trim();

    if !doc.has_frontmatter {
        // Si aucun frontmatter n'existe, on le crée en tête
        let body = clean.strip_prefix('\n').unwrap_or(clean);
        return format!("---\n{}: {}\n---\n\n{}", target_key, new_value, body);
    }

    // On parcourt les lignes originales jusqu'à la fermeture `---`
    let lines: Vec<&str> = clean.split('\n').collect();
    let mut end_fm_index = 0;
    let mut found_key_line = None;

    // Trouver la fermeture et la ligne de la clé
    let mut in_fm = false;
    for (idx, line) in lines.iter().enumerate() {
        let trimmed = line.trim();
        if trimmed == "---" {
            if !in_fm {
                in_fm = true;
            } else {
                end_fm_index = idx;
                break;
            }
        } else if in_fm {
            if let Some((k, _)) = trimmed.split_once(':') {
                if k.trim() == target_key {
                    found_key_line = Some(idx);
                }
            }
        }
    }

    let replacement_line = format!("{}: {}", target_key, new_value);

    if let Some(key_idx) = found_key_line {
        // Remplacement en place en préservant l'indentation d'origine
        let original_line = lines[key_idx];
        let indent = original_line
            .chars()
            .take_while(|c| c.is_whitespace())
            .collect::<String>();
        let new_line = format!("{}{}: {}", indent, target_key, new_value);
        let mut new_lines: Vec<String> = lines.iter().map(|s| s.to_string()).collect();
        new_lines[key_idx] = new_line;
        new_lines.join("\n")
    } else {
        // Insertion juste avant le `---` fermant
        let mut new_lines: Vec<String> = lines.iter().map(|s| s.to_string()).collect();
        new_lines.insert(end_fm_index, replacement_line);
        new_lines.join("\n")
    }
}

/// Récupère la valeur d'un champ du frontmatter si présent
pub fn get_frontmatter_field(content: &str, target_key: &str) -> Option<String> {
    let doc = parse_frontmatter(content);
    doc.fields.get(target_key).cloned()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_frontmatter() {
        let content = r#"---
id: task-001
titre: Ma super tâche
statut: en-cours
priorite: haute
assigne: "Thomas"
tags: [front, p2p]
---

# Titre du Markdown

Contenu du fichier ici.
"#;

        let doc = parse_frontmatter(content);
        assert!(doc.has_frontmatter);
        assert_eq!(doc.fields.get("id").unwrap(), "task-001");
        assert_eq!(doc.fields.get("statut").unwrap(), "en-cours");
        assert_eq!(doc.fields.get("assigne").unwrap(), "Thomas");
        assert_eq!(doc.fields.get("priorite").unwrap(), "haute");
        assert_eq!(doc.ordered_keys.len(), 6);
        assert!(doc.body.contains("# Titre du Markdown"));
    }

    #[test]
    fn test_update_existing_frontmatter_field() {
        let content = r#"---
id: task-001
titre: Mon titre
statut: a-faire
priorite: moyenne
---

# Corps du document
"#;

        let updated = update_frontmatter_field(content, "statut", "termine");
        let doc = parse_frontmatter(&updated);
        assert_eq!(doc.fields.get("statut").unwrap(), "termine");
        assert_eq!(doc.fields.get("titre").unwrap(), "Mon titre");
        assert_eq!(doc.ordered_keys, vec!["id", "titre", "statut", "priorite"]);
        assert!(updated.contains("# Corps du document"));
    }

    #[test]
    fn test_insert_new_frontmatter_field() {
        let content = r#"---
id: task-002
titre: Test
---

Corps
"#;

        let updated = update_frontmatter_field(content, "statut", "en-cours");
        let doc = parse_frontmatter(&updated);
        assert_eq!(doc.fields.get("statut").unwrap(), "en-cours");
        assert_eq!(doc.fields.get("id").unwrap(), "task-002");
        assert!(doc.body.contains("Corps"));
    }

    #[test]
    fn test_add_frontmatter_to_bare_markdown() {
        let content = "# Sans frontmatter\nUn simple fichier.";
        let updated = update_frontmatter_field(content, "statut", "a-faire");
        let doc = parse_frontmatter(&updated);
        assert!(doc.has_frontmatter);
        assert_eq!(doc.fields.get("statut").unwrap(), "a-faire");
        assert!(doc.body.contains("# Sans frontmatter"));
    }
}
