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
  │     │     ├── node_catalog  — ノード定義 + executor + input_schema
  │     │     ├── graphs        — グラフ定義（CTX-10）
  │     │     └── projects      — プロジェクト一覧
  │     │
  │     └── 実行エンジン（CTX-14）
  │           ├── CLI executor  → std::process::Command
  │           └── HTTP executor → reqwest
  │
  └── （サイドカーなし）
```

---

## SurrealDB

### Tauri への組み込み

```toml
# src-tauri/Cargo.toml
[dependencies]
surrealdb = { version = "3.0.5", features = ["kv-surrealkv"] }  # 本番

[dev-dependencies]
surrealdb = { version = "3.0.5", features = ["kv-mem"] }        # テスト
```

```rust
// src-tauri/src/lib.rs
use surrealdb::engine::local::SurrealKV;
use surrealdb::Surreal;

pub async fn setup() -> Surreal<SurrealKV> {
    let db = Surreal::new::<SurrealKV>("app.db").await.unwrap();
    db.use_ns("zizou").use_db("zizou").await.unwrap();
    db
}
```

### スキーマ

```sql
-- Node Catalog
DEFINE TABLE node_catalog SCHEMAFULL;
DEFINE FIELD service   ON node_catalog TYPE string;
DEFINE FIELD provider  ON node_catalog TYPE string;
DEFINE FIELD label     ON node_catalog TYPE string;
DEFINE FIELD node_type ON node_catalog TYPE string;  -- CTX-9
DEFINE FIELD executor  ON node_catalog TYPE object;
DEFINE FIELD profile   ON node_catalog TYPE object;  -- 単数（CTX-9設計決定）
DEFINE FIELD embedding ON node_catalog TYPE array<float>;  -- CTX-13

-- ベクトル類似検索（CTX-13）
DEFINE INDEX node_hnsw ON node_catalog
  FIELDS embedding HNSW DIMENSION 1536;

-- フルテキスト検索（CTX-13）
DEFINE INDEX node_search ON node_catalog
  FIELDS label, service SEARCH ANALYZER ascii BM25;
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
    pub node_type: String,   // フロントの CatalogEntry.nodeType に対応（CTX-9）
    pub executor:  Executor,
    pub profile:   Profile,  // 1エントリ = 1プロファイル（CTX-9設計決定）
    pub embedding: Option<Vec<f32>>,  // CTX-13
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(tag = "type", rename_all = "lowercase")]
pub enum Executor {
    Cli {
        command: String,
    },
    Http {
        endpoint: String,
        headers: Option<HashMap<String, String>>,
    },
}

#[derive(Serialize, Deserialize, Debug)]
pub struct Profile {
    pub subcommand: String,
    pub args:       Vec<String>,
    pub fields:     HashMap<String, FieldSchema>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct FieldSchema {
    pub r#type:   String,   // "string" | "number" | "boolean" | "enum"
    pub label:    String,
    pub required: Option<bool>,
    pub default:  Option<serde_json::Value>,
    pub values:   Option<Vec<String>>,             // enum の場合
    pub source:   Option<String>,                  // 動的取得 URL（Ollama 等）
    pub path:     Option<String>,                  // レスポンスから値を抽出するパス
}
```

### ノード定義の追加（再ビルド不要）

```rust
// SurrealDB に INSERT するだけで Node Catalog に追加される
// Git Status
db.create::<Option<NodeCatalog>>("node_catalog")
    .content(NodeCatalog {
        service:   "git".into(),
        provider:  "local".into(),
        label:     "Git Status".into(),
        node_type: "git".into(),
        executor:  Executor::Cli { command: "git".into() },
        profile:   Profile {
            subcommand: "status".into(),
            args:       vec!["status".into()],
            fields:     HashMap::new(),
        },
        embedding: None,
    })
    .await?;

// Git Commit（別レコードとして INSERT）
db.create::<Option<NodeCatalog>>("node_catalog")
    .content(NodeCatalog {
        service:   "git".into(),
        provider:  "local".into(),
        label:     "Git Commit".into(),
        node_type: "git".into(),
        executor:  Executor::Cli { command: "git".into() },
        profile:   Profile {
            subcommand: "commit".into(),
            args:       vec!["commit".into(), "-m".into(), "{input.message}".into()],
            fields:     HashMap::from([
                ("message".into(), FieldSchema {
                    r#type:   "string".into(),
                    label:    "Commit Message".into(),
                    required: Some(true),
                    ..Default::default()
                }),
            ]),
        },
        embedding: None,
    })
    .await?;
```

---

## Tauri コマンド

### カタログ

```rust
#[tauri::command]
async fn catalog_get_all(
    db: State<'_, Surreal<SurrealKV>>,
) -> Result<Vec<NodeCatalog>, String> {
    db.select("node_catalog").await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn catalog_search(
    db: State<'_, Surreal<SurrealKV>>,
    query: String,
) -> Result<Vec<NodeCatalog>, String> {
    db.query("SELECT * FROM node_catalog WHERE label ~ $q OR service ~ $q")
        .bind(("q", query))
        .await.map_err(|e| e.to_string())?
        .take(0).map_err(|e| e.to_string())
}
```

### ノード実行（CTX-14）

```rust
#[tauri::command]
async fn execute_node(
    db:      State<'_, Surreal<SurrealKV>>,
    service:  String,
    provider: String,
    cwd:      String,
    input:    serde_json::Value,
) -> Result<ExecuteResponse, String> {
    // 1. SurrealDB からノード定義を取得
    let nodes: Vec<NodeCatalog> = db
        .query("SELECT * FROM node_catalog WHERE service = $s AND provider = $p LIMIT 1")
        .bind(("s", &service))
        .bind(("p", &provider))
        .await.map_err(|e| e.to_string())?
        .take(0).map_err(|e| e.to_string())?;

    let node = nodes.into_iter().next()
        .ok_or("SERVICE_NOT_FOUND".to_string())?;

    // 2. executor に応じて直接実行
    match &node.executor {
        Executor::Cli { command } => {
            // subcommand の特定
            let subcommand = input.get("subcommand")
                .and_then(|v| v.as_str())
                .ok_or("Missing subcommand")?;

            // 1エントリ = 1プロファイルなので検索不要
            // subcommand はノード追加時に input.subcommand として確定済み
            let profile = &node.profile;

            // subcommand の一致確認（防御的チェック）
            if profile.subcommand != subcommand {
                return Err("PROFILE_NOT_FOUND".to_string());
            }

            // テンプレート展開
            let resolved = resolve_args(&profile.args, &input)?;

            // CLI 実行
            let output = std::process::Command::new(command)
                .args(&resolved)
                .current_dir(&cwd)
                .output()
                .map_err(|e| e.to_string())?;

            Ok(ExecuteResponse {
                success: output.status.success(),
                output: serde_json::json!({
                    "stdout": String::from_utf8_lossy(&output.stdout),
                    "stderr": String::from_utf8_lossy(&output.stderr),
                }),
                error: None,
            })
        }
        Executor::Http { endpoint, headers } => {
            // HTTP 実行
            let client = reqwest::Client::new();
            let mut req = client.post(endpoint).json(&input);
            if let Some(hdrs) = headers {
                for (k, v) in hdrs {
                    req = req.header(k, resolve_env(v)?);
                }
            }
            let res = req.send().await.map_err(|e| e.to_string())?;
            let body: serde_json::Value = res.json().await.map_err(|e| e.to_string())?;
            Ok(ExecuteResponse {
                success: true,
                output: body,
                error: None,
            })
        }
    }
}
```

---

## テンプレート変数の展開ルール

`args` 内の `{input.xxx}` 形式のトークンは完全一致で置換する：

```rust
fn resolve_args(
    args: &[String],
    input: &serde_json::Value,
) -> Result<Vec<String>, String> {
    let map = input.as_object()
        .ok_or("input must be an object")?;

    args.iter().map(|arg| resolve_template(arg, map)).collect()
}

fn resolve_template(
    target: &str,
    input: &serde_json::Map<String, serde_json::Value>,
) -> Result<String, String> {
    if target.starts_with('{') && target.ends_with('}') {
        let key = &target[1..target.len() - 1];
        if let Some(field) = key.strip_prefix("input.") {
            return input.get(field)
                .map(|v| match v {
                    serde_json::Value::String(s) => Ok(s.clone()),
                    serde_json::Value::Bool(b)   => Ok(b.to_string()),
                    serde_json::Value::Number(n) => Ok(n.to_string()),
                    _ => Err(format!("Unsupported type for key: {}", field)),
                })
                .unwrap_or_else(|| Err(format!("Missing input key: {}", field)))?;
        }
    }
    Ok(target.to_string())
}
```

> **セキュリティ注記:**
> `std::process::Command::new().args(vec![...])` で引数を配列として渡す。
> シェル文字列渡し（`sh -c "git {input}"` 等）は禁止する。

---

## 環境変数・秘匿情報の管理

HTTP executor の `headers` に `${env.XXX}` 形式で環境変数を参照できる：

```rust
fn resolve_env(value: &str) -> Result<String, String> {
    if value.starts_with("${env.") && value.ends_with('}') {
        let key = &value[6..value.len() - 1];
        std::env::var(key).map_err(|_| format!("ENV_VAR_NOT_SET: {}", key))
    } else {
        Ok(value.to_string())
    }
}
```

- SurrealDB の node_catalog に API キーを直接書くことは禁止する
- `.env` または Tauri 起動時の環境変数から取得する

---

## テスタビリティ

### フロント（Vitest）

```typescript
vi.mock('@tauri-apps/api/core', () => ({
    invoke: vi.fn()
        .mockResolvedValueOnce([{ service: 'git', provider: 'local', ... }])
}))
```

### Tauri コマンド単体（Rust）

```rust
#[cfg(test)]
mod tests {
    use surrealdb::engine::local::Mem;

    #[tokio::test]
    async fn test_catalog_search() {
        let db = Surreal::new::<Mem>(()).await.unwrap();
        db.use_ns("test").use_db("test").await.unwrap();

        // テストデータ INSERT
        db.create::<Option<NodeCatalog>>("node_catalog")
            .content(NodeCatalog { service: "git".into(), ... })
            .await.unwrap();

        // 検索テスト
        let results: Vec<NodeCatalog> = db
            .query("SELECT * FROM node_catalog WHERE label ~ $q")
            .bind(("q", "git"))
            .await.unwrap().take(0).unwrap();

        assert_eq!(results.len(), 1);
    }
}
```

### E2E（Playwright）

Tauri のみ起動すれば良い。外部プロセス不要。

---

## エラーレスポンス

```json
{
  "success": false,
  "output": null,
  "error": {
    "code": "SERVICE_NOT_FOUND",
    "message": "No service found for git:local"
  }
}
```

| code                         | 意味                                            |
| ---------------------------- | ----------------------------------------------- |
| `SERVICE_NOT_FOUND`          | `service` + `provider` に一致するノードが未登録 |
| `PROFILE_NOT_FOUND`          | 指定した `subcommand` が profiles に存在しない  |
| `TEMPLATE_RESOLUTION_FAILED` | `{input.xxx}` のキーが input に存在しない       |
| `CLI_EXECUTION_FAILED`       | subprocess の終了コードが非ゼロ                 |
| `HTTP_REQUEST_FAILED`        | HTTP executor のリクエストが失敗                |
| `ENV_VAR_NOT_SET`            | `${env.XXX}` の環境変数が未設定                 |

---

## Node Catalog 検索戦略ロードマップ

| フェーズ | 検索実装                                                                     |
| -------- | ---------------------------------------------------------------------------- |
| CTX-9    | `useCatalogSearch(query)` で `filter()` インクリメンタルサーチ（固定データ） |
| CTX-13   | SurrealDB の HNSW ベクトル検索 + SEARCH フルテキスト検索に差し替え           |

CTX-9 では `useCatalogSearch` フックとして分離する。
CTX-13 での差し替えはフックの内部実装のみの変更で完結する（UI 変更不要）。

動的スキーマ取得（Ollama 等）は CTX-9 の設計フェーズで確定する：

- 候補A: `invoke('catalog_get_schema', { service, provider })` — テスタビリティ高
- 候補B: フロントから直接 HTTP — シンプル

---

## フロントエンド統合メモ

### GraphNodeData への追加（CTX-9 確定済み）

> `docs/bom/graph.ts` を参照。`catalog` ネストは不採用。
> エクスポートJSONとの一貫性を優先し `service / provider / input` をフラットに持つ。

```typescript
{
  service: string | null;
  provider: string | null;
  input: Record;
}
```

### エクスポート JSON スキーマ候補（CTX-10 で検討）

```json
{
  "project_id": "1",
  "graph_id": "graphs/main.json",
  "exported_at": "2026-05-27T00:00:00Z",
  "graph": {
    "nodes": [
      {
        "id": "node_1",
        "label": "Git Status",
        "status": "done",
        "service": "git",
        "provider": "local",
        "input": { "subcommand": "status" }
      },
      {
        "id": "node_2",
        "label": "Analyze Changes",
        "status": "doing",
        "service": "llm",
        "provider": "claude",
        "input": { "prompt": "変更点を要約してください" }
      }
    ],
    "edges": [
      {
        "source": "node_1",
        "target": "node_2",
        "mapping": {
          "input.prompt": "output.stdout"
        }
      }
    ]
  }
}
```

### ノード実行ディスパッチ（CTX-14）

```
ノード右クリック → Run Node
  → invoke('execute_node', { service, provider, cwd, input })
  → Tauri コマンド → SurrealDB からノード定義取得 → CLI / HTTP 実行
  → 結果を node.status に反映（doing → done）
  → edges の mapping に従い次のノードの input に注入
```

---

## 将来の拡張

| 項目              | 内容                                                            |
| ----------------- | --------------------------------------------------------------- |
| Wasm executor     | Tauri 内で Wasmtime を組み込み                                  |
| ストリーミング    | Tauri の `emit` イベントで LLM レスポンスをフロントにストリーム |
| CTX-13            | SurrealDB ベクトル検索・フルテキスト検索                        |
| CTX-14            | 実行エンジン（エッジ mapping でノード間データフロー）           |
| Palantir AIP 相当 | グラフをエクスポートして LLM に渡し自律実行                     |
