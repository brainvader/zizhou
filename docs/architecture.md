# Zizou アーキテクチャ設計仕様

## 概要

Zizou は Tauri + SurrealDB をコアとするローカルファーストのアプリケーションである。
外部サイドカーや常駐プロセスは不要。
全ての状態・定義・実行ロジックが Tauri プロセス内で完結する。

---

## PHILOSOPHY との対応

| 役割             | 担当                                              |
| ---------------- | ------------------------------------------------- |
| 合意形成・設計   | Zizou グラフ（人間とエージェントの SSOT）         |
| ノード定義・検索 | SurrealDB（Tauri に Rust クレートとして組み込み） |
| ノード実行       | Tauri コマンド（CLI / HTTP を直接実行）           |
| 拡張             | SurrealDB に INSERT するだけ（再ビルド不要）      |

---

## アーキテクチャ

```
Zizou（Tauri プロセス）
  ├── フロント（React / TypeScript）
  │     ↓ invoke()
  ├── Tauri コマンド（Rust）
  │     ├── SurrealDB（Rust クレート・組み込み）
  │     │     ├── node_catalog   — ノード定義 + executor + input_schema
  │     │     ├── graph          — グラフ定義（workflow / structure）
  │     │     ├── node           — グラフノード（file_path / analyzed 含む）
  │     │     ├── edge           — グラフエッジ（kind: imports / renders / flow）
  │     │     ├── project        — プロジェクト一覧
  │     │     ├── test_file      — テストファイル（CTX-22）
  │     │     ├── test_suite     — describe ブロック（CTX-22）
  │     │     └── test_case      — it / test ブロック（CTX-22）
  │     │
  │     ├── 実行エンジン（CTX-14）
  │     │     ├── CLI executor  → std::process::Command
  │     │     └── HTTP executor → reqwest
  │     │
  │     ├── 静的解析エンジン（CTX-20〜22）
  │     │     ├── tree-sitter   → import / export 抽出
  │     │     └── VcsProvider   → git diff --name-only HEAD
  │     │
  │     └── テスト実行エンジン（CTX-23）
  │           └── Vitest CLI    → std::process::Command
  │
  └── （サイドカーなし）
```

---

## Source Graph（CTX-20〜21）

### 概念

プロジェクトのファイル間依存関係を有向グラフとして可視化する。

```
src/main.tsx
  └─[imports]→ src/components/FileTree.tsx
                 └─[imports]→ src/hooks/useStore.ts
```

- ノード = ソースファイル
- エッジ = import / renders 関係
- 解析は tree-sitter で行い SurrealDB に永続化する
- 変更ファイル（git diff）との交差で stale ノードを動的に算出する

### Stale 判定

```
staleFiles    = get_changed_files() の結果（git diff --name-only HEAD）
analyzedFiles = structureGraph.nodes[*].data.filePath の集合
staleNodes    = staleFiles ∩ analyzedFiles
```

stale は DB に保存せずフロントで動的に算出する（SSOT は git）。

### SurrealDB テーブル

```
graph  — kind: 'workflow' | 'structure'
node   — file_path, analyzed: 'fresh' | 'pending', position_x, position_y
edge   — kind: 'imports' | 'renders' | 'flow'
```

---

## Test Context（CTX-22）

### コンセプト

**Vitest テストファイルがそのままコンテキスト定義になる。**

手動でノードをグループ化するのではなく、テストファイルの import 群を
tree-sitter で解析し、関与するノード群を自動的に Subflow として表示する。

```
tests/fix-filetree-bug.test.ts
  import { FileTree } from '@/components/FileTree'   ← スコープ
  import { useStore } from '@/hooks/useStore'         ← スコープ

  describe('Fix FileTree bug', () => {               ← コンテキスト名 = Subflow ラベル
      it('ファイルをクリックすると選択される', () => { ... })
  })
```

テストノードをクリック → 依存ノード群が Subflow で自動的に囲まれる。

### describe と it の役割

| 要素       | 意味                                     | グラフ上の表現             |
| ---------- | ---------------------------------------- | -------------------------- |
| `describe` | コンテキスト（どのノード群が関与するか） | Subflow（parentId 方式）   |
| `it`       | シナリオステップ（データがどう流れるか） | エッジアニメーションの単位 |

### 1ファイル複数 describe の扱い

`import` はファイルトップレベルに置かれるため、どの `describe` が
どの `import` を使うかは静的解析では判別不可能（実行時にのみ確定）。

そのため **ファイル単位の import 群をコンテキストのスコープ** とする。
1ファイル1describe を推奨規約とするが強制はしない。

### ネスト describe

```ts
describe('ProjectDetail', () => {        // 外側 Subflow
    describe('FileTree', () => { ... })  // 内側 Subflow（ネスト）
    describe('SourceGraph', () => { ... })
})
```

describe のツリー構造 = Subflow のネスト構造。
ReactFlow の parentId 方式はネストに対応している。

### SurrealDB テーブル

```
test_file   — project_id, file_path
test_suite  — test_file_id, parent_suite_id（ネスト対応）, name, node_ids[]
test_case   — suite_id, name, order
```

### Rust コマンド

```
analyze_tests(project_id)         → test_file / test_suite / test_case を UPSERT
list_test_suites(project_id)      → TestSuite[]
list_test_cases(suite_id)         → TestCase[]
```

---

## Test Simulation（CTX-23）

### コンセプト

Vitest の `it`（テストケース）を実行単位としてグラフ上でシミュレーションする。

```
describe('FileTree → SourceGraph 連携') {
    it('ファイルをクリックする')
        FileTree →[selectedFilePath]→ useStore   ← エッジアニメーション
    it('ノードがハイライトされる')
        useStore →[staleFiles]→ SourceGraphView  ← エッジアニメーション
}
```

### 実行粒度と ▶ ボタン

| 粒度          | 実行方法                      | ▶ ボタンの場所     |
| ------------- | ----------------------------- | ------------------ |
| ファイル全体  | `vitest run FileTree.test.ts` | テストノード       |
| describe 単位 | `--testNamePattern` 前方一致  | Subflow ラベル横   |
| it 単位       | `--testNamePattern` 完全一致  | 右ペイン it 一覧横 |

### 右ペイン（NodeProperty 拡張）

テストノード選択時に右ペインに以下を表示する：

```
┌─────────────────────────────────────┐
│ 📄 FileTree.test.ts              ▶  │
├─────────────────────────────────────┤
│ describe: Fix FileTree bug       ▶  │
│   ✗ ファイルをクリックすると選択 ▶  │
│   ✓ ノードがハイライトされる     ▶  │
│                                  📋 │ ← コピーボタン
│ FAIL src/components/FileTree...     │
│ AssertionError: expected 'selected' │
│   received undefined                │
│   at FileTree.test.ts:12:5          │
└─────────────────────────────────────┘
```

### コピーボタンの出力

Vitest `--reporter=verbose` の**生ログをそのままクリップボードにコピー**する。
AI による加工・要約は行わない。理由：

- トークン消費防止（Zizou の核心的動機）
- LLM は生ログを直接解釈できる
- 加工による情報欠損を防ぐ

コピーした生ログをそのまま LLM にペーストして修正依頼できる。

これが Zizou の核心的なワークフローである：

```
テスト失敗 → 📋 コピー → LLM にペースト → 最小スコープで修正依頼
```

### エッジアニメーション

- `it` の定義順にエッジを順次ハイライト
- passed → 緑、failed → 赤 でエッジ・ノードを着色

### Rust コマンド

```
run_test_case(project_id, test_case_id) → TestResult
run_test_suite(project_id, suite_id)    → TestResult[]
run_test_file(project_id, file_path)    → TestResult[]

TestResult {
    test_case_id: string
    passed:       bool
    log:          string   // Vitest 生ログ
    duration_ms:  number
}
```

---

## SurrealDB

### Tauri への組み込み

```toml
# src-tauri/Cargo.toml
[dependencies]
surrealdb = { version = "=2.6.5", features = ["kv-surrealkv"] }  # 本番（exact pin 必須）

[dev-dependencies]
surrealdb = { version = "=2.6.5", features = ["kv-mem"] }        # テスト
```

> **注意:** `=2.6.5` の exact pin が必須。`2.6.5` と書くと 3.x に解決され
> Rust nightly が要求される。

```rust
// src-tauri/src/services/db/mod.rs
pub async fn init_db(app_data_dir: PathBuf) -> Result<Db, surrealdb::Error> {
    let db = Surreal::new::<SurrealKv>(app_data_dir.join("zizhou.db")).await?;
    db.use_ns("zizhou").use_db("zizhou").await?;
    // マイグレーション補完クエリをここに記述
    Ok(db)
}
```

### typed struct 必須ルール

`db.select()` / `db.query().take()` は必ず typed struct で受け取る。
`serde_json::Value` への直接デシリアライズは不可（serde-content の制約）。

```rust
// NG
let records: Vec<serde_json::Value> = db.select("node").await?;

// OK
let records: Vec<NodeRecord> = db.select("node").await?;
let json = records.into_iter().map(|r| serde_json::json!({
    "id": thing_to_string(&r.id),
    ...
})).collect();
```

### SCHEMALESS 必須ルール

`object` 型フィールドを持つテーブルは `SCHEMALESS` で定義する。
`SCHEMAFULL` + `DEFINE FIELD profile TYPE object` はデシリアライズエラーになる。

```sql
-- OK
DEFINE TABLE IF NOT EXISTS source_context SCHEMALESS;

-- NG（object フィールドがある場合）
DEFINE TABLE node_catalog SCHEMAFULL;
DEFINE FIELD profile ON node_catalog TYPE object;
```

---

## Node Catalog

### ノード定義の構造

```rust
#[derive(Serialize, Deserialize, Debug)]
pub struct NodeCatalog {
    pub service:   String,
    pub provider:  String,
    pub label:     String,
    pub node_type: String,
    pub executor:  Executor,
    pub profile:   Profile,
    pub embedding: Option<Vec<f32>>,
}
```

### ノード定義の追加（再ビルド不要）

```rust
db.create::<Option<NodeCatalog>>("node_catalog")
    .content(NodeCatalog { ... })
    .await?;
```

---

## Tauri コマンド

### カタログ

```rust
#[tauri::command]
async fn catalog_get_all(db: State<'_, Db>) -> Result<Vec<NodeCatalog>, String> {
    db.select("node_catalog").await.map_err(|e| e.to_string())
}
```

### ノード実行（CTX-14）

```rust
#[tauri::command]
async fn execute_node(
    db: State<'_, Db>,
    service: String, provider: String, cwd: String, input: serde_json::Value,
) -> Result<ExecuteResponse, String> {
    services::executor::execute_node(&db, &service, &provider, &cwd, &input).await
}
```

### 静的解析（CTX-20〜21）

```rust
#[tauri::command]
async fn analyze_file(project_id: String, file_path: String, db: State<'_, Db>)
    -> Result<(), String>

#[tauri::command]
async fn analyze_project(project_id: String, db: State<'_, Db>)
    -> Result<(), String>

#[tauri::command]
fn get_changed_files(root_path: String) -> Result<Vec<String>, String>
```

### テスト解析・実行（CTX-22〜23）

```rust
#[tauri::command]
async fn analyze_tests(project_id: String, db: State<'_, Db>)
    -> Result<(), String>

#[tauri::command]
async fn list_test_suites(project_id: String, db: State<'_, Db>)
    -> Result<Vec<TestSuite>, String>

#[tauri::command]
async fn run_test_case(project_id: String, test_case_id: String, db: State<'_, Db>)
    -> Result<TestResult, String>
```

---

## フロントエンドサービス層

Props DI パターンで全サービスを差し替え可能にする。

```
src/services/
  GraphStorage.ts    — graph / node / edge CRUD
  ContextStorage.ts  — source_context CRUD（CTX-22 暫定、将来 TestStorage に移行）
  TestStorage.ts     — test_file / test_suite / test_case CRUD（CTX-22）
  TestRunner.ts      — run_test_case / run_test_suite / run_test_file（CTX-23）
```

### Props DI パターン

```ts
// デフォルト実装を export
export const defaultGraphStorage: GraphStorage = { ... }

// テスト・Storybook では部分上書き
const mockStorage = { ...defaultGraphStorage, listGraphs: vi.fn() }
```

---

## テンプレート変数の展開ルール

`args` 内の `{input.xxx}` 形式のトークンは完全一致で置換する。
シェル文字列渡し（`sh -c "git {input}"` 等）は禁止する。

---

## エラーレスポンス

| code                         | 意味                                            |
| ---------------------------- | ----------------------------------------------- |
| `SERVICE_NOT_FOUND`          | `service` + `provider` に一致するノードが未登録 |
| `PROFILE_NOT_FOUND`          | 指定した `subcommand` が profiles に存在しない  |
| `TEMPLATE_RESOLUTION_FAILED` | `{input.xxx}` のキーが input に存在しない       |
| `CLI_EXECUTION_FAILED`       | subprocess の終了コードが非ゼロ                 |
| `HTTP_REQUEST_FAILED`        | HTTP executor のリクエストが失敗                |
| `ENV_VAR_NOT_SET`            | `${env.XXX}` の環境変数が未設定                 |

---

## 将来の拡張

| 項目              | 内容                                                            |
| ----------------- | --------------------------------------------------------------- |
| Wasm executor     | Tauri 内で Wasmtime を組み込み                                  |
| ストリーミング    | Tauri の `emit` イベントで LLM レスポンスをフロントにストリーム |
| CTX-24 以降       | エッジアニメーション詳細・型情報解決（TSコンパイラAPI）         |
| Palantir AIP 相当 | グラフをエクスポートして LLM に渡し自律実行                     |
| リアルタイム解析  | ファイル保存時に notify クレートで自動 analyze_file             |
