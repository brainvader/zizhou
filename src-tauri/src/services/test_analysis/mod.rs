//! services/test_analysis — Vitest テストファイルの解析と永続化
//!
//! @context CTX-22: Test Context
//!
//! *.test.ts / *.spec.ts を tree-sitter で解析し、
//! describe / it ブロックを SurrealDB に UPSERT する。
//!
//! テーブル:
//!   test_file   — ファイル単位のレコード
//!   test_suite  — describe ブロック（ネスト対応）
//!   test_case   — it / test ブロック
//!
//! import 解析は既存の analysis::extract_imports を流用する。
//! import 先ノードの ID 解決は node テーブルから file_path で検索する。

use serde::{Deserialize, Serialize};
use std::path::Path;
use tree_sitter::Parser;

use crate::services::analysis::extract_imports;
use crate::services::db::{thing_to_string, Db, NodeRecord, ProjectRecord};

// ============================================================
// SurrealDB レコード型
// ============================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TestFileRecord {
    pub id: surrealdb::sql::Thing,
    pub project_id: String,
    pub file_path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TestFileInput {
    pub project_id: String,
    pub file_path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TestSuiteRecord {
    pub id: surrealdb::sql::Thing,
    pub test_file_id: String,
    pub parent_suite_id: Option<String>,
    pub name: String,
    pub node_ids: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TestSuiteInput {
    pub test_file_id: String,
    pub parent_suite_id: Option<String>,
    pub name: String,
    pub node_ids: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TestCaseRecord {
    pub id: surrealdb::sql::Thing,
    pub suite_id: String,
    pub name: String,
    pub order: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TestCaseInput {
    pub suite_id: String,
    pub name: String,
    pub order: i64,
}

// ============================================================
// フロントエンド向けレスポンス型
// ============================================================

/// Tauri コマンドが返す TestSuite 型。
/// Tauri の自動 camelCase 変換により
/// test_file_id → testFileId / parent_suite_id → parentSuiteId / node_ids → nodeIds になる。
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TestSuiteResponse {
    pub id: String,
    pub test_file_id: String,
    pub parent_suite_id: Option<String>,
    pub name: String,
    pub node_ids: Vec<String>,
}

impl From<TestSuiteRecord> for TestSuiteResponse {
    fn from(r: TestSuiteRecord) -> Self {
        TestSuiteResponse {
            id: thing_to_string(&r.id),
            test_file_id: r.test_file_id,
            parent_suite_id: r.parent_suite_id,
            name: r.name,
            node_ids: r.node_ids,
        }
    }
}

/// Tauri コマンドが返す TestCase 型。
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TestCaseResponse {
    pub id: String,
    pub suite_id: String,
    pub name: String,
    pub order: i64,
}

impl From<TestCaseRecord> for TestCaseResponse {
    fn from(r: TestCaseRecord) -> Self {
        TestCaseResponse {
            id: thing_to_string(&r.id),
            suite_id: r.suite_id,
            name: r.name,
            order: r.order,
        }
    }
}

// ============================================================
// tree-sitter による describe / it 抽出
// ============================================================

#[derive(Debug, Clone)]
pub struct DescribeBlock {
    pub name: String,
    pub cases: Vec<String>,
    pub children: Vec<DescribeBlock>,
}

/// TypeScript ソースから describe / it ブロックを抽出する。
pub fn extract_test_blocks(source: &str) -> Result<Vec<DescribeBlock>, String> {
    let mut parser = Parser::new();
    parser
        .set_language(&tree_sitter_typescript::LANGUAGE_TYPESCRIPT.into())
        .map_err(|e| format!("set_language(ts): {}", e))?;
    let tree = parser
        .parse(source, None)
        .ok_or_else(|| String::from("parse failed (ts)"))?;

    let mut blocks = vec![];
    collect_describes(tree.root_node(), source, &mut blocks);
    Ok(blocks)
}

/// tsx ソースから describe / it ブロックを抽出する。
pub fn extract_test_blocks_tsx(source: &str) -> Result<Vec<DescribeBlock>, String> {
    let mut parser = Parser::new();
    parser
        .set_language(&tree_sitter_typescript::LANGUAGE_TSX.into())
        .map_err(|e| format!("set_language(tsx): {}", e))?;
    let tree = parser
        .parse(source, None)
        .ok_or_else(|| String::from("parse failed (tsx)"))?;

    let mut blocks = vec![];
    collect_describes(tree.root_node(), source, &mut blocks);
    Ok(blocks)
}

fn collect_describes(node: tree_sitter::Node, src: &str, out: &mut Vec<DescribeBlock>) {
    if is_call(node, src, &["describe", "describe.only", "describe.skip"]) {
        if let Some(block) = parse_describe(node, src) {
            out.push(block);
            return; // ネストは parse_describe 内で再帰処理
        }
    }
    let mut cursor = node.walk();
    for child in node.children(&mut cursor) {
        collect_describes(child, src, out);
    }
}

fn parse_describe(node: tree_sitter::Node, src: &str) -> Option<DescribeBlock> {
    // describe("name", () => { ... })
    // 引数リストを取得
    let args = node.child_by_field_name("arguments")?;
    let mut cursor = args.walk();
    let mut children_iter = args.children(&mut cursor);

    // 第一引数: 文字列リテラル
    let name_node =
        children_iter.find(|n| n.kind() == "string" || n.kind() == "template_string")?;
    let raw = &src[name_node.byte_range()];
    let name = raw
        .trim_matches(|c| c == '"' || c == '\'' || c == '`')
        .to_string();

    // コールバック本体を探す
    let body_node = args.children(&mut args.walk()).find(|n| {
        n.kind() == "arrow_function" || n.kind() == "function_expression" || n.kind() == "function"
    })?;

    let statement_block = body_node
        .children(&mut body_node.walk())
        .find(|n| n.kind() == "statement_block")?;

    let mut cases = vec![];
    let mut nested = vec![];

    let mut c = statement_block.walk();
    for stmt in statement_block.children(&mut c) {
        // it / test
        if is_call(
            stmt,
            src,
            &["it", "test", "it.only", "test.only", "it.skip", "test.skip"],
        ) {
            if let Some(case_name) = extract_first_string_arg(stmt, src) {
                cases.push(case_name);
            }
        }
        // ネスト describe
        if is_call(stmt, src, &["describe", "describe.only", "describe.skip"]) {
            if let Some(child_block) = parse_describe(stmt, src) {
                nested.push(child_block);
            }
        }
        // expression_statement でラップされている場合
        if stmt.kind() == "expression_statement" {
            let mut ec = stmt.walk();
            for expr in stmt.children(&mut ec) {
                if is_call(
                    expr,
                    src,
                    &["it", "test", "it.only", "test.only", "it.skip", "test.skip"],
                ) {
                    if let Some(case_name) = extract_first_string_arg(expr, src) {
                        cases.push(case_name);
                    }
                }
                if is_call(expr, src, &["describe", "describe.only", "describe.skip"]) {
                    if let Some(child_block) = parse_describe(expr, src) {
                        nested.push(child_block);
                    }
                }
            }
        }
    }

    Some(DescribeBlock {
        name,
        cases,
        children: nested,
    })
}

/// ノードが指定の関数名の call_expression かを判定する。
fn is_call(node: tree_sitter::Node, src: &str, names: &[&str]) -> bool {
    if node.kind() != "call_expression" && node.kind() != "expression_statement" {
        return false;
    }
    let target = if node.kind() == "expression_statement" {
        node.children(&mut node.walk())
            .find(|n| n.kind() == "call_expression")
    } else {
        Some(node)
    };
    let Some(call) = target else { return false };
    let Some(func) = call.child_by_field_name("function") else {
        return false;
    };
    let func_text = &src[func.byte_range()];
    names.contains(&func_text)
}

/// call_expression の第一引数が文字列リテラルならその値を返す。
fn extract_first_string_arg(node: tree_sitter::Node, src: &str) -> Option<String> {
    let args = node.child_by_field_name("arguments")?;
    let first = args
        .children(&mut args.walk())
        .find(|n| n.kind() == "string" || n.kind() == "template_string")?;
    let raw = &src[first.byte_range()];
    Some(
        raw.trim_matches(|c| c == '"' || c == '\'' || c == '`')
            .to_string(),
    )
}

// ============================================================
// テストファイル判定
// ============================================================

pub fn is_test_file(path: &str) -> bool {
    let lower = path.to_lowercase();
    lower.ends_with(".test.ts")
        || lower.ends_with(".test.tsx")
        || lower.ends_with(".spec.ts")
        || lower.ends_with(".spec.tsx")
}

// ============================================================
// UPSERT ロジック
// ============================================================

/// 単一テストファイルを解析し SurrealDB に UPSERT する。
///
/// # 処理フロー
/// 1. ファイルを読み込み tree-sitter で describe / it を抽出する
/// 2. import を extract_imports で解析し node テーブルから nodeIds を解決する
/// 3. test_file / test_suite / test_case を UPSERT する
pub async fn do_analyze_test_file(
    db: &Db,
    project: &ProjectRecord,
    file_rel_path: &str,
) -> Result<(), String> {
    let root = Path::new(&project.root_path);
    let abs_path = root.join(file_rel_path);

    let source =
        std::fs::read_to_string(&abs_path).map_err(|e| format!("read {}: {}", file_rel_path, e))?;

    // describe / it 抽出
    let blocks = if file_rel_path.to_lowercase().ends_with(".tsx") {
        extract_test_blocks_tsx(&source)?
    } else {
        extract_test_blocks(&source)?
    };

    // import 解析 → node テーブルから nodeIds を解決
    let import_edges = extract_imports(root, file_rel_path, &source).unwrap_or_default();

    let node_ids = resolve_node_ids(
        db,
        &import_edges
            .iter()
            .map(|e| e.to.clone())
            .collect::<Vec<_>>(),
    )
    .await;

    // test_file を UPSERT
    let test_file_id = upsert_test_file(db, &project.id, file_rel_path).await?;

    // 既存の test_suite / test_case を削除してから再挿入（再解析）
    db.query("DELETE test_suite WHERE test_file_id = $id")
        .bind(("id", test_file_id.clone()))
        .await
        .map_err(|e| e.to_string())?;

    // describe ブロックを再帰的に UPSERT
    for block in &blocks {
        upsert_suite(db, &test_file_id, None, block, &node_ids, 0).await?;
    }

    Ok(())
}

/// プロジェクト配下の全テストファイルを解析する。
pub async fn analyze_tests(db: &Db, project: &ProjectRecord) -> Result<(), String> {
    let root = Path::new(&project.root_path);
    let files = collect_test_files(root);
    for rel_path in files {
        if let Err(e) = do_analyze_test_file(db, project, &rel_path).await {
            eprintln!("[analyze_tests] {} failed: {}", rel_path, e);
        }
    }
    Ok(())
}

/// プロジェクト配下の TestSuite 一覧を返す。
pub async fn list_test_suites(db: &Db, project_id: &str) -> Result<Vec<TestSuiteResponse>, String> {
    // test_file 経由で project に紐づく test_suite を取得
    let records: Vec<TestSuiteRecord> = db
        .query(
            "SELECT test_suite.* FROM test_suite
             WHERE test_file_id IN (
                 SELECT id FROM test_file WHERE project_id = $pid
             )",
        )
        .bind(("pid", project_id.to_string()))
        .await
        .map_err(|e| e.to_string())?
        .take(0)
        .map_err(|e| e.to_string())?;
    Ok(records.into_iter().map(TestSuiteResponse::from).collect())
}

/// TestSuite 配下の TestCase 一覧を返す。
pub async fn list_test_cases(db: &Db, suite_id: &str) -> Result<Vec<TestCaseResponse>, String> {
    let records: Vec<TestCaseRecord> = db
        .query("SELECT * FROM test_case WHERE suite_id = $sid ORDER BY order")
        .bind(("sid", suite_id.to_string()))
        .await
        .map_err(|e| e.to_string())?
        .take(0)
        .map_err(|e| e.to_string())?;
    Ok(records.into_iter().map(TestCaseResponse::from).collect())
}

// ============================================================
// プライベートヘルパー
// ============================================================

/// rootPath 配下のテストファイルを収集する。
fn collect_test_files(root: &Path) -> Vec<String> {
    let mut result = vec![];
    collect_test_files_recursive(root, root, &mut result);
    result
}

fn collect_test_files_recursive(root: &Path, dir: &Path, out: &mut Vec<String>) {
    use crate::services::analysis::FS_EXCLUDES;
    let Ok(entries) = std::fs::read_dir(dir) else {
        return;
    };
    for entry in entries.flatten() {
        let name = entry.file_name().to_string_lossy().to_string();
        if FS_EXCLUDES.contains(&name.as_str()) {
            continue;
        }
        let path = entry.path();
        if path.is_dir() {
            collect_test_files_recursive(root, &path, out);
        } else if is_test_file(&name) {
            if let Ok(rel) = path.strip_prefix(root) {
                let rel_str = rel.to_string_lossy().replace('\\', "/");
                out.push(rel_str);
            }
        }
    }
}

/// import 先ファイルパスから node テーブルの ID を解決する。
async fn resolve_node_ids(db: &Db, file_paths: &[String]) -> Vec<String> {
    if file_paths.is_empty() {
        return vec![];
    }
    let result: Result<Vec<NodeRecord>, _> = db
        .query("SELECT * FROM node WHERE file_path IN $paths")
        .bind(("paths", file_paths.to_vec()))
        .await
        .and_then(|mut r| r.take(0));
    result
        .unwrap_or_default()
        .iter()
        .map(|r| thing_to_string(&r.id))
        .collect()
}

/// test_file を UPSERT し ID を返す。
async fn upsert_test_file(
    db: &Db,
    project_id: &surrealdb::sql::Thing,
    file_path: &str,
) -> Result<String, String> {
    let pid = thing_to_string(project_id);

    // 既存レコードを探す
    let existing: Vec<TestFileRecord> = db
        .query("SELECT * FROM test_file WHERE project_id = $pid AND file_path = $fp")
        .bind(("pid", pid.clone()))
        .bind(("fp", file_path.to_string()))
        .await
        .map_err(|e| e.to_string())?
        .take(0)
        .map_err(|e| e.to_string())?;

    if let Some(rec) = existing.into_iter().next() {
        return Ok(thing_to_string(&rec.id));
    }

    let created: Option<TestFileRecord> = db
        .create("test_file")
        .content(TestFileInput {
            project_id: pid,
            file_path: file_path.to_string(),
        })
        .await
        .map_err(|e| e.to_string())?;

    let rec = created.ok_or_else(|| String::from("Failed to create test_file"))?;
    Ok(thing_to_string(&rec.id))
}

/// DescribeBlock を再帰的に test_suite / test_case として UPSERT する。
fn upsert_suite<'a>(
    db: &'a Db,
    test_file_id: &'a str,
    parent_suite_id: Option<String>,
    block: &'a DescribeBlock,
    node_ids: &'a [String],
    order_offset: i64,
) -> std::pin::Pin<Box<dyn std::future::Future<Output = Result<(), String>> + Send + 'a>> {
    Box::pin(async move {
        let created: Option<TestSuiteRecord> = db
            .create("test_suite")
            .content(TestSuiteInput {
                test_file_id: test_file_id.to_string(),
                parent_suite_id: parent_suite_id.clone(),
                name: block.name.clone(),
                node_ids: node_ids.to_vec(),
            })
            .await
            .map_err(|e| e.to_string())?;

        let suite = created.ok_or_else(|| String::from("Failed to create test_suite"))?;
        let suite_id = thing_to_string(&suite.id);

        for (i, case_name) in block.cases.iter().enumerate() {
            let _: Option<TestCaseRecord> = db
                .create("test_case")
                .content(TestCaseInput {
                    suite_id: suite_id.clone(),
                    name: case_name.clone(),
                    order: order_offset + i as i64,
                })
                .await
                .map_err(|e| e.to_string())?;
        }

        for (i, child) in block.children.iter().enumerate() {
            upsert_suite(
                db,
                test_file_id,
                Some(suite_id.clone()),
                child,
                node_ids,
                i as i64,
            )
            .await?;
        }

        Ok(())
    })
}
