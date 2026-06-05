//! analyzer.rs — tree-sitter による静的解析
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

// ============================================================
// 公開 API
// ============================================================

#[derive(Debug, Clone)]
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
        if !raw.starts_with("./") && !raw.starts_with("../") {
            // 外部パッケージ / alias はスキップ
            continue;
        }
        if let Some(resolved) = resolve_ts_import(root_path, &from_dir, &raw) {
            edges.push(ImportEdge {
                from: file_rel_path.to_string(),
                to: resolved,
            });
        }
    }
    Ok(edges)
}

fn collect_ts_imports(node: Node, src: &str, out: &mut Vec<String>) {
    let kind = node.kind();
    match kind {
        "import_statement" | "export_statement" => {
            // 直接子の "string" を拾う
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
            // import("...") の動的 import
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

    // 1) そのままファイル
    if base_abs.is_file() {
        return normalize_rel(&base);
    }

    // 2) 拡張子付与
    for ext in ["ts", "tsx", "js", "jsx", "mts", "cts"] {
        let candidate = base.with_extension(ext);
        if root_path.join(&candidate).is_file() {
            return normalize_rel(&candidate);
        }
    }

    // 3) ディレクトリ index
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
        // `mod foo { ... }` (インライン定義) は declaration_list を子に持つ → 外部ファイル参照ではない
        let has_body = {
            let mut cursor = node.walk();
            node.children(&mut cursor)
                .any(|c| c.kind() == "declaration_list")
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

/// `./foo/../bar` のような相対パスを正規化し、forward slash の文字列にする。
fn normalize_rel(p: &Path) -> Option<String> {
    let mut comps: Vec<&std::ffi::OsStr> = vec![];
    for c in p.components() {
        match c {
            Component::ParentDir => {
                comps.pop();
            }
            Component::CurDir => {}
            Component::Normal(s) => comps.push(s),
            _ => return None, // 絶対パス / Prefix(Windows) は想定外
        }
    }
    let joined: PathBuf = comps.iter().collect();
    Some(joined.to_string_lossy().replace('\\', "/"))
}
