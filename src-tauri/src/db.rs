//! db.rs — SurrealDB セットアップ・スキーマ定義・初期データ INSERT
//!
//! @context CTX-13: node_catalog テーブル
//! @context CTX-SurrealDB-migration: project / graph テーブル追加
//! @context CTX-15: node / edge テーブル追加（グラフ永続化）
//! @note    kv-surrealkv（RocksDB 永続化）を使用。
//!          surrealdb 2.6.x (stable) を使用。

use serde::{Deserialize, Serialize};
use surrealdb::engine::local::SurrealKv;
use surrealdb::Surreal;

// ============================================================
// 型定義（フロントの CatalogEntry / CatalogProfile に対応）
// ============================================================

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CatalogField {
    #[serde(rename = "type")]
    pub field_type: String,
    pub label: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub required: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub default: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub values: Option<Vec<String>>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CatalogProfile {
    pub subcommand: String,
    pub args: Vec<String>,
    pub fields: std::collections::HashMap<String, CatalogField>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct NodeCatalog {
    pub service: String,
    pub provider: String,
    pub label: String,
    pub node_type: String,
    pub profile: CatalogProfile,
}

// ============================================================
// Project / Graph 型定義
// id は Thing 型を String にシリアライズする
// ============================================================

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ProjectRecord {
    pub id: surrealdb::sql::Thing,
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ProjectInput {
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GraphRecord {
    pub id: surrealdb::sql::Thing,
    pub name: String,
    pub project_id: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GraphInput {
    pub name: String,
    pub project_id: String,
}

// ============================================================
// Node / Edge 型定義                                  [CTX-15]
// ============================================================

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct NodeRecord {
    pub id: surrealdb::sql::Thing,
    pub graph_id: String,
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

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct NodeInput {
    pub graph_id: String,
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

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct EdgeRecord {
    pub id: surrealdb::sql::Thing,
    pub graph_id: String,
    pub source: String,
    pub target: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct EdgeInput {
    pub graph_id: String,
    pub source: String,
    pub target: String,
}

// ============================================================
// DB 初期化
// ============================================================

pub type Db = Surreal<surrealdb::engine::local::Db>;

pub async fn init_db(app_data_dir: std::path::PathBuf) -> Result<Db, surrealdb::Error> {
    let db_path = app_data_dir.join("zizhou.db");
    let db = Surreal::new::<SurrealKv>(db_path).await?;
    db.use_ns("zizhou").use_db("zizhou").await?;

    // node_catalog が空のときだけシードする（再起動で重複しない）
    let count: Option<serde_json::Value> = db
        .query("SELECT count() FROM node_catalog GROUP ALL")
        .await?
        .take(0)?;
    let is_empty = count
        .and_then(|v| v.get("count").and_then(|c| c.as_i64()))
        .unwrap_or(0)
        == 0;

    if is_empty {
        seed_catalog(&db).await?;
    }

    Ok(db)
}

// ============================================================
// 初期データ（node_catalog シード）
// ============================================================

async fn seed_catalog(db: &Db) -> Result<(), surrealdb::Error> {
    use std::collections::HashMap;

    let entries: Vec<NodeCatalog> = vec![
        NodeCatalog {
            service: "git".into(),
            provider: "local".into(),
            label: "Git Status".into(),
            node_type: "git".into(),
            profile: CatalogProfile {
                subcommand: "status".into(),
                args: vec!["status".into()],
                fields: HashMap::new(),
            },
        },
        NodeCatalog {
            service: "git".into(),
            provider: "local".into(),
            label: "Git Diff".into(),
            node_type: "git".into(),
            profile: CatalogProfile {
                subcommand: "diff".into(),
                args: vec!["diff".into()],
                fields: HashMap::new(),
            },
        },
        NodeCatalog {
            service: "git".into(),
            provider: "local".into(),
            label: "Git Log".into(),
            node_type: "git".into(),
            profile: CatalogProfile {
                subcommand: "log".into(),
                args: vec!["log".into(), "--oneline".into(), "-20".into()],
                fields: HashMap::new(),
            },
        },
        NodeCatalog {
            service: "validate".into(),
            provider: "local".into(),
            label: "TypeScript Check".into(),
            node_type: "validate".into(),
            profile: CatalogProfile {
                subcommand: "tsc".into(),
                args: vec!["tsc".into(), "--noEmit".into()],
                fields: HashMap::new(),
            },
        },
        NodeCatalog {
            service: "validate".into(),
            provider: "local".into(),
            label: "Lint Check".into(),
            node_type: "validate".into(),
            profile: CatalogProfile {
                subcommand: "lint".into(),
                args: vec!["eslint".into(), ".".into()],
                fields: HashMap::new(),
            },
        },
        NodeCatalog {
            service: "analyze".into(),
            provider: "local".into(),
            label: "Test Run".into(),
            node_type: "analyze".into(),
            profile: CatalogProfile {
                subcommand: "test".into(),
                args: vec!["vitest".into(), "run".into()],
                fields: HashMap::new(),
            },
        },
        NodeCatalog {
            service: "llm".into(),
            provider: "ollama".into(),
            label: "Ollama: Prompt".into(),
            node_type: "llm".into(),
            profile: CatalogProfile {
                subcommand: "prompt".into(),
                args: vec![],
                fields: {
                    let mut f = HashMap::new();
                    f.insert(
                        "prompt".into(),
                        CatalogField {
                            field_type: "string".into(),
                            label: "Prompt".into(),
                            required: Some(true),
                            default: None,
                            values: None,
                        },
                    );
                    f
                },
            },
        },
        NodeCatalog {
            service: "llm".into(),
            provider: "claude".into(),
            label: "Claude: Review".into(),
            node_type: "llm".into(),
            profile: CatalogProfile {
                subcommand: "review".into(),
                args: vec![],
                fields: {
                    let mut f = HashMap::new();
                    f.insert(
                        "prompt".into(),
                        CatalogField {
                            field_type: "string".into(),
                            label: "Review Prompt".into(),
                            required: Some(true),
                            default: None,
                            values: None,
                        },
                    );
                    f
                },
            },
        },
        NodeCatalog {
            service: "custom".into(),
            provider: "local".into(),
            label: "Shell Command".into(),
            node_type: "custom".into(),
            profile: CatalogProfile {
                subcommand: "shell".into(),
                args: vec!["{input.command}".into()],
                fields: {
                    let mut f = HashMap::new();
                    f.insert(
                        "command".into(),
                        CatalogField {
                            field_type: "string".into(),
                            label: "Command".into(),
                            required: Some(true),
                            default: None,
                            values: None,
                        },
                    );
                    f
                },
            },
        },
    ];

    for entry in entries {
        let _: Option<NodeCatalog> = db.create("node_catalog").content(entry).await?;
    }

    Ok(())
}
