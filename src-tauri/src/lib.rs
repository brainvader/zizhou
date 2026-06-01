//! lib.rs — Tauri エントリポイント
//!
//! @context CTX-13: catalog_get_all / catalog_search コマンド
//! @context CTX-14: execute_node コマンド
//! @context CTX-SurrealDB-migration: list_projects / create_project / list_graphs / create_graph コマンド追加
//! @context CTX-15: save_graph / load_graph コマンド追加

mod db;

use db::{Db, NodeCatalog};
use serde::{Deserialize, Serialize};
use tauri::{Manager, State};

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
// save_graph / load_graph 用の型定義                  [CTX-15]
// ============================================================

/// フロントから受け取るノードの形状（ReactFlow Node<GraphNodeData> のフラット版）
#[derive(Debug, Serialize, Deserialize)]
pub struct SaveNodeInput {
    pub id: String,
    pub label: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub node_type: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub status: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub service: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub provider: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub input: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    pub position_x: f64,
    pub position_y: f64,
}

/// フロントから受け取るエッジの形状
#[derive(Debug, Serialize, Deserialize)]
pub struct SaveEdgeInput {
    pub id: String,
    pub source: String,
    pub target: String,
}

/// load_graph のレスポンス。GraphFile 形式に対応する。
#[derive(Debug, Serialize, Deserialize)]
pub struct LoadGraphResponse {
    pub id: String,
    pub nodes: Vec<serde_json::Value>,
    pub edges: Vec<serde_json::Value>,
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

/// 全プロジェクトを返す。起動時に invoke('list_projects') で呼ぶ。
#[tauri::command]
async fn list_projects(db: State<'_, Db>) -> Result<Vec<serde_json::Value>, String> {
    let mut records: Vec<serde_json::Value> =
        db.select("project").await.map_err(|e| e.to_string())?;
    for r in &mut records {
        normalize_id(r);
    }
    Ok(records)
}

/// プロジェクトを作成する。id は SurrealDB が自動生成する。
/// id フィールドを文字列に正規化して返す。
/// serde_json::Value で INSERT することで Option<T> の enum シリアライズ問題を回避する。
#[tauri::command]
async fn create_project(
    name: String,
    description: Option<String>,
    db: State<'_, Db>,
) -> Result<serde_json::Value, String> {
    let mut obj = serde_json::json!({ "name": name });
    if let Some(desc) = description.filter(|s| !s.is_empty()) {
        obj["description"] = serde_json::Value::String(desc);
    }
    let created: Option<serde_json::Value> = db
        .create("project")
        .content(obj)
        .await
        .map_err(|e| e.to_string())?;
    let mut record = created.ok_or_else(|| String::from("Failed to create project"))?;
    normalize_id(&mut record);
    Ok(record)
}

// ============================================================
// Tauri コマンド — Graph
// ============================================================
/// 指定プロジェクトのグラフ一覧を返す。
#[tauri::command]
async fn list_graphs(
    project_id: String,
    db: State<'_, Db>,
) -> Result<Vec<serde_json::Value>, String> {
    db.query("SELECT * FROM graph WHERE project_id = $pid")
        .bind(("pid", project_id))
        .await
        .map_err(|e| e.to_string())?
        .take(0)
        .map_err(|e| e.to_string())
}
/// グラフを作成する。id は SurrealDB が自動生成する。
#[tauri::command]
async fn create_graph(
    project_id: String,
    name: String,
    db: State<'_, Db>,
) -> Result<serde_json::Value, String> {
    let obj = serde_json::json!({ "name": name, "project_id": project_id });
    let created: Option<serde_json::Value> = db
        .create("graph")
        .content(obj)
        .await
        .map_err(|e| e.to_string())?;
    created.ok_or_else(|| String::from("Failed to create graph"))
}
// ============================================================
// Tauri コマンド — Graph Persist                     [CTX-15]
// ============================================================
/// グラフのノード・エッジを SurrealDB に UPSERT する。
///
/// 処理フロー:
/// 1. graph_id に紐付く既存 node / edge レコードを DELETE する
/// 2. 受け取った nodes[] を node テーブルに INSERT する（id を指定して UPSERT）
/// 3. 受け取った edges[] を edge テーブルに INSERT する（id を指定して UPSERT）
///
/// フロントの saveGraph(nodes, edges) から呼ばれる。
/// useGraphSave の subscribe ベースの自動保存により、変化のたびに発火する。
#[tauri::command]
async fn save_graph(
    graph_id: String,
    nodes: Vec<SaveNodeInput>,
    edges: Vec<SaveEdgeInput>,
    db: State<'_, Db>,
) -> Result<(), String> {
    // 既存レコードを削除（全置換方式）
    db.query("DELETE node WHERE graph_id = $gid")
        .bind(("gid", graph_id.clone()))
        .await
        .map_err(|e| e.to_string())?;
    db.query("DELETE edge WHERE graph_id = $gid")
        .bind(("gid", graph_id.clone()))
        .await
        .map_err(|e| e.to_string())?;
    // ノードを INSERT（serde_json::Value で Option フィールドの enum 問題を回避）
    for node in nodes {
        let record_id = node.id.replace(':', "_");
        let mut obj = serde_json::json!({
            "graph_id": graph_id,
            "label": node.label,
            "position_x": node.position_x,
            "position_y": node.position_y,
        });
        if let Some(v) = node.node_type {
            obj["node_type"] = v.into();
        }
        if let Some(v) = node.status {
            obj["status"] = v.into();
        }
        if let Some(v) = node.service {
            obj["service"] = v.into();
        }
        if let Some(v) = node.provider {
            obj["provider"] = v.into();
        }
        if let Some(v) = node.input {
            obj["input"] = v;
        }
        if let Some(v) = node.description {
            obj["description"] = v.into();
        }
        let _: Option<serde_json::Value> = db
            .create(("node", record_id.as_str()))
            .content(obj)
            .await
            .map_err(|e| e.to_string())?;
    }
    // エッジを INSERT
    for edge in edges {
        let record_id = edge.id.replace(':', "_");
        let obj = serde_json::json!({
            "graph_id": graph_id,
            "source": edge.source,
            "target": edge.target,
        });
        let _: Option<serde_json::Value> = db
            .create(("edge", record_id.as_str()))
            .content(obj)
            .await
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}
/// グラフのノード・エッジを SurrealDB から取得して GraphFile 形式で返す。
///
/// 処理フロー:
/// 1. graph_id に紐付く node[] を SELECT する
/// 2. graph_id に紐付く edge[] を SELECT する
/// 3. { id: graphId, nodes: [...], edges: [...] } 形式で返す
///
/// フロントの useGraphLoad が activeGraphId 変化時に呼ぶ。
#[tauri::command]
async fn load_graph(graph_id: String, db: State<'_, Db>) -> Result<LoadGraphResponse, String> {
    let raw_nodes: Vec<serde_json::Value> = db
        .query("SELECT * FROM node WHERE graph_id = $gid")
        .bind(("gid", graph_id.clone()))
        .await
        .map_err(|e| e.to_string())?
        .take(0)
        .map_err(|e| e.to_string())?;
    let raw_edges: Vec<serde_json::Value> = db
        .query("SELECT * FROM edge WHERE graph_id = $gid")
        .bind(("gid", graph_id.clone()))
        .await
        .map_err(|e| e.to_string())?
        .take(0)
        .map_err(|e| e.to_string())?;
    // SurrealDB レコードを GraphFile の node 形式に変換する
    // { id, position: { x, y }, data: { label, nodeType, status, ... } }
    let nodes: Vec<serde_json::Value> = raw_nodes
        .into_iter()
        .map(|mut r| {
            normalize_id(&mut r);
            let id = r
                .get("id")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            let label = r
                .get("label")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            let position_x = r.get("position_x").and_then(|v| v.as_f64()).unwrap_or(0.0);
            let position_y = r.get("position_y").and_then(|v| v.as_f64()).unwrap_or(0.0);
            let mut data = serde_json::json!({ "label": label });
            for key in &[
                "node_type",
                "status",
                "service",
                "provider",
                "input",
                "description",
            ] {
                // フロント側は camelCase なので変換する
                let front_key = match *key {
                    "node_type" => "nodeType",
                    other => other,
                };
                if let Some(v) = r.get(*key) {
                    if !v.is_null() {
                        data[front_key] = v.clone();
                    }
                }
            }
            serde_json::json!({
                "id": id,
                "type": "editableNode",
                "position": { "x": position_x, "y": position_y },
                "data": data,
            })
        })
        .collect();
    // エッジも normalize_id して返す
    let edges: Vec<serde_json::Value> = raw_edges
        .into_iter()
        .map(|mut r| {
            normalize_id(&mut r);
            r
        })
        .collect();
    Ok(LoadGraphResponse {
        id: graph_id,
        nodes,
        edges,
    })
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
// SurrealDB Thing 型を文字列 id に正規化するヘルパー
// ============================================================
fn normalize_id(record: &mut serde_json::Value) {
    if let Some(id_val) = record.get("id").cloned() {
        let id_str = match &id_val {
            serde_json::Value::String(s) => s.clone(),
            serde_json::Value::Object(obj) => {
                let tb = obj.get("tb").and_then(|v| v.as_str()).unwrap_or("record");
                let id_part = obj
                    .get("id")
                    .and_then(|v| v.as_object())
                    .and_then(|o| o.get("String"))
                    .and_then(|v| v.as_str())
                    .unwrap_or("");
                format!("{}:{}", tb, id_part)
            }
            _ => id_val.to_string(),
        };
        if let Some(obj) = record.as_object_mut() {
            obj.insert("id".to_string(), serde_json::Value::String(id_str));
        }
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
            let db = tauri::async_runtime::block_on(db::init_db(app_data_dir))
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
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
