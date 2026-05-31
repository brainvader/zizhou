//! db.rs — SurrealDB セットアップ・スキーマ定義・初期データ INSERT
//!
//! @context CTX-13: node_catalog テーブル
//! @context CTX-SurrealDB-migration: project / graph / node / edge テーブル追加
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
// Project / Graph 型定義（フロントの Project / GraphRecord に対応）
// ============================================================

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Project {
    pub id: Option<surrealdb::sql::Thing>,
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
pub struct Graph {
    pub id: Option<surrealdb::sql::Thing>,
    pub name: String,
    pub project_id: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GraphInput {
    pub name: String,
    pub project_id: String,
}

// ============================================================
// DB 初期化
// ============================================================

pub type Db = Surreal<surrealdb::engine::local::Db>;

pub async fn init_db(app_data_dir: std::path::PathBuf) -> Result<Db, surrealdb::Error> {
    let db_path = app_data_dir.join("zizhou.db");
    let db = Surreal::new::<SurrealKv>(db_path).await?;
    db.use_ns("zizhou").use_db("zizhou").await?;

    // スキーマ定義
    db.query(
        "DEFINE TABLE node_catalog SCHEMALESS;
         DEFINE INDEX idx_label   ON node_catalog FIELDS label;
         DEFINE INDEX idx_service ON node_catalog FIELDS service;

         DEFINE TABLE project SCHEMALESS;
         DEFINE INDEX idx_project_name ON project FIELDS name;

         DEFINE TABLE graph SCHEMALESS;
         DEFINE INDEX idx_graph_project ON graph FIELDS project_id;",
    )
    .await?;

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
// 初期データ
// ============================================================

async fn seed_catalog(db: &Db) -> Result<(), surrealdb::Error> {
    let entries: Vec<NodeCatalog> = vec![
        // ── git ──────────────────────────────────────────────
        NodeCatalog {
            service: "git".into(),
            provider: "local".into(),
            label: "Git Status".into(),
            node_type: "git".into(),
            profile: CatalogProfile {
                subcommand: "status".into(),
                args: vec!["status".into()],
                fields: Default::default(),
            },
        },
        NodeCatalog {
            service: "git".into(),
            provider: "local".into(),
            label: "Git Commit".into(),
            node_type: "git".into(),
            profile: CatalogProfile {
                subcommand: "commit".into(),
                args: vec!["commit".into(), "-m".into(), "{input.message}".into()],
                fields: [(
                    "message".into(),
                    CatalogField {
                        field_type: "string".into(),
                        label: "Commit Message".into(),
                        required: Some(true),
                        default: None,
                        values: None,
                    },
                )]
                .into(),
            },
        },
        NodeCatalog {
            service: "git".into(),
            provider: "local".into(),
            label: "Git Log".into(),
            node_type: "git".into(),
            profile: CatalogProfile {
                subcommand: "log".into(),
                args: vec!["log".into(), "--oneline".into(), "-{input.count}".into()],
                fields: [(
                    "count".into(),
                    CatalogField {
                        field_type: "number".into(),
                        label: "Lines".into(),
                        required: None,
                        default: Some(serde_json::json!(10)),
                        values: None,
                    },
                )]
                .into(),
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
                fields: Default::default(),
            },
        },
        // ── validate ─────────────────────────────────────────
        NodeCatalog {
            service: "validate".into(),
            provider: "local".into(),
            label: "TypeScript Check".into(),
            node_type: "validate".into(),
            profile: CatalogProfile {
                subcommand: "tsc".into(),
                args: vec!["tsc".into(), "--noEmit".into()],
                fields: Default::default(),
            },
        },
        NodeCatalog {
            service: "validate".into(),
            provider: "local".into(),
            label: "ESLint".into(),
            node_type: "validate".into(),
            profile: CatalogProfile {
                subcommand: "eslint".into(),
                args: vec!["eslint".into(), "{input.target}".into()],
                fields: [(
                    "target".into(),
                    CatalogField {
                        field_type: "string".into(),
                        label: "Target Path".into(),
                        required: None,
                        default: Some(serde_json::json!("src")),
                        values: None,
                    },
                )]
                .into(),
            },
        },
        // ── analyze ──────────────────────────────────────────
        NodeCatalog {
            service: "analyze".into(),
            provider: "local".into(),
            label: "Test Run".into(),
            node_type: "analyze".into(),
            profile: CatalogProfile {
                subcommand: "vitest".into(),
                args: vec!["vitest".into(), "run".into()],
                fields: Default::default(),
            },
        },
        NodeCatalog {
            service: "analyze".into(),
            provider: "local".into(),
            label: "Build".into(),
            node_type: "analyze".into(),
            profile: CatalogProfile {
                subcommand: "build".into(),
                args: vec!["vite".into(), "build".into()],
                fields: Default::default(),
            },
        },
        // ── llm ──────────────────────────────────────────────
        NodeCatalog {
            service: "llm".into(),
            provider: "claude".into(),
            label: "Claude: Summarize".into(),
            node_type: "llm".into(),
            profile: CatalogProfile {
                subcommand: "summarize".into(),
                args: vec![],
                fields: [(
                    "prompt".into(),
                    CatalogField {
                        field_type: "string".into(),
                        label: "Prompt".into(),
                        required: Some(true),
                        default: None,
                        values: None,
                    },
                )]
                .into(),
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
                fields: [(
                    "prompt".into(),
                    CatalogField {
                        field_type: "string".into(),
                        label: "Review Prompt".into(),
                        required: Some(true),
                        default: None,
                        values: None,
                    },
                )]
                .into(),
            },
        },
        // ── custom ───────────────────────────────────────────
        NodeCatalog {
            service: "custom".into(),
            provider: "local".into(),
            label: "Shell Command".into(),
            node_type: "custom".into(),
            profile: CatalogProfile {
                subcommand: "shell".into(),
                args: vec!["{input.command}".into()],
                fields: [(
                    "command".into(),
                    CatalogField {
                        field_type: "string".into(),
                        label: "Command".into(),
                        required: Some(true),
                        default: None,
                        values: None,
                    },
                )]
                .into(),
            },
        },
    ];

    for entry in entries {
        let _: Option<NodeCatalog> = db.create("node_catalog").content(entry).await?;
    }

    Ok(())
}
