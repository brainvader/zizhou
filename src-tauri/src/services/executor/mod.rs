//! services/executor — ノード実行エンジン
//!
//! @context CTX-14: execute_node
//!
//! 現在は git コマンドのみ。将来的にサービス種別ごとのサブモジュール分割を想定。

use serde::{Deserialize, Serialize};

use crate::services::db::{Db, NodeCatalog};

// ============================================================
// 型定義
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
// 実行ロジック
// ============================================================

pub async fn execute_node(
    db: &Db,
    service: &str,
    provider: &str,
    cwd: &str,
    input: &serde_json::Value,
) -> Result<ExecuteResponse, String> {
    let mut result = db
        .query("SELECT * FROM node_catalog WHERE service = $s AND provider = $p LIMIT 1")
        .bind(("s", service.to_string()))
        .bind(("p", provider.to_string()))
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

    let resolved = match resolve_args(&node.profile.args, input) {
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
        .current_dir(cwd)
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
