// ============================================================
// テスト                                                  [CTX-20]
// ============================================================
//
// extract_imports の挙動検証。
// 一時ディレクトリにフィクスチャを書き出してから解析する。
// 外部依存なし（tempfile クレート不要 — std::env::temp_dir + pid + nanos で十分一意）。

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::time::SystemTime;

    // --------------------------------------------------------
    // ヘルパー
    // --------------------------------------------------------

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

    // --------------------------------------------------------
    // TypeScript / TSX
    // --------------------------------------------------------

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
        // src/nonexistent.ts は作らない

        let edges =
            extract_imports(&root, "src/a.ts", "import { x } from './nonexistent';").unwrap();
        assert!(
            edges.is_empty(),
            "存在しないファイルは無視されるはず: {:?}",
            edges
        );
    }

    // --------------------------------------------------------
    // Rust
    // --------------------------------------------------------

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
        write(&root, "src/foo.rs", ""); // 存在しても拾わない

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
        // foo.rs から `mod bar;` → src/foo/bar.rs を見る
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

    // --------------------------------------------------------
    // 言語判定
    // --------------------------------------------------------

    #[test]
    fn unsupported_extension_returns_empty() {
        let root = fresh_root();
        write(&root, "README.md", "");

        // .md は対象外。中身に何が書かれていても空 Vec が返る。
        let edges = extract_imports(&root, "README.md", "import x from './a';").unwrap();
        assert!(edges.is_empty());
    }

    #[test]
    fn from_field_matches_file_rel_path() {
        // ImportEdge.from が呼び出し時に渡した file_rel_path と一致することを保証
        let root = fresh_root();
        write(&root, "src/a.ts", "");
        write(&root, "src/b.ts", "");

        let edges = extract_imports(&root, "src/a.ts", "import { b } from './b';").unwrap();
        assert_eq!(edges.len(), 1);
        assert_eq!(edges[0].from, "src/a.ts");
    }
}
