//! services/analysis — tree-sitter による静的解析 + ノード UPSERT
//!
//! @context CTX-20: TS / TSX / Rust の import / mod 宣言を抽出する
//!
//! スコープ:
//!   - TS / TSX: import / export from / dynamic import の相対パス（./, ../）のみ。
//!               外部パッケージ・Vite alias は解決対象外。
//!   - Rust:     `mod foo;` 宣言（子モジュールへの参照）のみ。
//!               `use crate::...` の追跡や型解決は今回スコープ外。
//!
//! 解決規則 (TS):
//!   1) そのまま `<base>` がファイル
//!   2) `<base>.{ts,tsx,js,jsx,mts,cts}` がファイル
//!   3) `<base>/index.{ts,tsx,js,jsx}` がファイル
//!
//! 解決規則 (Rust):
//!   `mod foo;` の対応ファイルは以下の順で探索する:
//!     <module_dir>/foo.rs
//!     <module_dir>/foo/mod.rs
//!   ここで <module_dir> は次の通り:
//!     - lib.rs / main.rs / mod.rs を含むファイルの場合 → そのファイルの親ディレクトリ
//!     - それ以外（例: bar.rs）の場合 → <親ディレクトリ>/<ファイル stem>

use std::path::{Component, Path, PathBuf};
use tree_sitter::{Node, Parser};

use crate::services::db::{
    thing_to_string, Db, EdgeInput, EdgeRecord, NodeInput, NodeRecord, ProjectRecord,
};

// ============================================================
// 除外ディレクトリ（lib.rs の read_dir_recursive からも参照）
// ============================================================

pub(crate) const FS_EXCLUDES: &[&str] = &["node_modules", ".git", "target", ".next", "dist"];

// ============================================================
// import 抽出 API
// ============================================================

#[derive(Debug, Clone)]
#[allow(dead_code)]
pub struct ImportEdge {
    /// rootPath 相対 / forward slash
    pub from: String,
    /// rootPath 相対 / forward slash
    pub to: String,
}

/// `file_rel_path` は rootPath からの相対パス（forward slash 区切り）。
/// 対応拡張子以外は空の Vec を返す（エラーではない）。
pub fn extract_imports(
    root_path: &Path,
    file_rel_path: &str,
    source: &str,
) -> Result<Vec<ImportEdge>, String> {
    match detect_lang(file_rel_path) {
        Lang::Ts => extract_ts(root_path, file_rel_path, source, false),
        Lang::Tsx => extract_ts(root_path, file_rel_path, source, true),
        Lang::Rust => extract_rust(root_path, file_rel_path, source),
        Lang::Unknown => Ok(vec![]),
    }
}

// ============================================================
// 言語判定
// ============================================================

enum Lang {
    Ts,
    Tsx,
    Rust,
    Unknown,
}

fn detect_lang(path: &str) -> Lang {
    let lower = path.to_lowercase();
    if lower.ends_with(".tsx") {
        Lang::Tsx
    } else if lower.ends_with(".ts") {
        Lang::Ts
    } else if lower.ends_with(".rs") {
        Lang::Rust
    } else {
        Lang::Unknown
    }
}

// ============================================================
// TypeScript / TSX
// ============================================================

fn extract_ts(
    root_path: &Path,
    file_rel_path: &str,
    source: &str,
    is_tsx: bool,
) -> Result<Vec<ImportEdge>, String> {
    let mut parser = Parser::new();
    let language = if is_tsx {
        tree_sitter_typescript::LANGUAGE_TSX
    } else {
        tree_sitter_typescript::LANGUAGE_TYPESCRIPT
    };
    parser
        .set_language(&language.into())
        .map_err(|e| format!("set_language(ts): {}", e))?;
    let tree = parser
        .parse(source, None)
        .ok_or_else(|| String::from("parse failed (ts)"))?;

    let mut raw_paths: Vec<String> = vec![];
    collect_ts_imports(tree.root_node(), source, &mut raw_paths);

    let from_path = PathBuf::from(file_rel_path);
    let from_dir = from_path
        .parent()
        .map(|p| p.to_path_buf())
        .unwrap_or_default();

    let mut edges = vec![];
    for raw in raw_paths {
        if raw.starts_with("./") || raw.starts_with("../") {
            if let Some(resolved) = resolve_ts_import(root_path, &from_dir, &raw) {
                edges.push(ImportEdge {
                    from: file_rel_path.to_string(),
                    to: resolved,
                });
            }
        } else if let Some(stripped) = raw.strip_prefix("@/") {
            // Vite alias: @/ → src/
            let alias_rel = format!("./src/{}", stripped);
            if let Some(resolved) = resolve_ts_import(root_path, &PathBuf::new(), &alias_rel) {
                edges.push(ImportEdge {
                    from: file_rel_path.to_string(),
                    to: resolved,
                });
            }
        }
    }
    Ok(edges)
}

fn collect_ts_imports(node: Node, src: &str, out: &mut Vec<String>) {
    let kind = node.kind();
    match kind {
        "import_statement" | "export_statement" => {
            let mut cursor = node.walk();
            for child in node.children(&mut cursor) {
                if child.kind() == "string" {
                    if let Some(text) = extract_string_fragment(child, src) {
                        out.push(text);
                    }
                }
            }
        }
        "call_expression" => {
            if let Some(func) = node.child_by_field_name("function") {
                if func.kind() == "import" {
                    if let Some(args) = node.child_by_field_name("arguments") {
                        let mut cursor = args.walk();
                        for arg in args.children(&mut cursor) {
                            if arg.kind() == "string" {
                                if let Some(text) = extract_string_fragment(arg, src) {
                                    out.push(text);
                                }
                            }
                        }
                    }
                }
            }
        }
        _ => {}
    }

    let mut cursor = node.walk();
    for child in node.children(&mut cursor) {
        collect_ts_imports(child, src, out);
    }
}

fn extract_string_fragment(string_node: Node, src: &str) -> Option<String> {
    let mut cursor = string_node.walk();
    for child in string_node.children(&mut cursor) {
        if child.kind() == "string_fragment" {
            return Some(src[child.byte_range()].to_string());
        }
    }
    None
}

fn resolve_ts_import(root_path: &Path, from_dir: &Path, raw: &str) -> Option<String> {
    let base = from_dir.join(raw);
    let base_abs = root_path.join(&base);

    if base_abs.is_file() {
        return normalize_rel(&base);
    }

    for ext in ["ts", "tsx", "js", "jsx", "mts", "cts"] {
        let candidate = base.with_extension(ext);
        if root_path.join(&candidate).is_file() {
            return normalize_rel(&candidate);
        }
    }

    if base_abs.is_dir() {
        for index_name in ["index.ts", "index.tsx", "index.js", "index.jsx"] {
            let candidate = base.join(index_name);
            if root_path.join(&candidate).is_file() {
                return normalize_rel(&candidate);
            }
        }
    }

    None
}

// ============================================================
// Rust
// ============================================================

fn extract_rust(
    root_path: &Path,
    file_rel_path: &str,
    source: &str,
) -> Result<Vec<ImportEdge>, String> {
    let mut parser = Parser::new();
    parser
        .set_language(&tree_sitter_rust::LANGUAGE.into())
        .map_err(|e| format!("set_language(rs): {}", e))?;
    let tree = parser
        .parse(source, None)
        .ok_or_else(|| String::from("parse failed (rs)"))?;

    let mut mods: Vec<String> = vec![];
    collect_rust_mods(tree.root_node(), source, &mut mods);

    let from_path = PathBuf::from(file_rel_path);
    let module_dir = compute_rust_module_dir(&from_path);

    let mut edges = vec![];
    for name in mods {
        let candidates = [
            module_dir.join(format!("{}.rs", name)),
            module_dir.join(&name).join("mod.rs"),
        ];
        for cand in candidates.iter() {
            if root_path.join(cand).is_file() {
                if let Some(rel) = normalize_rel(cand) {
                    edges.push(ImportEdge {
                        from: file_rel_path.to_string(),
                        to: rel,
                    });
                }
                break;
            }
        }
    }
    Ok(edges)
}

fn collect_rust_mods(node: Node, src: &str, out: &mut Vec<String>) {
    if node.kind() == "mod_item" {
        let has_body = {
            let mut cursor = node.walk();
            let found = node
                .children(&mut cursor)
                .any(|c| c.kind() == "declaration_list");
            found
        };
        if !has_body {
            if let Some(name) = node.child_by_field_name("name") {
                out.push(src[name.byte_range()].to_string());
            }
        }
    }

    let mut cursor = node.walk();
    for child in node.children(&mut cursor) {
        collect_rust_mods(child, src, out);
    }
}

fn compute_rust_module_dir(from_path: &Path) -> PathBuf {
    let stem = from_path.file_stem().and_then(|s| s.to_str()).unwrap_or("");
    let parent = from_path.parent().unwrap_or(Path::new(""));
    if matches!(stem, "lib" | "main" | "mod") {
        parent.to_path_buf()
    } else {
        parent.join(stem)
    }
}

// ============================================================
// 共通ヘルパー
// ============================================================

fn normalize_rel(p: &Path) -> Option<String> {
    let mut comps: Vec<&std::ffi::OsStr> = vec![];
    for c in p.components() {
        match c {
            Component::ParentDir => {
                comps.pop();
            }
            Component::CurDir => {}
            Component::Normal(s) => comps.push(s),
            _ => return None,
        }
    }
    let joined: PathBuf = comps.iter().collect();
    Some(joined.to_string_lossy().replace('\\', "/"))
}

// ============================================================
// ノード UPSERT / ファイル解析                        [CTX-20]
// ============================================================

/// `file_path` に対応するノードを取得 or 作成する。
pub async fn upsert_file_node(
    db: &Db,
    graph_id: &str,
    file_rel_path: &str,
    new_analyzed: &str,
) -> Result<String, String> {
    let existing: Vec<NodeRecord> = db
        .query("SELECT * FROM node WHERE graph_id = $gid AND file_path = $fp LIMIT 1")
        .bind(("gid", graph_id.to_string()))
        .bind(("fp", file_rel_path.to_string()))
        .await
        .map_err(|e| e.to_string())?
        .take(0)
        .map_err(|e| e.to_string())?;

    if let Some(node) = existing.into_iter().next() {
        let id_str = thing_to_string(&node.id);
        let current = node.analyzed.clone().unwrap_or_default();
        if new_analyzed == "fresh" || current != "fresh" {
            db.query("UPDATE $id SET analyzed = $a")
                .bind(("id", node.id.clone()))
                .bind(("a", new_analyzed.to_string()))
                .await
                .map_err(|e| e.to_string())?;
        }
        return Ok(id_str);
    }

    let count: Option<serde_json::Value> = db
        .query("SELECT count() FROM node WHERE graph_id = $gid GROUP ALL")
        .bind(("gid", graph_id.to_string()))
        .await
        .map_err(|e| e.to_string())?
        .take(0)
        .map_err(|e| e.to_string())?;
    let n = count
        .and_then(|v| v.get("count").and_then(|c| c.as_i64()))
        .unwrap_or(0);
    let x = (n % 6) as f64 * 220.0;
    let y = (n / 6) as f64 * 140.0;

    let label = Path::new(file_rel_path)
        .file_name()
        .and_then(|f| f.to_str())
        .unwrap_or(file_rel_path)
        .to_string();

    let input = NodeInput {
        graph_id: graph_id.to_string(),
        label,
        node_type: Some("file".to_string()),
        status: None,
        service: None,
        provider: None,
        input: None,
        description: None,
        position_x: x,
        position_y: y,
        file_path: Some(file_rel_path.to_string()),
        analyzed: Some(new_analyzed.to_string()),
    };
    let created: Option<NodeRecord> = db
        .create("node")
        .content(input)
        .await
        .map_err(|e| e.to_string())?;
    let rec = created.ok_or_else(|| String::from("Failed to create node"))?;
    Ok(thing_to_string(&rec.id))
}

/// 1ファイルを解析して node / edge を UPSERT する。
pub async fn do_analyze_file(
    db: &Db,
    project: &ProjectRecord,
    graph_id: &str,
    file_rel_path: &str,
) -> Result<(), String> {
    let root_path = Path::new(&project.root_path);
    let absolute = root_path.join(file_rel_path);
    let source = std::fs::read_to_string(&absolute)
        .map_err(|e| format!("Failed to read {}: {}", file_rel_path, e))?;

    let edges = extract_imports(root_path, file_rel_path, &source)?;

    let source_node_id = upsert_file_node(db, graph_id, file_rel_path, "fresh").await?;

    db.query("DELETE edge WHERE graph_id = $gid AND source = $src AND kind = 'imports'")
        .bind(("gid", graph_id.to_string()))
        .bind(("src", source_node_id.clone()))
        .await
        .map_err(|e| e.to_string())?;

    for edge in edges {
        let target_node_id = upsert_file_node(db, graph_id, &edge.to, "pending").await?;
        let edge_input = EdgeInput {
            graph_id: graph_id.to_string(),
            source: source_node_id.clone(),
            target: target_node_id,
            kind: Some("imports".to_string()),
        };
        let _: Option<EdgeRecord> = db
            .create("edge")
            .content(edge_input)
            .await
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// rootPath 配下を再帰的に走査し ts/tsx/rs ファイルの相対パス一覧を返す。
pub fn collect_source_files(root: &Path) -> Vec<String> {
    let mut out = vec![];
    walk_source_files(root, root, &mut out);
    out
}

fn walk_source_files(dir: &Path, root: &Path, out: &mut Vec<String>) {
    let Ok(entries) = std::fs::read_dir(dir) else {
        return;
    };
    for entry in entries.flatten() {
        let path = entry.path();
        let name = entry.file_name().to_string_lossy().to_string();
        if FS_EXCLUDES.contains(&name.as_str()) {
            continue;
        }
        if path.is_dir() {
            walk_source_files(&path, root, out);
        } else if matches!(
            path.extension().and_then(|e| e.to_str()),
            Some("ts") | Some("tsx") | Some("rs")
        ) {
            if let Ok(rel) = path.strip_prefix(root) {
                out.push(rel.to_string_lossy().replace('\\', "/"));
            }
        }
    }
}

// ============================================================
// テスト                                                  [CTX-20]
// ============================================================

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::time::SystemTime;

    fn fresh_root() -> PathBuf {
        let nanos = SystemTime::now()
            .duration_since(SystemTime::UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let dir = std::env::temp_dir().join(format!(
            "zizou-analyzer-test-{}-{}",
            std::process::id(),
            nanos
        ));
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    fn write(root: &Path, rel: &str, content: &str) {
        let abs = root.join(rel);
        if let Some(parent) = abs.parent() {
            fs::create_dir_all(parent).unwrap();
        }
        fs::write(abs, content).unwrap();
    }

    fn targets(edges: &[ImportEdge]) -> Vec<&str> {
        edges.iter().map(|e| e.to.as_str()).collect()
    }

    // ── TypeScript / TSX ──

    #[test]
    fn ts_relative_import_basic() {
        let root = fresh_root();
        write(&root, "src/a.ts", "");
        write(&root, "src/b.ts", "");
        let edges = extract_imports(&root, "src/a.ts", "import { b } from './b';").unwrap();
        assert_eq!(targets(&edges), vec!["src/b.ts"]);
    }

    #[test]
    fn ts_external_packages_skipped() {
        let root = fresh_root();
        write(&root, "src/a.ts", "");
        let src = r#"
            import React from 'react';
            import { x } from '@tauri-apps/api/core';
            import alias from '@/bom/file-tree';
        "#;
        let edges = extract_imports(&root, "src/a.ts", src).unwrap();
        assert!(
            edges.is_empty(),
            "外部パッケージは無視されるはず: {:?}",
            edges
        );
    }

    #[test]
    fn ts_index_file_resolution() {
        let root = fresh_root();
        write(&root, "src/a.ts", "");
        write(&root, "src/folder/index.ts", "");
        let edges = extract_imports(&root, "src/a.ts", "import { x } from './folder';").unwrap();
        assert_eq!(targets(&edges), vec!["src/folder/index.ts"]);
    }

    #[test]
    fn ts_extension_omission() {
        let root = fresh_root();
        write(&root, "src/a.ts", "");
        write(&root, "src/b.ts", "");
        let edges = extract_imports(&root, "src/a.ts", "import { b } from './b';").unwrap();
        assert_eq!(targets(&edges), vec!["src/b.ts"]);
    }

    #[test]
    fn ts_export_from_resolution() {
        let root = fresh_root();
        write(&root, "src/a.ts", "");
        write(&root, "src/b.ts", "");
        let edges = extract_imports(&root, "src/a.ts", "export { foo } from './b';").unwrap();
        assert_eq!(targets(&edges), vec!["src/b.ts"]);
    }

    #[test]
    fn ts_dynamic_import() {
        let root = fresh_root();
        write(&root, "src/a.ts", "");
        write(&root, "src/b.ts", "");
        let src = "async function f() { const m = await import('./b'); return m; }";
        let edges = extract_imports(&root, "src/a.ts", src).unwrap();
        assert_eq!(targets(&edges), vec!["src/b.ts"]);
    }

    #[test]
    fn ts_parent_directory_import() {
        let root = fresh_root();
        write(&root, "src/sub/a.ts", "");
        write(&root, "src/b.ts", "");
        let edges = extract_imports(&root, "src/sub/a.ts", "import { b } from '../b';").unwrap();
        assert_eq!(targets(&edges), vec!["src/b.ts"]);
    }

    #[test]
    fn tsx_supported() {
        let root = fresh_root();
        write(&root, "src/a.tsx", "");
        write(&root, "src/b.tsx", "");
        let src = "import { B } from './b'; const x = <B />;";
        let edges = extract_imports(&root, "src/a.tsx", src).unwrap();
        assert_eq!(targets(&edges), vec!["src/b.tsx"]);
    }

    #[test]
    fn ts_unresolved_import_omitted() {
        let root = fresh_root();
        write(&root, "src/a.ts", "");
        let edges =
            extract_imports(&root, "src/a.ts", "import { x } from './nonexistent';").unwrap();
        assert!(
            edges.is_empty(),
            "存在しないファイルは無視されるはず: {:?}",
            edges
        );
    }

    // ── Rust ──

    #[test]
    fn rust_mod_declaration_resolves_sibling_file() {
        let root = fresh_root();
        write(&root, "src/lib.rs", "");
        write(&root, "src/foo.rs", "");
        let edges = extract_imports(&root, "src/lib.rs", "mod foo;").unwrap();
        assert_eq!(targets(&edges), vec!["src/foo.rs"]);
    }

    #[test]
    fn rust_mod_declaration_resolves_mod_rs() {
        let root = fresh_root();
        write(&root, "src/lib.rs", "");
        write(&root, "src/foo/mod.rs", "");
        let edges = extract_imports(&root, "src/lib.rs", "mod foo;").unwrap();
        assert_eq!(targets(&edges), vec!["src/foo/mod.rs"]);
    }

    #[test]
    fn rust_inline_mod_ignored() {
        let root = fresh_root();
        write(&root, "src/lib.rs", "");
        write(&root, "src/foo.rs", "");
        let src = "mod foo { pub fn bar() {} }";
        let edges = extract_imports(&root, "src/lib.rs", src).unwrap();
        assert!(
            edges.is_empty(),
            "インライン mod は外部ファイル参照ではない: {:?}",
            edges
        );
    }

    #[test]
    fn rust_mod_from_named_module_file() {
        let root = fresh_root();
        write(&root, "src/foo.rs", "");
        write(&root, "src/foo/bar.rs", "");
        let edges = extract_imports(&root, "src/foo.rs", "mod bar;").unwrap();
        assert_eq!(targets(&edges), vec!["src/foo/bar.rs"]);
    }

    #[test]
    fn rust_mod_with_no_file_omitted() {
        let root = fresh_root();
        write(&root, "src/lib.rs", "");
        let edges = extract_imports(&root, "src/lib.rs", "mod nonexistent;").unwrap();
        assert!(edges.is_empty(), "対応ファイル無しは無視: {:?}", edges);
    }

    #[test]
    fn rust_multiple_mods() {
        let root = fresh_root();
        write(&root, "src/lib.rs", "");
        write(&root, "src/a.rs", "");
        write(&root, "src/b.rs", "");
        let src = "mod a; mod b;";
        let edges = extract_imports(&root, "src/lib.rs", src).unwrap();
        let mut tgts = targets(&edges);
        tgts.sort();
        assert_eq!(tgts, vec!["src/a.rs", "src/b.rs"]);
    }

    // ── 言語判定 ──

    #[test]
    fn unsupported_extension_returns_empty() {
        let root = fresh_root();
        write(&root, "README.md", "");
        let edges = extract_imports(&root, "README.md", "import x from './a';").unwrap();
        assert!(edges.is_empty());
    }

    #[test]
    fn from_field_matches_file_rel_path() {
        let root = fresh_root();
        write(&root, "src/a.ts", "");
        write(&root, "src/b.ts", "");
        let edges = extract_imports(&root, "src/a.ts", "import { b } from './b';").unwrap();
        assert_eq!(edges.len(), 1);
        assert_eq!(edges[0].from, "src/a.ts");
    }
}

/// NodeRecord を ReactFlow Node 形式の JSON に変換する。
fn node_record_to_rf(n: NodeRecord) -> serde_json::Value {
    let node_type = n.node_type.as_deref().unwrap_or("file");
    let rf_type = if node_type == "test" {
        "testNode"
    } else {
        "sourceNode"
    };

    let mut data = serde_json::json!({ "label": n.label });
    if let Some(v) = n.node_type {
        data["nodeType"] = v.into();
    }
    if let Some(v) = n.file_path {
        data["filePath"] = v.into();
    }
    if let Some(v) = n.analyzed {
        data["analyzed"] = v.into();
    }

    serde_json::json!({
        "id":       thing_to_string(&n.id),
        "type":     rf_type,
        "position": { "x": n.position_x, "y": n.position_y },
        "data":     data,
    })
}

// edge テーブルから target / source の ID 文字列を取得するための typed struct
#[derive(serde::Deserialize)]
struct EdgeTarget {
    target: String,
}

#[derive(serde::Deserialize)]
struct EdgeSource {
    source: String,
}

/// 選択ファイルの依存先（dependencies）と利用先（dependents）を返す。
///
/// 返り値は `{ center, dependencies, dependents }` の JSON。
/// フロントエンドの `RelatedNodes` 型に対応する。
///
/// - dependencies: file_path が import しているノード（depth=1、node_modules 除外済み）
/// - dependents:   file_path を import しているノード（edge テーブル逆引き）
///
/// # Arguments
/// * `db`         - SurrealDB 接続
/// * `project_id` - プロジェクト ID（"project:xxx" 形式）
/// * `file_path`  - 選択テストファイルの rootPath 相対パス（forward slash）
pub async fn get_related_nodes(
    db: &Db,
    project_id: &str,
    file_path: &str,
) -> Result<serde_json::Value, String> {
    // structure グラフを取得
    let graph = crate::services::graph::get_or_create_structure_graph(db, project_id).await?;
    let graph_id = thing_to_string(&graph.id);

    // center ノードを取得
    let center_records: Vec<NodeRecord> = db
        .query("SELECT * FROM node WHERE graph_id = $gid AND file_path = $fp LIMIT 1")
        .bind(("gid", graph_id.clone()))
        .bind(("fp", file_path.to_string()))
        .await
        .map_err(|e| e.to_string())?
        .take(0)
        .map_err(|e| e.to_string())?;

    let center_record = center_records
        .into_iter()
        .next()
        .ok_or_else(|| format!("node not found for file_path: {}", file_path))?;
    let center_id = thing_to_string(&center_record.id);
    let center = node_record_to_rf(center_record);

    // dependencies: center が source のエッジの target ノードを取得
    let dep_targets: Vec<EdgeTarget> = db
        .query(
            "SELECT target FROM edge WHERE graph_id = $gid AND source = $src AND kind = 'imports'",
        )
        .bind(("gid", graph_id.clone()))
        .bind(("src", center_id.clone()))
        .await
        .map_err(|e| e.to_string())?
        .take(0)
        .map_err(|e| e.to_string())?;

    let mut dependencies = vec![];
    for et in dep_targets {
        let records: Vec<NodeRecord> = db
            .query("SELECT * FROM node WHERE id = type::thing($id) LIMIT 1")
            .bind(("id", et.target))
            .await
            .map_err(|e| e.to_string())?
            .take(0)
            .map_err(|e| e.to_string())?;
        if let Some(n) = records.into_iter().next() {
            dependencies.push(node_record_to_rf(n));
        }
    }

    // dependents: center が target のエッジの source ノードを取得
    let dnt_sources: Vec<EdgeSource> = db
        .query(
            "SELECT source FROM edge WHERE graph_id = $gid AND target = $tgt AND kind = 'imports'",
        )
        .bind(("gid", graph_id.clone()))
        .bind(("tgt", center_id.clone()))
        .await
        .map_err(|e| e.to_string())?
        .take(0)
        .map_err(|e| e.to_string())?;

    let mut dependents = vec![];
    for es in dnt_sources {
        let records: Vec<NodeRecord> = db
            .query("SELECT * FROM node WHERE id = type::thing($id) LIMIT 1")
            .bind(("id", es.source))
            .await
            .map_err(|e| e.to_string())?
            .take(0)
            .map_err(|e| e.to_string())?;
        if let Some(n) = records.into_iter().next() {
            dependents.push(node_record_to_rf(n));
        }
    }

    Ok(serde_json::json!({
        "center":       center,
        "dependencies": dependencies,
        "dependents":   dependents,
    }))
}
