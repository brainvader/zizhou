//! lib.rs — Tauri エントリポイント
//!
//! @context CTX-13: catalog_get_all / catalog_search コマンド追加
//! @context CTX-14: execute_node コマンド追加

mod db;

use db::{Db, NodeCatalog};
use serde::{Deserialize, Serialize};
use tauri::State;

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
// Tauri コマンド
// ============================================================

/// 全カタログエントリを返す。
/// フロントの useCatalogSearch が query 空のとき呼ぶ。
#[tauri::command]
async fn catalog_get_all(db: State<'_, Db>) -> Result<Vec<NodeCatalog>, String> {
    db.select("node_catalog").await.map_err(|e| e.to_string())
}

/// query で label / service を部分一致検索して返す。
/// フロントの useCatalogSearch が query ありのとき呼ぶ。
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

/// ノードを単体実行する。
///
/// 1. SurrealDB から service + provider に一致するカタログエントリを取得する
/// 2. input.subcommand とプロファイルの subcommand が一致するか確認する
/// 3. profile.args のテンプレート（{input.xxx}）を input の値で展開する
/// 4. CLI を std::process::Command で実行する
///
/// # エラーコード
/// - SERVICE_NOT_FOUND:          service + provider に一致するエントリなし
/// - PROFILE_NOT_FOUND:          input.subcommand がプロファイルの subcommand と不一致
/// - TEMPLATE_RESOLUTION_FAILED: {input.xxx} のキーが input に存在しない
/// - CLI_EXECUTION_FAILED:       プロセス起動失敗
#[tauri::command]
async fn execute_node(
    db: State<'_, Db>,
    service: String,
    provider: String,
    cwd: String,
    input: serde_json::Value,
) -> Result<ExecuteResponse, String> {
    // 1. SurrealDB からノード定義を取得
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

    // 2. subcommand の一致確認（防御的チェック）
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

    // 3. テンプレート展開
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

    // 4. CLI 実行（シェル文字列渡し禁止。args を配列として渡す）
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

/// profile.args 内の "{input.xxx}" を input の値で展開する。
/// 例: "{input.subcommand}" → input["subcommand"] の文字列値
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
    let db = tauri::async_runtime::block_on(db::init_db()).expect("Failed to initialize SurrealDB");

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(db)
        .invoke_handler(tauri::generate_handler![
            catalog_get_all,
            catalog_search,
            execute_node,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
