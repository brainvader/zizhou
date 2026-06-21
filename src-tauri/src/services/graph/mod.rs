//! services/graph — グラフ CRUD + ReactFlow 変換
//!
//! @context CTX-15: save_graph / load_graph
//! @context CTX-20: get_or_create_structure_graph

use serde::{Deserialize, Serialize};

use crate::services::db::{
    thing_to_string, Db, EdgeInput, EdgeRecord, GraphInput, GraphRecord, NodeInput, NodeRecord,
};

// ============================================================
// save_graph / load_graph 用の型定義                  [CTX-15]
// ============================================================

#[derive(Debug, Serialize, Deserialize)]
pub struct SaveNodeInput {
    pub id: String,
    pub label: String,
    pub node_type: Option<String>,
    pub status: Option<String>,
    pub service: Option<String>,
    pub provider: Option<String>,
    pub input: Option<serde_json::Value>,
    pub description: Option<String>,
    pub position_x: f64,
    pub position_y: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SaveEdgeInput {
    pub id: String,
    pub source: String,
    pub target: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LoadGraphResponse {
    pub id: String,
    pub nodes: Vec<serde_json::Value>,
    pub edges: Vec<serde_json::Value>,
}

// ============================================================
// グラフ一覧・作成
// ============================================================

/// 指定プロジェクトのグラフ一覧を返す。
pub async fn list_graphs(db: &Db, project_id: &str) -> Result<Vec<serde_json::Value>, String> {
    let records: Vec<GraphRecord> = db
        .query("SELECT * FROM graph WHERE project_id = $pid")
        .bind(("pid", project_id.to_string()))
        .await
        .map_err(|e| e.to_string())?
        .take(0)
        .map_err(|e| e.to_string())?;
    Ok(records
        .into_iter()
        .map(|r| {
            let mut obj = serde_json::json!({
                "id": thing_to_string(&r.id),
                "name": r.name,
                "project_id": r.project_id,
            });
            if let Some(k) = r.kind {
                obj["kind"] = k.into();
            }
            obj
        })
        .collect())
}

/// グラフを作成する。
pub async fn create_graph(
    db: &Db,
    project_id: &str,
    name: &str,
) -> Result<serde_json::Value, String> {
    let input = GraphInput {
        name: name.to_string(),
        project_id: project_id.to_string(),
        kind: None,
    };
    let created: Option<GraphRecord> = db
        .create("graph")
        .content(input)
        .await
        .map_err(|e| e.to_string())?;
    let r = created.ok_or_else(|| String::from("Failed to create graph"))?;
    Ok(serde_json::json!({
        "id": thing_to_string(&r.id),
        "name": r.name,
        "project_id": r.project_id,
    }))
}

// ============================================================
// グラフ永続化                                        [CTX-15]
// ============================================================

/// グラフのノード・エッジを SurrealDB に保存する（全置換方式）。
pub async fn save_graph(
    db: &Db,
    graph_id: &str,
    nodes: Vec<SaveNodeInput>,
    edges: Vec<SaveEdgeInput>,
) -> Result<(), String> {
    // 既存レコードを削除
    db.query("DELETE node WHERE graph_id = $gid")
        .bind(("gid", graph_id.to_string()))
        .await
        .map_err(|e| e.to_string())?;
    db.query("DELETE edge WHERE graph_id = $gid")
        .bind(("gid", graph_id.to_string()))
        .await
        .map_err(|e| e.to_string())?;

    // ノードを INSERT
    for node in nodes {
        let input = NodeInput {
            graph_id: graph_id.to_string(),
            label: node.label,
            node_type: node.node_type,
            status: node.status,
            service: node.service,
            provider: node.provider,
            input: node.input,
            description: node.description,
            position_x: node.position_x,
            position_y: node.position_y,
            file_path: None,
            analyzed: None,
        };
        let _: Option<NodeRecord> = db
            .create("node")
            .content(input)
            .await
            .map_err(|e| e.to_string())?;
    }

    // エッジを INSERT
    for edge in edges {
        let input = EdgeInput {
            graph_id: graph_id.to_string(),
            source: edge.source,
            target: edge.target,
            kind: None,
        };
        let _: Option<EdgeRecord> = db
            .create("edge")
            .content(input)
            .await
            .map_err(|e| e.to_string())?;
    }

    Ok(())
}

/// グラフのノード・エッジを取得して ReactFlow 形式で返す。
pub async fn load_graph(db: &Db, graph_id: String) -> Result<LoadGraphResponse, String> {
    let raw_nodes: Vec<NodeRecord> = db
        .query("SELECT * FROM node WHERE graph_id = $gid")
        .bind(("gid", graph_id.clone()))
        .await
        .map_err(|e| e.to_string())?
        .take(0)
        .map_err(|e| e.to_string())?;

    let raw_edges: Vec<EdgeRecord> = db
        .query("SELECT * FROM edge WHERE graph_id = $gid")
        .bind(("gid", graph_id.clone()))
        .await
        .map_err(|e| e.to_string())?
        .take(0)
        .map_err(|e| e.to_string())?;

    // ReactFlow Node 形式に変換 { id, type, position: { x, y }, data: { label, ... } }
    let nodes: Vec<serde_json::Value> = raw_nodes
        .into_iter()
        .map(|n| {
            let mut data = serde_json::json!({ "label": n.label });
            if let Some(v) = n.node_type {
                data["nodeType"] = v.into();
            }
            if let Some(v) = n.status {
                data["status"] = v.into();
            }
            if let Some(v) = n.service {
                data["service"] = v.into();
            }
            if let Some(v) = n.provider {
                data["provider"] = v.into();
            }
            if let Some(v) = n.input {
                data["input"] = v;
            }
            if let Some(v) = n.description {
                data["description"] = v.into();
            }
            // [CTX-20]
            if let Some(v) = n.file_path {
                data["filePath"] = v.into();
            }
            if let Some(v) = n.analyzed {
                data["analyzed"] = v.into();
            }
            serde_json::json!({
                "id": thing_to_string(&n.id),
                "type": "editableNode",
                "position": { "x": n.position_x, "y": n.position_y },
                "data": data,
            })
        })
        .collect();

    let edges: Vec<serde_json::Value> = raw_edges
        .into_iter()
        .map(|e| {
            let mut obj = serde_json::json!({
                "id": thing_to_string(&e.id),
                "source": e.source,
                "target": e.target,
            });
            // [CTX-20]
            if let Some(k) = e.kind {
                obj["kind"] = k.into();
            }
            obj
        })
        .collect();

    Ok(LoadGraphResponse {
        id: graph_id,
        nodes,
        edges,
    })
}

// ============================================================
// [CTX-20] Structure Graph
// ============================================================

/// プロジェクトの structure グラフを取得する。なければ作成する。
pub async fn get_or_create_structure_graph(
    db: &Db,
    project_id: &str,
) -> Result<GraphRecord, String> {
    let existing: Vec<GraphRecord> = db
        .query("SELECT * FROM graph WHERE project_id = $pid AND kind = 'structure' LIMIT 1")
        .bind(("pid", project_id.to_string()))
        .await
        .map_err(|e| e.to_string())?
        .take(0)
        .map_err(|e| e.to_string())?;

    if let Some(g) = existing.into_iter().next() {
        return Ok(g);
    }

    let input = GraphInput {
        name: "Structure".to_string(),
        project_id: project_id.to_string(),
        kind: Some("structure".to_string()),
    };
    let created: Option<GraphRecord> = db
        .create("graph")
        .content(input)
        .await
        .map_err(|e| e.to_string())?;
    created.ok_or_else(|| String::from("Failed to create structure graph"))
}
