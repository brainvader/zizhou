# service-manager 設計仕様

## 概要

service-manager は Zizou の唯一の常駐サイドカーである。
ノードの実行リクエストを受け取り、`services/*.toml`（CTX-9）または
SurrealDB（CTX-13 以降）の定義に従って CLI / HTTP / Wasm に委譲する汎用ルーターとして機能する。

一度実装すれば再ビルド・再配布は不要。
新しいサービスは設定を追加するだけで登録される。

---

## PHILOSOPHY との対応

| 役割             | 担当                                      |
| ---------------- | ----------------------------------------- |
| 合意形成・設計   | Zizou グラフ（人間とエージェントの SSOT） |
| 確定的処理       | CLI executor                              |
| 外部サービス連携 | HTTP executor                             |
| 不確定処理       | LLM executor（provider で切り替え）       |
| 拡張             | 設定追加のみ（再ビルド不要）              |

---

## アーキテクチャ

```
Zizou（Tauri）
  ↓ POST /execute { service, provider, input }
service-manager（単一サイドカー・Rust/Axum）
  ↓ Node Catalog を参照してルーティング
  ├── CLI executor    → Command::new().args([...]) → 実行 → 終了
  ├── HTTP executor   → reqwest → レスポンス → 終了
  └── Wasm executor   → Wasmtime → 実行 → 終了（将来）
```

---

## 共通インターフェース

### リクエスト

```json
{
  "service": "llm",
  "provider": "claude",
  "input": {
    "prompt": "コードをレビューしてください",
    "stream": false,
    "maxTokens": 1000
  }
}
```

### レスポンス

```json
{
  "success": true,
  "output": { ... },
  "error": null
}
```

### ストリーミング（将来拡張）

`input.stream: true` の場合、`POST /execute` は `text/event-stream`（SSE）を返す。
詳細仕様は実装フェーズで確定する。

---

## Node Catalog

### CTX-9: TOML ファイルベース（初期実装）

```
services/
  git.toml
  llm-claude.toml
  llm-ollama.toml
  ffmpeg.toml
  fs-read.toml
  fs-write.toml
  shell-run.toml
  http-request.toml
```

service-manager 起動時に `services/` をスキャンしてレジストリに登録。
`services/` の変更を watch してホットリロードする。

### CTX-13: SurrealDB ベース（移行後）

```sql
DEFINE TABLE node_catalog SCHEMAFULL;
DEFINE FIELD service      ON node_catalog TYPE string;
DEFINE FIELD provider     ON node_catalog TYPE string;
DEFINE FIELD label        ON node_catalog TYPE string;
DEFINE FIELD executor     ON node_catalog TYPE object;
DEFINE FIELD input_schema ON node_catalog TYPE object;
DEFINE FIELD embedding    ON node_catalog TYPE array<float>;

DEFINE INDEX node_hnsw ON node_catalog
  FIELDS embedding HNSW DIMENSION 1536;
```

TOML ファイルは不要になり、ノード定義を直接 SurrealDB に INSERT する。
ベクトル類似検索（HNSW）とフルテキスト検索（SEARCH）を提供する。

### GET /catalog

```
GET /catalog
→ [{ service, provider, label, inputSchema }, ...]
```

CTX-9 は TOML から、CTX-13 以降は SurrealDB から返す。
Zizou の Node Catalog UI はこのエンドポイントのみを参照する（実装の差異を隠蔽）。

---

## サービス定義（services/\*.toml）

### プロファイル構造

サブコマンドを持つツール（git 等）は `profiles` でグループ化する。
`subcommand` が UI 上の最初の選択肢になる。

```toml
# services/git.toml
service  = "git"
provider = "local"
label    = "Git"

[executor]
type    = "cli"
command = "git"

[[profiles]]
subcommand = "status"
label      = "Status"
args       = ["status"]
# fields なし（パラメーター不要）

[[profiles]]
subcommand = "commit"
label      = "Commit"
args       = ["commit", "-m", "{input.message}"]

[profiles.fields.message]
type     = "string"
label    = "Commit Message"
required = true

[profiles.fields.amend]
type    = "boolean"
label   = "Amend"
default = false

[[profiles]]
subcommand = "push"
label      = "Push"
args       = ["push", "{input.remote}", "{input.branch}"]

[profiles.fields.remote]
type    = "string"
label   = "Remote"
default = "origin"

[profiles.fields.branch]
type    = "string"
label   = "Branch"
default = "main"

[profiles.fields.force]
type    = "boolean"
label   = "Force"
default = false
```

### HTTP executor（LLM）

```toml
# services/llm-claude.toml
service  = "llm"
provider = "claude"
label    = "Claude"

[executor]
type     = "http"
endpoint = "https://api.anthropic.com/v1/messages"
headers  = { "x-api-key" = "${env.ANTHROPIC_API_KEY}", "anthropic-version" = "2023-06-01" }

[input_schema.model]
type    = "enum"
label   = "Model"
values  = ["claude-opus-4-6", "claude-sonnet-4-6", "claude-haiku-4-5"]
default = "claude-sonnet-4-6"

[input_schema.prompt]
type     = "string"
label    = "Prompt"
required = true

[input_schema.maxTokens]
type    = "number"
label   = "Max Tokens"
default = 1000
```

```toml
# services/llm-ollama.toml
service  = "llm"
provider = "ollama"
label    = "Ollama"

[executor]
type     = "http"
endpoint = "http://localhost:11434/api/generate"

[input_schema.model]
type   = "enum"
label  = "Model"
source = "http://localhost:11434/api/tags"  # 動的取得
path   = "models[].name"

[input_schema.prompt]
type     = "string"
label    = "Prompt"
required = true
```

### スターターパック

| ファイル            | 用途                                       |
| ------------------- | ------------------------------------------ |
| `git.toml`          | status / commit / push / pull / diff / log |
| `llm-claude.toml`   | Claude API                                 |
| `llm-ollama.toml`   | ローカル LLM（動的モデル一覧）             |
| `fs-read.toml`      | ファイル読み込み                           |
| `fs-write.toml`     | ファイル書き込み                           |
| `shell-run.toml`    | 任意コマンド実行                           |
| `http-request.toml` | HTTP リクエスト                            |

LLM に「○○のスキルを追加したい」と相談して TOML を生成・追加する運用で拡張する。

---

## テンプレート変数の展開ルール

`args` / `headers` 内の `{input.xxx}` 形式のトークンは以下のルールで展開する：

- リクエストの `input` オブジェクトから該当キーの値を文字列化して**完全一致で置換**する
- 例: `input.command = "status"` の場合、`"{input.command}"` がまるごと `"status"` に置き換わる
- `"prefix-{input.id}"` のような部分一致置換は**禁止**（セキュリティリスク）
- 該当キーが存在しない場合はエラーとして実行を中断する

> **セキュリティ注記:**
> CLI executor は `Command::new().args(vec![...])` で引数を配列として渡す。
> `sh -c "git {input}"` のようなシェル文字列渡しはインジェクション攻撃のリスクがあるため禁止する。

---

## 環境変数・秘匿情報の管理

`headers` の値に `${env.XXX}` 形式を使うと、起動時に環境変数から値を展開する。

- service-manager 起動時に `.env` または Tauri から環境変数をロードする
- `services/*.toml` に API キーを直接書くことは禁止する
- 環境変数が未設定の場合はサービス登録時にエラーとして警告する

---

## 実行モデル

| フェーズ     | 動作                                                                    |
| ------------ | ----------------------------------------------------------------------- |
| 起動時       | Node Catalog をスキャンしてレジストリに登録・環境変数を展開             |
| 変更検知時   | `services/` の変更を watch して動的にレジストリを更新（ホットリロード） |
| ノード実行時 | `service` + `provider` でレジストリを検索 → executor に委譲             |
| 実行後       | CLI プロセスは終了。HTTP 接続はクローズ。service-manager のみ常駐       |

---

## キャッシュ戦略

| サービス種別          | キャッシュ                       |
| --------------------- | -------------------------------- |
| CLI（git 等）         | 基本不要・毎回実行               |
| LLM / 重い処理        | 入力ハッシュをキーに保存         |
| ストリーミング（LLM） | レスポンス完了後にキャッシュ保存 |

---

## エラーレスポンス

```json
{
  "success": false,
  "output": null,
  "error": {
    "code": "TEMPLATE_RESOLUTION_FAILED",
    "message": "Required input key 'command' was not found in the request."
  }
}
```

| code                         | 意味                                              |
| ---------------------------- | ------------------------------------------------- |
| `TEMPLATE_RESOLUTION_FAILED` | `{input.xxx}` のキーが input に存在しない         |
| `SERVICE_NOT_FOUND`          | `service` + `provider` に一致するサービスが未登録 |
| `CLI_EXECUTION_FAILED`       | subprocess の終了コードが非ゼロ                   |
| `HTTP_REQUEST_FAILED`        | HTTP executor のリクエストが失敗                  |
| `ENV_VAR_NOT_SET`            | `${env.XXX}` の環境変数が未設定                   |

---

## Rust 実装概要（Axum）

```rust
use std::collections::HashMap;
use serde::Deserialize;

#[derive(Deserialize, Debug)]
#[serde(tag = "type", rename_all = "lowercase")]
pub enum Executor {
    Cli {
        command: String,
        args: Vec<String>,                          // 配列として渡す（インジェクション防止）
    },
    Http {
        endpoint: String,
        headers: Option<HashMap<String, String>>,  // ${env.XXX} を展開して使用
    },
    Wasm {
        module: String,                             // 将来拡張
    },
}

#[derive(Deserialize, Debug)]
pub struct ServiceDefinition {
    pub service:      String,
    pub provider:     String,
    pub executor:     Executor,
    pub input_schema: Option<serde_json::Value>,   // GET /catalog でフロントに返す
}

/// {input.xxx} 形式のトークンを完全一致で置換する共通ユーティリティ。
/// CLI args / HTTP headers の両方で使い回す。
fn resolve_template(
    target: &str,
    input: &serde_json::Map<String, serde_json::Value>,
) -> Result<String, String> {
    if target.starts_with('{') && target.ends_with('}') {
        let key = &target[1..target.len() - 1];
        if let Some(field) = key.strip_prefix("input.") {
            return input
                .get(field)
                .and_then(|v| v.as_str().map(|s| s.to_string()))
                .ok_or_else(|| format!("Missing or invalid input key: {}", field));
        }
    }
    Ok(target.to_string())  // 置換対象でない文字列はそのまま通す
}

/// レジストリはスレッドセーフに管理する。
type Registry = Arc<RwLock<HashMap<String, ServiceDefinition>>>;

// GET /catalog や POST /execute: 並行読み込み
async fn handle_execute(State(registry): State<Registry>, ...) {
    let reg = registry.read().await;
    // ...
}

// ホットリロード時: 一瞬だけロックして差し替え
async fn reload_registry(registry: Registry, new_defs: HashMap<String, ServiceDefinition>) {
    let mut reg = registry.write().await;
    *reg = new_defs;
}
```

---

## Tauri 統合

```json
{
  "bundle": {
    "externalBin": ["binaries/service-manager"]
  }
}
```

サイドカーは `service-manager` 1つのみ。

---

## Node Catalog 検索戦略ロードマップ

| フェーズ | 検索実装                                                           |
| -------- | ------------------------------------------------------------------ |
| CTX-9    | `useCatalogSearch(query)` で `filter()` インクリメンタルサーチ     |
| CTX-13   | SurrealDB の HNSW ベクトル検索 + SEARCH フルテキスト検索に差し替え |

```sql
-- CTX-13 以降のクエリイメージ
SELECT * FROM node_catalog
WHERE vector::similarity::cosine(embedding, $query_vec) > 0.8
   OR label ~ $query
   OR service ~ $query;
```

CTX-9 では `useCatalogSearch` フックとして分離する。
CTX-13 での差し替えはフックの内部実装のみの変更で完結する（UI 変更不要）。

---

## フロントエンド統合メモ（CTX-9/10 設計時に正式化する）

> **注意:** 以下は設計議論の記録。BOM への正式反映は CTX-9 の設計フェーズで行う。

### GraphNodeData への追加候補（CTX-9 で検討）

```typescript
{
  catalog: {
    service:  string   // Node Catalog の service に対応
    provider: string   // Node Catalog の provider に対応
  } | null             // custom ノードは null
  input: Record<string, unknown>  // ノード固有の実行パラメータ
}
```

`input_schema`（GET /catalog から取得）を参照して
NodeProperty パネルに動的フォームを自動生成する。

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

エッジの `mapping` でノード間のデータフロー（source.output → target.input）を定義する。

### ノード実行ディスパッチ（CTX-14 相当・将来実装）

```
ノード右クリック → Run Node
  → node.catalog.service + provider + input を POST /execute に送信
  → service-manager がルーティング・実行
  → 結果を node.status に反映（doing → done）
  → edges の mapping に従い次のノードの input に注入
```

---

## 将来の拡張

| 項目              | 内容                                                  |
| ----------------- | ----------------------------------------------------- |
| Wasm executor     | Wasmtime でプラグインをサンドボックス実行             |
| ストリーミング    | SSE で LLM レスポンスをストリーム                     |
| CTX-13            | SurrealDB に移行・ベクトル検索対応                    |
| CTX-14            | 実行エンジン（エッジ mapping でノード間データフロー） |
| Palantir AIP 相当 | グラフをエクスポートして LLM に渡し自律実行           |
