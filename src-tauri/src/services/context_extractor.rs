//! ContextMap Extractor (ZTE: Zero-Token-Extraction)
//!
//! ContextMap.*.html から、決定的パース(LLM推論なし)で
//! ノード/エッジを機械的に抽出する。
//!
//! `.zizhou/context/*.html` を全て走査し、ノード/エッジをマージして返す
//! Tauriコマンド `extract_context_graph` を提供する。
//!
//! 抽出対象:
//!   - NODE: id属性を持つ要素のうち、
//!       (a) 自身が `<script data-key="spec">` である（見た目を持たないhook/serviceなど）
//!       (b) 直下の子に `<script type="application/json" data-key="spec">` を持ち、
//!           かつ自身に `data-kind` 属性を持つ（実UI要素 or storage側の .unit）
//!   - LINK: `<link rel="context-ref" id="..." href="他ファイル#id">` による
//!           cross-ContextMap参照。参照先ファイルを読み込み、
//!           該当idのNODEを解決してマージする。
//!   - EDGE: `<script id="edges" type="application/json">` のJSON配列
//!
//! 実装メモ:
//!   scraperのSelectorは常に子孫全体を探索するため「直下の子のみ」を
//!   絞り込むAPIが無い。そのため children() で候補の有無を先に判定し、
//!   該当要素のHTML片を parse_fragment() で再パースして select() する
//!   回避策を取っている（`first_direct_child_matching`）。

use scraper::{Html, Selector};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;
use std::path::{Path, PathBuf};

#[derive(Debug, Serialize, Clone)]
pub struct ExtractedNode {
    pub id: String,
    pub kind: Option<String>,
    pub file: Option<String>,
    pub context: Option<String>,
    pub describe: Option<String>,
    pub criteria: Option<Value>,
    pub deps: Option<Value>,
    #[serde(rename = "sourceContextMap")]
    pub source_context_map: String,
}

#[derive(Debug, Serialize, Clone, Deserialize)]
pub struct ExtractedEdge {
    pub source: String,
    pub target: String,
}

#[derive(Debug, Serialize)]
pub struct ExtractResult {
    pub nodes: Vec<ExtractedNode>,
    pub edges: Vec<ExtractedEdge>,
}

/// ノードとして扱わない予約id（メタ情報用）
const META_IDS: [&str; 2] = ["edges", "global-store"];

/// 直下の子要素だけを対象にセレクタを当てる（scraperにはchildren専用APIが無いための回避策）
fn first_direct_child_matching(
    el: scraper::ElementRef<'_>,
    selector: &Selector,
) -> Option<String> {
    let has_candidate = el.children().any(|node| {
        node.value()
            .as_element()
            .map(|e| e.name() == "script")
            .unwrap_or(false)
    });
    if !has_candidate {
        return None;
    }
    let fragment_html = el.html();
    let fragment_doc = Html::parse_fragment(&fragment_html);
    fragment_doc
        .select(selector)
        .next()
        .map(|matched| matched.text().collect::<String>())
}

fn parse_spec_json(raw: &str, context: &str) -> Value {
    match serde_json::from_str::<Value>(raw.trim()) {
        Ok(v) => v,
        Err(e) => {
            eprintln!("[WARN] spec JSON parse failed at {context}: {e}");
            Value::Null
        }
    }
}

/// 1ファイル分のNODEを抽出し、seen(id -> node)にマージする。
/// `<link rel="context-ref">` を見つけたら参照先ファイルも再帰的に解決する。
pub fn extract_nodes_from_file(
    file_path: &Path,
    seen: &mut HashMap<String, ExtractedNode>,
) -> Result<(), String> {
    let html = std::fs::read_to_string(file_path)
        .map_err(|e| format!("failed to read {}: {e}", file_path.display()))?;
    let doc = Html::parse_document(&html);
    let file_name = file_path
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_default();

    let id_sel = Selector::parse("[id]").unwrap();
    let child_spec_sel = Selector::parse(r#"script[data-key="spec"]"#).unwrap();

    for el in doc.select(&id_sel) {
        let Some(id) = el.value().attr("id") else {
            continue;
        };
        if META_IDS.contains(&id) || seen.contains_key(id) {
            continue;
        }

        let is_script_self =
            el.value().name() == "script" && el.value().attr("data-key") == Some("spec");

        let (spec_text, kind, file) = if is_script_self {
            // (a) 非表示logic node: script自身がnode
            let text: String = el.text().collect();
            (
                Some(text),
                el.value().attr("data-kind").map(String::from),
                el.value()
                    .attr("data-file")
                    .or_else(|| el.value().attr("data-path"))
                    .map(String::from),
            )
        } else {
            // (b) 実UI要素 or storage の .unit: 子にspec scriptを持つ
            let Some(kind) = el.value().attr("data-kind").map(String::from) else {
                continue; // data-kind の無いラッパー要素（#app, #logic-nodes等）を除外
            };
            let Some(text) = first_direct_child_matching(el, &child_spec_sel) else {
                continue; // spec を持たない要素は node ではない
            };
            let file = el
                .value()
                .attr("data-file")
                .or_else(|| el.value().attr("data-path"))
                .map(String::from);
            (Some(text), Some(kind), file)
        };

        let spec = parse_spec_json(&spec_text.unwrap_or_default(), &format!("{file_name}#{id}"));
        let context = el.value().attr("data-context").map(String::from);

        seen.insert(
            id.to_string(),
            ExtractedNode {
                id: id.to_string(),
                kind,
                file,
                context,
                describe: spec
                    .get("describe")
                    .and_then(|v| v.as_str())
                    .map(String::from),
                criteria: spec.get("criteria").cloned(),
                deps: spec.get("deps").cloned(),
                source_context_map: file_name.clone(),
            },
        );
    }

    // cross-ContextMap 参照の解決
    let link_sel = Selector::parse(r#"link[rel="context-ref"]"#).unwrap();
    for el in doc.select(&link_sel) {
        let (Some(id), Some(href)) = (el.value().attr("id"), el.value().attr("href")) else {
            continue;
        };
        if seen.contains_key(id) {
            continue;
        }
        let Some((ref_file, ref_id)) = href.split_once('#') else {
            eprintln!("[WARN] invalid context-ref href: \"{href}\" (in {file_name}#{id})");
            continue;
        };

        let ref_path: PathBuf = file_path
            .parent()
            .unwrap_or_else(|| Path::new("."))
            .join(ref_file);

        if let Err(e) = extract_nodes_from_file(&ref_path, seen) {
            eprintln!("[WARN] failed to resolve context-ref \"{href}\": {e}");
            continue;
        }
        if !seen.contains_key(ref_id) {
            eprintln!("[WARN] context-ref target not found: {ref_file}#{ref_id}");
        }
    }

    Ok(())
}

/// `#edges` のJSON配列を抽出する。無ければ空配列。
pub fn extract_edges_from_file(file_path: &Path) -> Result<Vec<ExtractedEdge>, String> {
    let html = std::fs::read_to_string(file_path)
        .map_err(|e| format!("failed to read {}: {e}", file_path.display()))?;
    let doc = Html::parse_document(&html);
    let sel = Selector::parse(r#"script#edges[type="application/json"]"#).unwrap();

    let Some(el) = doc.select(&sel).next() else {
        return Ok(vec![]);
    };
    let text: String = el.text().collect();
    match serde_json::from_str::<Vec<ExtractedEdge>>(text.trim()) {
        Ok(edges) => Ok(edges),
        Err(e) => {
            eprintln!("[WARN] edges JSON parse failed: {e}");
            Ok(vec![])
        }
    }
}

/// 単一ファイルをentry pointとして抽出する（テスト・デバッグ用途）。
pub fn extract(entry_file: &Path) -> Result<ExtractResult, String> {
    let mut seen = HashMap::new();
    extract_nodes_from_file(entry_file, &mut seen)?;
    let edges = extract_edges_from_file(entry_file)?;
    Ok(ExtractResult {
        nodes: seen.into_values().collect(),
        edges,
    })
}

/// `.zizhou/context/*.html` を全て走査し、ノード/エッジをマージして返す。
/// 各ファイルは独立したentry pointとして処理されるが、
/// idの重複（<link>による解決済みノードなど）はseen mapで自然にdedupeされる。
pub fn extract_project(root_path: &Path) -> Result<ExtractResult, String> {
    let context_dir = root_path.join(".zizhou").join("context");
    let entries = std::fs::read_dir(&context_dir)
        .map_err(|e| format!("failed to read {}: {e}", context_dir.display()))?;

    let mut seen: HashMap<String, ExtractedNode> = HashMap::new();
    let mut all_edges: Vec<ExtractedEdge> = Vec::new();

    let mut html_files: Vec<PathBuf> = entries
        .filter_map(|e| e.ok())
        .map(|e| e.path())
        .filter(|p| p.extension().and_then(|s| s.to_str()) == Some("html"))
        .collect();
    html_files.sort(); // 決定的な順序にする

    for file_path in &html_files {
        if let Err(e) = extract_nodes_from_file(file_path, &mut seen) {
            eprintln!("[WARN] skipping {}: {e}", file_path.display());
            continue;
        }
        match extract_edges_from_file(file_path) {
            Ok(mut edges) => all_edges.append(&mut edges),
            Err(e) => {
                eprintln!("[WARN] edges extraction failed for {}: {e}", file_path.display())
            }
        }
    }

    Ok(ExtractResult {
        nodes: seen.into_values().collect(),
        edges: all_edges,
    })
}

/// Tauriコマンド。フロントエンドから `invoke('extract_context_graph', { rootPath })` で呼ぶ。
/// IpcResponse trait bound制約により、戻り値は独自structではなく serde_json::Value にする。
#[tauri::command]
pub fn extract_context_graph(root_path: String) -> Result<serde_json::Value, String> {
    let result = extract_project(Path::new(&root_path))?;
    serde_json::to_value(&result).map_err(|e| format!("serialize failed: {e}"))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    /// テスト用の一時ディレクトリを作り、渡したファイル群を書き込んで返す。
    /// std::env::temp_dir() 配下にテスト名+プロセスIDでユニークな場所を作る
    /// （fixtureファイルをリポジトリに常設せず、テストコード自体をSSOTにする）。
    fn write_fixtures(test_name: &str, files: &[(&str, &str)]) -> PathBuf {
        let dir = std::env::temp_dir().join(format!(
            "extractor_test_{test_name}_{}",
            std::process::id()
        ));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        for (name, content) in files {
            fs::write(dir.join(name), content).unwrap();
        }
        dir
    }

    const UI_NODE_HTML: &str = r#"<!DOCTYPE html><html><body>
        <div id="app" data-context="todo">
            <form id="add-todo-form" data-context="todo" data-kind="component" data-file="src/components/AddTodoForm.tsx">
                <script type="application/json" data-key="spec">
                    { "describe": "テキストを入力してTodoを追加する", "criteria": [{ "label": "追加できる", "done": false }] }
                </script>
            </form>
        </div>
    </body></html>"#;

    #[test]
    fn extracts_ui_node_with_child_spec_script() {
        let dir = write_fixtures("ui_node", &[("ContextMap.todo.html", UI_NODE_HTML)]);
        let result = extract(&dir.join("ContextMap.todo.html")).unwrap();

        assert_eq!(result.nodes.len(), 1);
        let node = &result.nodes[0];
        assert_eq!(node.id, "add-todo-form");
        assert_eq!(node.kind.as_deref(), Some("component"));
        assert_eq!(node.context.as_deref(), Some("todo"));
        assert_eq!(node.file.as_deref(), Some("src/components/AddTodoForm.tsx"));
        assert_eq!(
            node.describe.as_deref(),
            Some("テキストを入力してTodoを追加する")
        );
    }

    const WRAPPER_LEAK_HTML: &str = r#"<!DOCTYPE html><html><body>
        <div id="logic-nodes" style="display:none">
            <script id="use-todo-store" type="application/json" data-key="spec"
                    data-context="todo" data-kind="hook" data-file="src/hooks/useTodoStore.ts">
                { "describe": "状態を保持する", "criteria": [] }
            </script>
        </div>
    </body></html>"#;

    #[test]
    fn wrapper_element_without_data_kind_is_not_extracted_as_node() {
        // #logic-nodes は data-kind を持たないラッパーなので node として抽出されてはならない。
        // （scraperの実装過程で見つかった誤抽出バグの回帰テスト）
        let dir = write_fixtures("wrapper_leak", &[("ContextMap.todo.html", WRAPPER_LEAK_HTML)]);
        let result = extract(&dir.join("ContextMap.todo.html")).unwrap();

        assert_eq!(result.nodes.len(), 1);
        assert_eq!(result.nodes[0].id, "use-todo-store");
        assert!(result.nodes.iter().all(|n| n.id != "logic-nodes"));
    }

    #[test]
    fn resolves_cross_context_map_link() {
        let todo_html = r#"<!DOCTYPE html><html><body>
            <link rel="context-ref" id="persist-todos" data-kind="service"
                  href="ContextMap.storage.html#persist-todos">
        </body></html>"#;
        let storage_html = r#"<!DOCTYPE html><html><body>
            <div id="persist-todos" class="unit" data-context="todo"
                 data-kind="service" data-path="src/lib/persistTodos.ts">
                <script type="application/json" data-key="spec">
                    { "describe": "localStorageへ読み書きする", "deps": ["todo-record"] }
                </script>
            </div>
        </body></html>"#;
        let dir = write_fixtures(
            "cross_ref",
            &[
                ("ContextMap.todo.html", todo_html),
                ("ContextMap.storage.html", storage_html),
            ],
        );
        let result = extract(&dir.join("ContextMap.todo.html")).unwrap();

        assert_eq!(result.nodes.len(), 1);
        let node = &result.nodes[0];
        assert_eq!(node.id, "persist-todos");
        assert_eq!(node.source_context_map, "ContextMap.storage.html");
        assert_eq!(
            node.deps,
            Some(serde_json::json!(["todo-record"]))
        );
    }

    #[test]
    fn missing_link_target_does_not_panic_and_is_simply_absent() {
        let todo_html = r#"<!DOCTYPE html><html><body>
            <link rel="context-ref" id="persist-todos" data-kind="service"
                  href="ContextMap.storage.html#nonexistent-id">
        </body></html>"#;
        let storage_html = r#"<!DOCTYPE html><html><body></body></html>"#;
        let dir = write_fixtures(
            "missing_link",
            &[
                ("ContextMap.todo.html", todo_html),
                ("ContextMap.storage.html", storage_html),
            ],
        );

        let result = extract(&dir.join("ContextMap.todo.html"));
        assert!(result.is_ok());
        assert_eq!(result.unwrap().nodes.len(), 0);
    }

    #[test]
    fn extracts_edges_from_json_array() {
        let html = r#"<!DOCTYPE html><html><head>
            <script id="edges" type="application/json">
                [{ "source": "add-todo-form", "target": "use-todo-store" }]
            </script>
        </head><body></body></html>"#;
        let dir = write_fixtures("edges", &[("ContextMap.todo.html", html)]);
        let result = extract(&dir.join("ContextMap.todo.html")).unwrap();

        assert_eq!(result.edges.len(), 1);
        assert_eq!(result.edges[0].source, "add-todo-form");
        assert_eq!(result.edges[0].target, "use-todo-store");
    }

    #[test]
    fn extract_project_scans_all_html_files_under_zizhou_context_and_dedupes() {
        let dir = write_fixtures(
            "project_scan",
            &[
                ("ContextMap.todo.html", UI_NODE_HTML),
                (
                    "ContextMap.storage.html",
                    r#"<!DOCTYPE html><html><body>
                        <div id="todo-record" class="unit" data-context="todo"
                             data-kind="schema" data-path="src/types/TodoRecord.ts">
                            <script type="application/json" data-key="spec">
                                { "describe": "Todo1件のデータ形状" }
                            </script>
                        </div>
                    </body></html>"#,
                ),
            ],
        );
        // .zizhou/context/ 配下に配置し直す
        let project_root = dir.join("project");
        let context_dir = project_root.join(".zizhou").join("context");
        fs::create_dir_all(&context_dir).unwrap();
        fs::rename(dir.join("ContextMap.todo.html"), context_dir.join("ContextMap.todo.html")).unwrap();
        fs::rename(
            dir.join("ContextMap.storage.html"),
            context_dir.join("ContextMap.storage.html"),
        )
        .unwrap();

        let result = extract_project(&project_root).unwrap();
        assert_eq!(result.nodes.len(), 2);
        let ids: Vec<&str> = result.nodes.iter().map(|n| n.id.as_str()).collect();
        assert!(ids.contains(&"add-todo-form"));
        assert!(ids.contains(&"todo-record"));
    }

    /// 診断用テスト。TauriのIPCを一切介さず、実際のプロジェクトの rootPath に対して
    /// extract_project() を直接叩いて結果と [WARN] を印字する。
    ///
    /// 使い方（src-tauri ディレクトリで実行）:
    ///   ZIZHOU_DEBUG_ROOT="C:\Users\brainvader\Documents\workspaces\todo-app-sample" \
    ///     cargo test debug_real_project -- --ignored --nocapture
    ///
    /// PowerShellの場合:
    ///   $env:ZIZHOU_DEBUG_ROOT="C:\Users\brainvader\Documents\workspaces\todo-app-sample"
    ///   cargo test debug_real_project -- --ignored --nocapture
    #[test]
    #[ignore]
    fn debug_real_project() {
        let root = std::env::var("ZIZHOU_DEBUG_ROOT")
            .expect("ZIZHOU_DEBUG_ROOT を実プロジェクトの rootPath に設定してください");
        let root_path = Path::new(&root);

        println!("--- root_path ---");
        println!("{}", root_path.display());

        let context_dir = root_path.join(".zizhou").join("context");
        println!("--- context_dir (存在するか) ---");
        println!("{} exists={}", context_dir.display(), context_dir.exists());
        if context_dir.exists() {
            for entry in std::fs::read_dir(&context_dir).unwrap() {
                println!("  found: {}", entry.unwrap().path().display());
            }
        }

        println!("--- extract_project 結果 ---");
        match extract_project(root_path) {
            Ok(result) => {
                println!("nodes: {}", result.nodes.len());
                println!("edges: {}", result.edges.len());
                println!("{:#?}", result);
            }
            Err(e) => {
                println!("Err: {e}");
            }
        }
    }
}