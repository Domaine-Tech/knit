/**
 * Types relatifs au coffre-fort (Vault), arborescence et opérations de fichiers
 */

export interface FileNode {
  id: string;
  name: string;
  path: string;
  is_dir: boolean;
  extension?: string;
  children: FileNode[];
}

export interface FrontmatterDoc {
  has_frontmatter: boolean;
  raw_frontmatter?: string;
  fields: Record<string, string>;
  ordered_keys: string[];
  body: string;
}

export interface LinkRefactorReport {
  files_scanned: number;
  files_modified: number;
  links_updated: number;
  modified_files: string[];
}

export interface TrashRecord {
  trash_id: string;
  original_rel_path: string;
  item_name: string;
  is_dir: boolean;
  deleted_at: number;
}

export interface KanbanFileInfo {
  path: string;
  name: string;
  title: string;
  columns_count?: number;
  cards_count?: number;
}

export interface DocSnapshot {
  snapshot_id: string;
  doc_id: string;
  state_vector_base64: string;
  yjs_snapshot_base64: string;
  created_at_sec: number;
}
