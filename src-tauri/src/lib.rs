//! lib.rs — Tauri エントリポイント
//!
//! @context CTX-13: catalog_get_all / catalog_search コマンド
//! @context CTX-14: execute_node コマンド
//! @context CTX-SurrealDB-migration: list_projects / create_project / list_graphs / create_graph コマンド追加
//! @context CTX-15: save_graph / load_graph コマンド追加
//! @context CTX-19: list_fs_tree コマンド追加
//! @context CTX-20: get_structure_graph / analyze_file / analyze_project / get_changed_files

mod analyzer;
mod services;
mod vcs;

use serde::{Deserialize, Serialize};
use services::db::{
    thing_to_string, Db, EdgeInput, EdgeRecord, NodeCatalog, NodeInput, NodeRecord, ProjectInput,
    ProjectRecord,
};
use services::graph::{LoadGraphResponse, SaveEdgeInput, SaveNodeInput};
use std::path::Path;
use tauri::{Manager, State};
use vcs::{GitProvider, VcsProvider};

// ============================================================
// execute_node 用の型定義
// ============================================================

#[derive(Debug, Serialize, Deserialize)]
pub struct ExecuteError {
    pub code: String,
    pub message: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ExecuteResponse {
    pub success: bool,
    pub output: Option<serde_json::Value>,
    pub error: Option<ExecuteError>,
}

// ============================================================
// list_fs_tree 用の型定義                             [CTX-19]
// ============================================================

#[derive(Debug, Serialize)]
pub struct FsNode {
    pub name: String,
    pub path: String,
    pub kind: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub children: Option<Vec<FsNode>>,
}

const FS_EXCLUDES: &[&str] = &["node_modules", ".git", "target", ".next", "dist"];

fn read_dir_recursive(
    path: &std::path::Path,
    root: &std::path::Path,
    max_depth: u32,
) -> Vec<FsNode> {
    let Ok(entries) = std::fs::read_dir(path) else {
        return vec![];
    };
    let mut nodes: Vec<FsNode> = entries
        .flatten()
        .filter_map(|e| {
            let name = e.file_name().to_string_lossy().to_string();
            if FS_EXCLUDES.contains(&name.as_str()) {
                return None;
            }
            let full = e.path();
            let rel = full.strip_prefix(root).unwrap_or(&full);
            let path_str = rel.to_string_lossy().replace('\\', "/");
            let is_dir = full.is_dir();
            let children = if is_dir && max_depth > 0 {
                Some(read_dir_recursive(&full, root, max_depth - 1))
            } else if is_dir {
                Some(vec![])
            } else {
                None
            };
            Some(FsNode {
                name,
                path: path_str,
                kind: if is_dir { "dir".into() } else { "file".into() },
                children,
            })
        })
        .collect();
    nodes.sort_by(|a, b| {
        let ak = if a.kind == "dir" { 0 } else { 1 };
        let bk = if b.kind == "dir" { 0 } else { 1 };
        ak.cmp(&bk).then(a.name.cmp(&b.name))
    });
    nodes
}

// ============================================================
// Tauri コマンド — FS Tree                            [CTX-19]
// ============================================================

/// プロジェクトの rootPath 以下のファイルツリーを返す。
/// 深度上限 5、node_modules / .git / target / dist / .next を除外する。
#[tauri::command]
fn list_fs_tree(root_path: String) -> Result<Vec<FsNode>, String> {
    let root = std::path::Path::new(&root_path);
    if !root.is_dir() {
        return Err(format!("not a directory: {root_path}"));
    }
    Ok(read_dir_recursive(root, root, 5))
}

// ============================================================
// Tauri コマンド — Node Catalog
// ============================================================

#[tauri::command]
async fn catalog_get_all(db: State<'_, Db>) -> Result<Vec<NodeCatalog>, String> {
    db.select("node_catalog").await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn catalog_search(query: String, db: State<'_, Db>) -> Result<Vec<NodeCatalog>, String> {
    let q = query.to_lowercase();
    db.query(
        "SELECT * FROM node_catalog
         WHERE string::lowercase(label) CONTAINS $q
            OR string::lowercase(service) CONTAINS $q",
    )
    .bind(("q", q))
    .await
    .map_err(|e| e.to_string())?
    .take(0)
    .map_err(|e| e.to_string())
}

// ============================================================
// Tauri コマンド — Project
// ============================================================

#[tauri::command]
async fn list_projects(db: State<'_, Db>) -> Result<Vec<serde_json::Value>, String> {
    let records: Vec<ProjectRecord> = db.select("project").await.map_err(|e| e.to_string())?;
    Ok(records
        .into_iter()
        .map(|r| {
            let mut obj = serde_json::json!({
                "id": thing_to_string(&r.id),
                "name": r.name,
                "rootPath": r.root_path,
            });
            if let Some(d) = r.description {
                obj["description"] = d.into();
            }
            obj
        })
        .collect())
}

#[tauri::command]
async fn create_project(
    name: String,
    description: Option<String>,
    root_path: String,
    db: State<'_, Db>,
) -> Result<serde_json::Value, String> {
    let input = ProjectInput {
        name,
        description: description.filter(|s| !s.is_empty()),
        root_path,
    };
    let created: Option<ProjectRecord> = db
        .create("project")
        .content(input)
        .await
        .map_err(|e| e.to_string())?;
    let r = created.ok_or_else(|| String::from("Failed to create project"))?;
    let mut obj = serde_json::json!({
        "id": thing_to_string(&r.id),
        "name": r.name,
        "rootPath": r.root_path,
    });
    if let Some(d) = r.description {
        obj["description"] = d.into();
    }
    Ok(obj)
}

// ============================================================
// Tauri コマンド — Graph                              [CTX-15]
// ============================================================

#[tauri::command]
async fn list_graphs(
    project_id: String,
    db: State<'_, Db>,
) -> Result<Vec<serde_json::Value>, String> {
    services::graph::list_graphs(&db, &project_id).await
}

#[tauri::command]
async fn create_graph(
    project_id: String,
    name: String,
    db: State<'_, Db>,
) -> Result<serde_json::Value, String> {
    services::graph::create_graph(&db, &project_id, &name).await
}

#[tauri::command]
async fn save_graph(
    graph_id: String,
    nodes: Vec<SaveNodeInput>,
    edges: Vec<SaveEdgeInput>,
    db: State<'_, Db>,
) -> Result<(), String> {
    services::graph::save_graph(&db, &graph_id, nodes, edges).await
}

#[tauri::command]
async fn load_graph(graph_id: String, db: State<'_, Db>) -> Result<LoadGraphResponse, String> {
    services::graph::load_graph(&db, graph_id).await
}

// ============================================================
// Tauri コマンド — execute_node
// ============================================================

#[tauri::command]
async fn execute_node(
    db: State<'_, Db>,
    service: String,
    provider: String,
    cwd: String,
    input: serde_json::Value,
) -> Result<ExecuteResponse, String> {
    let mut result = db
        .query("SELECT * FROM node_catalog WHERE service = $s AND provider = $p LIMIT 1")
        .bind(("s", service.clone()))
        .bind(("p", provider.clone()))
        .await
        .map_err(|e| e.to_string())?;

    let nodes: Vec<NodeCatalog> = result.take(0).map_err(|e| e.to_string())?;

    let node = match nodes.into_iter().next() {
        Some(n) => n,
        None => {
            return Ok(ExecuteResponse {
                success: false,
                output: None,
                error: Some(ExecuteError {
                    code: "SERVICE_NOT_FOUND".into(),
                    message: format!("No catalog entry found for {}:{}", service, provider),
                }),
            })
        }
    };

    let subcommand = input
        .get("subcommand")
        .and_then(|v| v.as_str())
        .unwrap_or("");
    if node.profile.subcommand != subcommand {
        return Ok(ExecuteResponse {
            success: false,
            output: None,
            error: Some(ExecuteError {
                code: "PROFILE_NOT_FOUND".into(),
                message: format!(
                    "Expected subcommand '{}', got '{}'",
                    node.profile.subcommand, subcommand
                ),
            }),
        });
    }

    let resolved = match resolve_args(&node.profile.args, &input) {
        Ok(args) => args,
        Err(msg) => {
            return Ok(ExecuteResponse {
                success: false,
                output: None,
                error: Some(ExecuteError {
                    code: "TEMPLATE_RESOLUTION_FAILED".into(),
                    message: msg,
                }),
            })
        }
    };

    let output = match std::process::Command::new("git")
        .args(&resolved)
        .current_dir(&cwd)
        .output()
    {
        Ok(o) => o,
        Err(e) => {
            return Ok(ExecuteResponse {
                success: false,
                output: None,
                error: Some(ExecuteError {
                    code: "CLI_EXECUTION_FAILED".into(),
                    message: e.to_string(),
                }),
            })
        }
    };

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();

    if output.status.success() {
        Ok(ExecuteResponse {
            success: true,
            output: Some(serde_json::json!({ "stdout": stdout, "stderr": stderr })),
            error: None,
        })
    } else {
        Ok(ExecuteResponse {
            success: false,
            output: Some(serde_json::json!({ "stdout": stdout, "stderr": stderr })),
            error: Some(ExecuteError {
                code: "CLI_EXECUTION_FAILED".into(),
                message: stderr,
            }),
        })
    }
}

// ============================================================
// テンプレート展開ヘルパー
// ============================================================

fn resolve_args(args: &[String], input: &serde_json::Value) -> Result<Vec<String>, String> {
    args.iter()
        .map(|arg| {
            if arg.starts_with("{input.") && arg.ends_with('}') {
                let key = &arg[7..arg.len() - 1];
                input
                    .get(key)
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string())
                    .ok_or_else(|| format!("Missing input key: {}", key))
            } else {
                Ok(arg.clone())
            }
        })
        .collect()
}

// ============================================================
// [CTX-20] get_changed_files
// ============================================================

#[tauri::command]
fn get_changed_files(root_path: String) -> Result<Vec<String>, String> {
    let provider = GitProvider;
    provider.get_changed_files(&root_path)
}

// ============================================================
// [CTX-20] Structure Graph / Analysis ヘルパー
// ============================================================

/// `file_path` に対応するノードを取得 or 作成する。
async fn upsert_file_node(
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

async fn do_analyze_file(
    db: &Db,
    project: &ProjectRecord,
    graph_id: &str,
    file_rel_path: &str,
) -> Result<(), String> {
    let root_path = Path::new(&project.root_path);
    let absolute = root_path.join(file_rel_path);
    let source = std::fs::read_to_string(&absolute)
        .map_err(|e| format!("Failed to read {}: {}", file_rel_path, e))?;

    let edges = analyzer::extract_imports(root_path, file_rel_path, &source)?;

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

fn collect_source_files(root: &Path) -> Vec<String> {
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
// [CTX-20] Tauri コマンド
// ============================================================

#[tauri::command]
async fn get_structure_graph(
    project_id: String,
    db: State<'_, Db>,
) -> Result<LoadGraphResponse, String> {
    let graph = services::graph::get_or_create_structure_graph(&db, &project_id).await?;
    let gid = thing_to_string(&graph.id);
    services::graph::load_graph(&db, gid).await
}

#[tauri::command]
async fn analyze_file(
    project_id: String,
    file_path: String,
    db: State<'_, Db>,
) -> Result<(), String> {
    let project = services::db::get_project(&db, &project_id).await?;
    let graph = services::graph::get_or_create_structure_graph(&db, &project_id).await?;
    let gid = thing_to_string(&graph.id);
    do_analyze_file(&db, &project, &gid, &file_path).await
}

#[tauri::command]
async fn analyze_project(project_id: String, db: State<'_, Db>) -> Result<(), String> {
    let project = services::db::get_project(&db, &project_id).await?;
    let graph = services::graph::get_or_create_structure_graph(&db, &project_id).await?;
    let gid = thing_to_string(&graph.id);

    let root = Path::new(&project.root_path);
    if !root.is_dir() {
        return Err(format!("not a directory: {}", project.root_path));
    }

    let files = collect_source_files(root);
    for rel_path in files {
        if let Err(e) = do_analyze_file(&db, &project, &gid, &rel_path).await {
            eprintln!("[analyze_project] {} failed: {}", rel_path, e);
        }
    }
    Ok(())
}

// ============================================================
// エントリポイント
// ============================================================

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let app_data_dir = app
                .path()
                .app_data_dir()
                .expect("Failed to get app data dir");
            std::fs::create_dir_all(&app_data_dir).expect("Failed to create app data dir");
            let db = tauri::async_runtime::block_on(services::db::init_db(app_data_dir))
                .expect("Failed to initialize SurrealDB");
            app.manage(db);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            catalog_get_all,
            catalog_search,
            execute_node,
            list_projects,
            create_project,
            list_graphs,
            create_graph,
            save_graph,
            load_graph,
            list_fs_tree,
            // [CTX-20]
            get_changed_files,
            get_structure_graph,
            analyze_file,
            analyze_project,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
