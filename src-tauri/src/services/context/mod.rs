//! services/context — SourceContext の CRUD
//!
//! @context CTX-22: Source Context
//!
//! SurrealDB の source_context テーブルに対する CRUD 操作を提供する。
//! テーブルは SCHEMALESS で定義する（object 型フィールドへの対応）。
//!
//! スキーマ:
//!   DEFINE TABLE source_context SCHEMALESS;
//!   フィールド:
//!     id:         record id（source_context:xxx）
//!     name:       string
//!     project_id: string（ref → project）
//!     node_ids:   array<string>

use serde::{Deserialize, Serialize};

use crate::services::db::{thing_to_string, Db};

// ============================================================
// 型定義
// ============================================================

/// SurrealDB source_context テーブルのレコード型。
/// db.create / db.query().take() で使用する。
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContextRecord {
    pub id: surrealdb::sql::Thing,
    pub name: String,
    pub project_id: String,
    pub node_ids: Vec<String>,
}

/// create_context の入力型。
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContextInput {
    pub name: String,
    pub project_id: String,
    pub node_ids: Vec<String>,
}

/// Tauri コマンドが返すフロントエンド向けの型。
/// Tauri の自動 camelCase 変換により project_id → projectId / node_ids → nodeIds になる。
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContextResponse {
    pub id: String,
    pub name: String,
    pub project_id: String,
    pub node_ids: Vec<String>,
}

impl From<ContextRecord> for ContextResponse {
    fn from(r: ContextRecord) -> Self {
        ContextResponse {
            id: thing_to_string(&r.id),
            name: r.name,
            project_id: r.project_id,
            node_ids: r.node_ids,
        }
    }
}

// ============================================================
// CRUD
// ============================================================

/// SourceContext を作成する。
/// SurrealDB が自動で ID を生成する（nanoid 不要）。
///
/// # Errors
/// SurrealDB の書き込みに失敗した場合は Err を返す。
pub async fn create_context(
    db: &Db,
    project_id: &str,
    name: &str,
    node_ids: Vec<String>,
) -> Result<ContextResponse, String> {
    let input = ContextInput {
        name: name.to_string(),
        project_id: project_id.to_string(),
        node_ids,
    };
    let created: Option<ContextRecord> = db
        .create("source_context")
        .content(input)
        .await
        .map_err(|e| e.to_string())?;
    let rec = created.ok_or_else(|| String::from("Failed to create source_context"))?;
    Ok(rec.into())
}

/// プロジェクト配下の SourceContext 一覧を返す。
pub async fn list_contexts(db: &Db, project_id: &str) -> Result<Vec<ContextResponse>, String> {
    let records: Vec<ContextRecord> = db
        .query("SELECT * FROM source_context WHERE project_id = $pid")
        .bind(("pid", project_id.to_string()))
        .await
        .map_err(|e| e.to_string())?
        .take(0)
        .map_err(|e| e.to_string())?;
    Ok(records.into_iter().map(ContextResponse::from).collect())
}

/// SourceContext の name と node_ids を更新する。
///
/// # Errors
/// 該当レコードが存在しない場合、または書き込み失敗時は Err を返す。
pub async fn update_context(
    db: &Db,
    context_id: &str,
    name: &str,
    node_ids: Vec<String>,
) -> Result<ContextResponse, String> {
    // context_id は "source_context:xxx" 形式で受け取る
    let updated: Option<ContextRecord> = db
        .query("UPDATE type::thing($id) SET name = $name, node_ids = $node_ids RETURN AFTER")
        .bind(("id", context_id.to_string()))
        .bind(("name", name.to_string()))
        .bind(("node_ids", node_ids))
        .await
        .map_err(|e| e.to_string())?
        .take(0)
        .map_err(|e| e.to_string())?;
    let rec = updated.ok_or_else(|| format!("source_context not found: {}", context_id))?;
    Ok(rec.into())
}

/// SourceContext を削除する（ノード自体は残す）。
pub async fn delete_context(db: &Db, context_id: &str) -> Result<(), String> {
    db.query("DELETE type::thing($id)")
        .bind(("id", context_id.to_string()))
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}
