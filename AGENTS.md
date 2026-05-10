# AI Coding Protocol (ver 8.00)

あなたは私の開発パートナーとして、以下の**「証拠に基づくトップダウン開発」**に従って動作してください。

## 1. 基本コンセプト：動くものが正義

- **まず形にする:** 最速で `src/` 等に「実際に動くコード」を生成せよ。
- **テストが証拠:** 正しく動くことの証明は、言葉ではなく以下の3層で行え。
  - **Storybook（視覚的証拠）** — @story の手順をコンポーネント単位で実演する
  - **Vitest/RTL（論理的証拠）** — 状態遷移・データ変換のロジックを検証する
  - **Playwright（結合的証拠）** — Tauri fs・ルーティングなど実環境のみで確認できる事項を検証する
- **進捗の定義:** 監督（ユーザー）が **Storybook の画面を見て「意図通りだ」と認めた時**、初めて進捗として記録される。

## 2. 運用ルール

- **@story 準拠:** @story の手順は Storybook の Story と1対1で対応させ、ユーザー体験を保証せよ。
- **JSDocへの集約:** 実装仕様はすべてコード内の JSDoc に集約し、重複するドキュメントは作成しない。
- **名前の絶対遵守:** BOMで決めた命名を絶対とし、実装側で勝手に変更・エイリアス化しないこと。
- **Context Isolation:** 各部品はBOMを通じてのみ通信し、担当範囲外の実装詳細に依存しない。
- **props DI 標準:** コンポーネントは外部依存（Tauri fs 等）を props で受け取る。デフォルト値を実装とし、Story・テストでは差し替える。
- **人間の検品:** Storybook は監督へのプレゼンである。画面で意図を証明せよ。
- **セレクタ規約:** E2E テストのセレクタは `data-testid` を使用する。命名は `ctx-` プレフィックスなしのシンプルな役割名とする（例: `file-tree`, `graph-editor`, `node-property`）。

## 3. テスト責務の分担

| 層         | ツール     | 責務                                           | 証拠               |
| ---------- | ---------- | ---------------------------------------------- | ------------------ |
| ビジュアル | Storybook  | @story の全状態をコンポーネント単位で確認      | Story の画面       |
| ロジック   | Vitest/RTL | 状態遷移・データ変換・hook のユニットテスト    | テスト結果         |
| 結合       | Playwright | Tauri fs・ルーティング・画面遷移など実環境依存 | スクリーンショット |

**Playwright は「Storybook では確認できないこと」に限定する。**
コンポーネントの見た目・インタラクションは Storybook で完結させ、Playwright に持ち込まない。

## 4. props DI パターン

コンポーネントは「データの写像」であるべきで、外部依存を内部に持ち込まない。

```typescript
// NG: コンポーネント内で Tauri fs を直接呼ぶ
import { exists } from '@tauri-apps/plugin-fs'
export function GraphEditor() {
  useEffect(() => { exists(path) ... }, [])
}

// OK: props で受け取り、デフォルト値を実装とする
type GraphEditorProps = {
  onExists?: (path: string) => Promise<boolean>
  onMkdir?:  (path: string) => Promise<void>
}
export function GraphEditor({
  onExists = exists,
  onMkdir  = mkdir,
}: GraphEditorProps = {}) { ... }
```

Story・Vitest では props を差し替えるだけでよい。`vite.config.ts` の alias モックや `src/__mocks__/` は不要になる。

**既存コンポーネントへの適用:** 壊れていないものを無理に改修しない。新規コンポーネントから標準として適用し、既存は機能追加のタイミングで順次移行する。

## 5. 標準ディレクトリ構成

    root/
    ├── AGENTS.md              <-- 本規約（AI用OS）
    ├── docs/                  <-- 【発注・設計エリア】
    │   ├── bom/               <-- 共通規格：Interface / Zod Schema / State Machine
    │   └── specs/             <-- 発注書：*.spec.ts / *.stories.tsx
    ├── src/
    │   ├── components/        <-- 【実装・納品エリア】
    │   └── stories/           <-- Storybook Story ファイル（*.stories.tsx）
    └── tests/                 <-- Playwright 設定・E2E spec

## 6. ContextMap.html（設計の起点）

大まかな画面レイアウトを示し、分割された領域に必要な機能をリストアップするためのHTMLファイル。
これをもとにAIが技術スタックや必要な部品を提案する。対話的にブラッシュアップし、最終的な構成を決定するための「共通のイメージ」を提供する。
各要素はコンテクストを構成し、AIはこれをもとに必要な機能を抽出し、BOMやSpecに落とし込む。

詳細は `context-mapping.md` を参照。

```html
<!DOCTYPE html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <title>ContextMap: [アプリ名]</title>

    <!-- ============================================================
         STACK
         技術スタックはコメントとして記述する（実行時データではない）。
         例:
         runtime:  Tauri 2
         frontend: React 18 + TypeScript
         router:   TanStack Router（routing の SSOT）
         state:    Zustand
         testing:  Vitest + RTL + Storybook + Playwright
         package:  pnpm
    ============================================================ -->

    <!-- ============================================================
         GLOBAL STORE
         複数のコンテキストをまたいで共有すべき状態のみを定義する。
         routing を router ライブラリに委譲する場合は持たない。
    ============================================================ -->
    <script id="global-store" type="application/json">
      { "currentUser": "John", "theme": "dark", "activeProjectId": null }
    </script>

    <!-- ============================================================
         LOCAL STATE
         各コンテキスト内に閉じる状態を定義する。
         data-context に対応するコンテキストの id を指定する。
         UI要素側（<body>）は id のみでよい。data-context は不要。
    ============================================================ -->
    <script
      data-context="ctx-[name]"
      class="local-state"
      type="application/json"
    >
      { "activeIdx": 0 }
    </script>

    <style>
      .context-area {
        border: 1px solid #ccc;
        padding: 20px;
        margin: 10px;
      }
    </style>
  </head>
  <body>
    <h1>[アプリ名]</h1>

    <!-- ============================================================
         CTX-1: [NAME]
         責務: [このエリアが担う役割]
    ============================================================ -->
    <nav id="ctx-sidebar" class="context-area">
      <h2>Side Navigation</h2>

      <!--
        [Feature] Project List     — プロジェクト一覧を表示し、選択可能にする
        [Logic]   Selection Update — クリック時に global-store の activeProjectId を更新する
      -->
    </nav>

    <!-- ============================================================
         CTX-2: [NAME]
         責務: [このエリアが担う役割]
    ============================================================ -->
    <main id="ctx-main" class="context-area">
      <h2>Main Content</h2>

      <!--
        [Feature] Project Detail — 選択中のプロジェクトの詳細をカード形式で表示する
        [Feature] Data Form      — データの追加・削除ができるフォームを置く
      -->
    </main>

    <!-- ============================================================
         CTX-N: OVERLAY（Dialog / Modal 等）
         責務: [トリガーとなる操作・表示条件]
         注意: position:fixed が親の overflow に封じられないよう
               必ず </body> 直前（構造タグの外）に配置する。
               <dialog> 要素は all:unset でブラウザデフォルトをリセットする。
    ============================================================ -->
    <div class="overlay">
      <dialog style="all:unset; display:flex; flex-direction:column;">
        <!-- モックアップ -->

        <!--
          [Feature] [機能名] — 説明
          [Logic]   [ロジック名] — 説明
        -->
      </dialog>
    </div>
  </body>
</html>
```

## 7. Specファイルのひな型

AIは、`docs/specs/` 配下に以下の**3ファイル**を生成せよ。

### 7-1. Vitest/RTL spec（`*.spec.tsx`）

ロジック検証に特化。コンポーネントのレンダリングは最小限。

```typescript
/**
 * Slot 1: 発注用ヘッダー (JSDoc Metadata)
 * @context [コンポーネント名/機能名]
 * @bom [docs/bom/ 配下のファイルへのパス]
 * @story
 * 1. [ユーザー操作]
 * 2. [システム/UIの反応]
 * @output [src/ 配下の実装ファイルパス]
 */

/**
 * Slot 2: 外部依存のインポート (Imports)
 */
import { test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { [BOM名] } from '@/bom/[BOMファイル名]';
import { [ComponentName] } from '@/components/[ComponentName]';

/**
 * Slot 3: モック・セットアップ (Test Setup)
 * vi.hoisted() でモック変数を初期化する。
 */

/**
 * Slot 4: 挙動の検証コード (Story Verification)
 */

// --- 1. AIの内省 (Logic Verification) ---
// AIが自己修正ループを回し、ロジックを固めるための高速ループ。
// test('logic: should handle state transition', () => { ... });
```

### 7-2. Storybook Story（`*.stories.tsx`）

@story の全状態を props の組み合わせで網羅する。視覚的証拠の主軸。

```typescript
/**
 * @context [コンポーネント名]
 * @story
 * 1. [ユーザー操作]
 * 2. [システム/UIの反応]
 */
import type { Meta, StoryObj } from '@storybook/react';
import { [ComponentName] } from '@/components/[ComponentName]';

const meta: Meta<typeof [ComponentName]> = {
  component: [ComponentName],
};
export default meta;
type Story = StoryObj<typeof [ComponentName]>;

// @story の各状態を Story として定義する
export const [StateName]: Story = {
  args: {
    // props DI: 外部依存はここで差し替える
  },
};
```

### 7-3. Playwright E2E spec（`*.e2e.spec.ts`）

**Tauri fs・ルーティング・画面遷移など、Storybook では確認できない結合のみ**を対象とする。

```typescript
/**
 * @context [コンポーネント名] E2E
 * @note Storybook で確認できないことのみをここで検証する
 */
import { test, expect } from "@playwright/test";

test.describe("[Context]: Integration", () => {
  test("should [Tauri fs / routing dependent behavior]", async ({ page }) => {
    await page.goto("/[route]");
    // ...
    await page.screenshot({ path: "evidence/[Context]_result.png" });
  });
});
```

## 8. 実行ワークフロー（フェーズ分離型）

本プロトコルは**設計フェーズ**と**実装フェーズ**に分離する。
Specが両フェーズの**境界面**となる。

```
ContextMap.html → BOM → Spec  ←【境界面】→  実装 → 証拠
```

---

### 【設計フェーズ】設計モデルを使用

設計モデルはContextMap.htmlを読み、往復を最小化してBOM・Specを生成する。
抽象的な指示から具体的な設計を導出する能力が必要。

1. **概要説明:** ContextMap.htmlを用いてアプリの概要と画面構成を説明する。
2. **構成提案:** 設計モデルはContextMap.htmlから技術スタックを提案する。
3. **構成決定:** 人間はAIの提案をブラッシュアップし、必要な部品を決定する。
4. **BOM作成:** 設計モデルは部品をBOM（Zod Schema/Type）として `docs/bom/` に生成する。
5. **状態定義:** 設計モデルは状態遷移をMermaid等で可視化し、BOMの一部として保存する。
6. **Spec作成:** 設計モデルはSpecファイルの Slot 1 に @story を記載する。
7. **ひな型完成:** 設計モデルはSpec ファイルの全Slotを埋め、テストの「器」を完成させる。
8. **フロー承認:** 人間はSpecを確認し、実装の開始を承認する。← **設計フェーズの完了条件**

---

### 【実装フェーズ】実装モデルを使用

実装モデルはSpecを受け取り、忠実にコードを生成する。
Specが十分に具体的であれば、追加のプロンプトエンジニアリングは不要。

9. **実装実行:** 実装モデルはSpecの @story を元に `src/` にコードを実装する。
10. **内省ループ:** 実装モデルは自らVitest/RTLテストを実行し、ロジックの不備を自己修正する。
11. **ビジュアル出力:** 実装モデルはStorybookでコンポーネントの全状態を確認できるようにする。
12. **人間検品:** 人間がStorybookの画面を確認。意図と異なる場合はAIが修正し、再提出する。
13. **結合確認:** Playwrightで実環境依存の動作のみを確認する。
14. **ロジック深掘り:** 見た目では分からないエッジケースのテストを追加し、堅牢にする。
15. **パス確認:** 人間が全テストのパスを確認し、承認する。← **実装フェーズの完了条件**

---

### 【次コンテキストへ】

16. **次コンテキスト:** storyが満たされたら、設計フェーズの手順3（構成決定）に戻り、次のコンテキストを開始する。
