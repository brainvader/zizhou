//! lib.rs — Tauri エントリポイント（コマンド登録のみ）
//!
//! 第1スライス: Project CRUD のみ。
//! Graph / Analysis / VCS / FS Tree は後続コンテキスト。

mod services;

use services::db::{thing_to_string, Db, ProjectInput, ProjectRecord};
use tauri::{Manager, State};

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
        .invoke_handler(tauri::generate_handler![list_projects, create_project])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
