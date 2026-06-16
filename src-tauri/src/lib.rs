//! lib.rs — Tauri エントリポイント（コマンド登録のみ）
//!
//! @context CTX-SurrealDB-migration: list_projects / create_project / list_graphs / create_graph コマンド追加
//! @context CTX-15: save_graph / load_graph コマンド追加
//! @context CTX-19: list_fs_tree コマンド追加
//! @context CTX-20: get_structure_graph / analyze_file / analyze_project / get_changed_files
//! @context CTX-22: analyze_tests / list_test_suites / list_test_cases / get_related_nodes

mod services;

use serde::Serialize;
use services::analysis::FS_EXCLUDES;
use services::db::{thing_to_string, Db, ProjectInput, ProjectRecord};
use services::graph::{LoadGraphResponse, SaveEdgeInput, SaveNodeInput};
use services::vcs::{self, VcsProvider};
use std::path::Path;
use tauri::{Manager, State};

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

#[tauri::command]
fn list_fs_tree(root_path: String) -> Result<Vec<FsNode>, String> {
    let root = std::path::Path::new(&root_path);
    if !root.is_dir() {
        return Err(format!("not a directory: {root_path}"));
    }
    Ok(read_dir_recursive(root, root, 5))
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
// Tauri コマンド — VCS / Analysis                     [CTX-20]
// ============================================================

#[tauri::command]
fn get_changed_files(root_path: String) -> Result<Vec<String>, String> {
    let provider = vcs::git::GitProvider;
    provider.get_changed_files(&root_path)
}

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
    services::analysis::do_analyze_file(&db, &project, &gid, &file_path).await
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

    let files = services::analysis::collect_source_files(root);
    for rel_path in files {
        if let Err(e) = services::analysis::do_analyze_file(&db, &project, &gid, &rel_path).await {
            eprintln!("[analyze_project] {} failed: {}", rel_path, e);
        }
    }
    Ok(())
}

// ============================================================
// Tauri コマンド — Test Analysis                      [CTX-22]
// ============================================================

#[tauri::command]
async fn analyze_tests(project_id: String, db: State<'_, Db>) -> Result<(), String> {
    let project = services::db::get_project(&db, &project_id).await?;
    services::test_analysis::analyze_tests(&db, &project).await
}

#[tauri::command]
async fn list_test_suites(
    project_id: String,
    db: State<'_, Db>,
) -> Result<Vec<services::test_analysis::TestSuiteResponse>, String> {
    services::test_analysis::list_test_suites(&db, &project_id).await
}

#[tauri::command]
async fn list_test_cases(
    suite_id: String,
    db: State<'_, Db>,
) -> Result<Vec<services::test_analysis::TestCaseResponse>, String> {
    services::test_analysis::list_test_cases(&db, &suite_id).await
}

#[tauri::command]
async fn get_related_nodes(
    project_id: String,
    file_path: String,
    db: State<'_, Db>,
) -> Result<serde_json::Value, String> {
    services::analysis::get_related_nodes(&db, &project_id, &file_path).await
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
            // [CTX-22] Test Analysis
            analyze_tests,
            list_test_suites,
            list_test_cases,
            get_related_nodes,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
