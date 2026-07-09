//! services/db — SurrealDB セットアップ・共通ユーティリティ
//!
//! 第1スライス: project テーブルのみ。

use serde::{Deserialize, Serialize};
use surrealdb::engine::local::SurrealKv;
use surrealdb::Surreal;

/// Thing 型を "tb:id" 形式の文字列に変換するヘルパー。
pub fn thing_to_string(thing: &surrealdb::sql::Thing) -> String {
    format!("{}:{}", thing.tb, thing.id)
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ProjectRecord {
    pub id: surrealdb::sql::Thing,
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    pub root_path: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ProjectInput {
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    pub root_path: String,
}

pub type Db = Surreal<surrealdb::engine::local::Db>;

pub async fn init_db(app_data_dir: std::path::PathBuf) -> Result<Db, surrealdb::Error> {
    let db_path = app_data_dir.join("zizhou.db");
    let db = Surreal::new::<SurrealKv>(db_path).await?;
    db.use_ns("zizhou").use_db("zizhou").await?;

    // 既存レコードに root_path がない場合は空文字で補完
    db.query("UPDATE project SET root_path = '' WHERE root_path IS NONE")
        .await?;

    Ok(db)
}
