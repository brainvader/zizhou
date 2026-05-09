---
name: context-mapping
description:
  アプリのUI構成を示すHTMLファイルを用いて、AIにアプリの概要と画面構成を説明するためのガイドライン。
  - **目的:** 画面構成のイメージを示す「ContextMap.html」を用いて、AIにアプリの概要と画面構成を説明する。
---

# context-mapping

ユーザーとのやり取りからアプリの画面構成と必要な機能を抽出し、ContextMap.htmlを作成するための手順を示すガイドライン。

## Prerequisites

- アプリケーションの概要、または主要な機能のラフな記述。

---

## Logic / Procedure

### 1. Context Identification

ユーザーの記述から、独立してテスト・開発可能な「エリア（コンテクスト）」を特定する。

- セマンティックなHTMLタグ（`nav`, `main`, `aside`, `footer`, `header`）で構造化する
- 各エリアに `id="ctx-[name]"` を付与する
- 各エリアの責務を HTMLコメントで明記する

```html
<!-- ============================================================
     CTX-N: [NAME]
     責務: [このエリアが担う役割]
     [その他、実装上重要な制約や注意点があれば記述する]
============================================================ -->
```

---

### 2. State Hierarchy Planning

#### Global Store（`script#global-store`）

複数のコンテキストをまたいで共有すべき状態のみを `<head>` 内に配置する。

```html
<!-- ============================================================
     GLOBAL STORE
     複数のコンテキストをまたいで共有すべき状態のみを定義する。
     routing を router ライブラリに委譲する場合は持たない。
     永続化の方針もコメントで明記する。
============================================================ -->
<script id="global-store" type="application/json">
  { "activeProjectId": null }
</script>
```

**注意:**

- 完全にローカルで動作するアプリや、コンテキスト間で共有すべき状態がない場合は省略してよい
- routing を TanStack Router 等に委譲する場合は `global-store` に持たない
- SSOTはZustand等のstateライブラリ。`global-store` のJSONは実装時にパースしない

#### Local State（`script.local-state`）

各コンテキスト内に閉じる状態は `<head>` 内に定義する。`data-context` で対応するコンテキストと紐付ける。

```html
<!-- data-context に対応するコンテキストの id を指定する -->
<script data-context="ctx-[name]" class="local-state" type="application/json">
  {
    "isDialogOpen": false,
    "form": { "name": "", "description": "" },
    "errors": { "name": null }
  }
</script>
```

**コンテキストタグとの対応関係:**

`<head>` 内の `local-state` スクリプトと `<body>` 内のUI要素は、同じ値を持つキーで紐付けられる。

```
<head>
  <script data-context="ctx-main" class="local-state"> ← 定義側
<body>
  <main id="ctx-main">                                 ← UI側
```

- 定義側: `script[data-context="ctx-main"]`
- UI側: `#ctx-main`
- 紐付けキー: `"ctx-main"`（両者で一致する）

UI要素側（`<body>`）は `id` のみでよい。`data-context` の重複付与は不要。
構造タグは `id` で一意に識別できるため。

**パーサーによる取得方法:**

```js
// UI要素からその local-state を取得する
const ui = document.getElementById("ctx-main");
const state = document.querySelector(
  `script.local-state[data-context="${ui.id}"]`,
);
const localState = JSON.parse(state.textContent);

// 逆引き: local-state から対応するUI要素を取得する
const scripts = document.querySelectorAll("script.local-state");
scripts.forEach((script) => {
  const ctxId = script.dataset.context;
  const ui = document.getElementById(ctxId);
  const localState = JSON.parse(script.textContent);
});
```

**定義のコツ:**

- `form` と `errors` はセットで定義する。ZodによるバリデーションでAIがエラー表示のロジックを組み込みやすくなる
- 未選択・未入力の初期状態は `null` で明示する。条件付きレンダリング（Empty State）の実装漏れを防げる

```html
<script data-context="ctx-[name]" class="local-state" type="application/json">
  {
    "selectedProjectId": null,
    "isDialogOpen": false,
    "form": { "name": "", "description": "" },
    "errors": { "name": null }
  }
</script>
```

**注意:**

- `<script>` に `id` は付与しない。HTMLの仕様上 `id` はページ内で一意でなければならず、UI要素の `id` と重複するため
- `local-state` を持たないコンテキストにはスクリプトタグを作らない

#### 拡張フィールド（必要な場合のみ追加する）

| フィールド        | 用途                             | 追加条件                       |
| ----------------- | -------------------------------- | ------------------------------ |
| `uiDataFlows`     | コンテキスト間のデータフロー定義 | 複数コンテキストが連動する場合 |
| `agent`           | LLMのモデル・設定                | LLMを使う場合                  |
| `actionRegistry`  | LLMが呼び出せる関数の定義        | LLMにツールを使わせる場合      |
| `operationPolicy` | 操作の危険度分類                 | 外部DBへの書き込みを伴う場合   |

---

### 3. Stack の定義

技術スタックは `<head>` 内にコメントとして記述する。実行時データではないため `<script>` タグは使わない。

```html
<!-- ============================================================
     STACK
     runtime:  [例: Tauri 2]
     frontend: [例: React 18 + TypeScript]
     bundler:  [例: Vite]
     styling:  [例: Tailwind CSS v4 + shadcn/ui]
     router:   [例: TanStack Router（routing の SSOT）]
     state:    [例: Zustand]
     persist:  [例: Tauri fs プラグイン]
     testing:  [例: Vitest + RTL + Playwright]
     package:  [例: pnpm]
============================================================ -->
```

---

### 4. Data Flow の定義（必要な場合）

コンテキスト間にデータの流れがある場合、`uiDataFlows` として `global-store` 内に明示する。
**UIイベント起点のフローのみ**を記述する。DBアクセスは各コンテキストの責務コメントに記述する。

```json
"uiDataFlows": [
  {
    "from":    "[送信元コンテキストID]",
    "to":      "[送信先コンテキストID]",
    "data":    "[送信するデータ]",
    "trigger": "[発火条件]"
  }
]
```

---

### 5. Feature Extraction

各コンテキストの役割を `[Feature]` / `[Logic]` の形式でHTMLコメントとして記述する。
UIに書き込まない（表示が崩れ、ContextMapとしての視認性が損なわれるため）。
AIはHTMLコメントも読める。

```html
<!--
  [Feature] [機能名]    — ユーザーが観測できる振る舞い。具体的な操作と結果を書く
  [Logic]   [ロジック名] — STACKに基づく具体的な内部処理。使用するライブラリ・APIを明記する
-->
```

**`[Feature]` と `[Logic]` の書き分け:**

- `[Feature]` はユーザー視点で観測できる振る舞いを記述する
- `[Logic]` は STACKコメントに書いた技術を具体的に反映する。ライブラリ名・API名を明記することでAIが適切な実装を推論できる

```html
<!--
  STACKに router: TanStack Router と書いたなら:
  [Logic] Routing — TanStack Router の <Link> でラップする

  STACKに persist: Tauri fs プラグイン と書いたなら:
  [Logic] Persist — Tauri fs で projects.json に書き出す

  STACKに state: Zustand と書いたなら:
  [Logic] Submit  — Zustand の addProject() を呼び出す
-->
```

**Spec との関係:**

- `[Feature]` / `[Logic]` は BOM・Spec の `@story` の種になる
- 未承認のContextMapに依存するFeatureは、そのSpecが存在しないため自動的に実装されない
- 将来追加される機能はContextMapが承認されてから追記する

---

### 6. HTML Construction

- セマンティックなHTMLタグ（`nav`, `main`, `aside`等）で構造化する
- 主要なUIのモックアップ（ダミーデータ・ボタン等）を埋め込み、実装イメージを伝える
- CSSはContextMapの視認性のために最低限定義する（実装への制約ではない）

#### Overlay（Dialog / Modal）の配置

`position: fixed` が親要素の `overflow` に封じられないよう、**必ず `</body>` 直前**（構造タグの外）に配置する。

```html
  <!-- ============================================================
       CTX-N: [DIALOG NAME]
       責務: [トリガーとなる操作・表示条件]
  ============================================================ -->
  <div class="overlay">
    <!-- <dialog> 要素はブラウザデフォルトスタイルを all:unset でリセットする -->
    <dialog style="all:unset; display:flex; flex-direction:column; box-sizing:border-box;">

      <!-- モックアップ -->

      <!--
        [Feature] [機能名]    — 説明
        [Logic]   [ロジック名] — 説明
      -->
    </dialog>
  </div>

</body>
```

**`<dialog>` 要素の注意点:**

- ブラウザ標準の `<dialog>` は `margin: auto` 等のデフォルトスタイルを持つため `all: unset` でリセットする
- React実装時は `isDialogOpen && <Dialog/>` の条件付きレンダリングで制御する

---

## Outputs

`ContextMap.html`:

- ブラウザで表示可能なプロトタイプ
- 各コンテキストの責務コメント
- `[Feature]` / `[Logic]` による機能リスト（HTMLコメント形式）
- `<head>` 内の `script#global-store` および `script.local-state` による状態定義
- STACKコメントによる技術スタック定義

---

## Example Output

```html
<!DOCTYPE html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <title>ContextMap: [アプリ名]</title>

    <!-- ============================================================
         STACK
         runtime:  Tauri 2
         frontend: React 18 + TypeScript
         router:   TanStack Router（routing の SSOT）
         state:    Zustand
         testing:  Vitest + RTL + Playwright
         package:  pnpm
    ============================================================ -->

    <!-- ============================================================
         GLOBAL STORE
         複数のコンテキストをまたいで共有すべき状態のみを定義する。
         routing は TanStack Router に委譲するため持たない。
    ============================================================ -->
    <script id="global-store" type="application/json">
      { "activeProjectId": null }
    </script>

    <!-- ctx-main の local-state（local-stateを持つコンテキストのみ定義する） -->
    <script data-context="ctx-main" class="local-state" type="application/json">
      { "isDialogOpen": false }
    </script>

    <style>
      .context-area {
        border: 1px dashed #ccc;
        padding: 20px;
        margin: 10px;
      }
    </style>
  </head>
  <body>
    <!-- ============================================================
         CTX-1: SIDEBAR
         責務: ナビゲーション・ルーティング更新
    ============================================================ -->
    <nav id="ctx-sidebar" class="context-area">
      <h2>Navigation</h2>
      <!-- モックアップ -->

      <!--
        [Feature] Project List     — プロジェクト一覧を表示し、選択可能にする
        [Logic]   Selection Update — クリック時に global-store の activeProjectId を更新する
      -->
    </nav>

    <!-- ============================================================
         CTX-2: MAIN
         責務: 選択中のプロジェクトの詳細を表示する
    ============================================================ -->
    <main id="ctx-main" class="context-area">
      <h2>Main Content</h2>
      <!-- モックアップ -->

      <!--
        [Feature] Project Detail — 選択中のプロジェクトの詳細をカード形式で表示する
        [Feature] Data Form      — データの追加・削除ができるフォームを置く
      -->
    </main>

    <!-- ============================================================
         CTX-3: NEW ITEM DIALOG
         責務: 新規アイテム作成フォーム
         トリガー: 「＋ 追加」ボタンクリック
         注意: </body> 直前に配置（position:fixed のため）
    ============================================================ -->
    <div class="overlay">
      <dialog
        style="all:unset; display:flex; flex-direction:column; box-sizing:border-box;"
      >
        <!-- モックアップ -->

        <!--
          [Feature] Create Item — name を入力して「作成」でリストに追加する
          [Feature] Cancel      — 「キャンセル」でダイアログを閉じる
          [Logic]   Validation  — name が空のとき送信しない（Zod）
          [Logic]   ID生成      — id は nanoid() で生成する
        -->
      </dialog>
    </div>
  </body>
</html>
```

---

## Notes

**アプリの性質に応じて取捨選択する:**

- シンプルなローカルアプリ → `global-store` は最小限またはなし
- LLMを使うアプリ → `agent`・`actionRegistry` 等を `global-store` に追加
- 外部DBへの書き込みを伴うアプリ → `operationPolicy` を `global-store` に追加
- コンテキスト間の連動が多いアプリ → `uiDataFlows` を追加

**曖昧でよいもの:**

- 型定義の詳細（LLMが推論する）
- バックエンドの実装詳細（Specで定義する）
- 将来追加される機能（育ってから追加する）

---

## Context Status

各コンテキストおよび Feature/Logic の実装状態を ContextMap.html のコメントで管理する。

| ステータス | 表記  | 意味                    |
| ---------- | ----- | ----------------------- |
| 未着手     | `[ ]` | デフォルト状態          |
| 実装済み   | `[○]` | コード実装完了          |
| 承認済み   | `[✓]` | Playwright 検品パス済み |

**記法:**

CTX レベル:
\```html

<!-- ============================================================
     CTX-1: TOPBAR [✓]
     責務: アプリ識別・グローバルアクション
============================================================ -->

\```

Feature / Logic レベル:
\```html

<!--
  [✓][Feature] Settings    — アイコンボタンクリックで Settings ダイアログを開く
  [✓][Logic]   Open Dialog — onSettingsClick 経由で isSettingsOpen を true にする
-->

\```

**運用ルール:**

- 実装着手時に `[ ]` → `[○]` に更新する
- Playwright 検品パス時に `[○]` → `[✓]` に更新する
- CTX レベルの `[✓]` は配下の全 Feature/Logic が `[✓]` であることを意味する
