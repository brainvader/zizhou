# Zizhou（地蔵）

LLMを活用したソフトウェア開発における**コンテキスト管理**を研究・実践するプロジェクト。

Tauri 2 + React 18 + TypeScript で構築したデスクトップアプリケーションを開発しながら、LLMとの協調開発で重要となる要素を探求する。

## 研究テーマ

### コンテキストの明示化

LLMとの開発における最大の課題は「何を・どの範囲で実装するか」を明確に伝えることである。
Zizhouでは **Test as a Context（TaaC）** という手法を採用する。

> テストファイルの `import` 群がスコープを定義し、`describe`/`it` が振る舞いを定義する。
> テストファイルを渡すだけで、LLMはコンテキストを把握できる。

### TaaCの三層構造

```
ContextMap.html       — デザインカンプ兼テストの目次（[✓]/[ ] でチェック）
Vitest テストファイル  — コンテキストのSSOT（importがスコープ、describe/itが振る舞い）
実装ファイル           — テストに従って実装する
```

### Props DIパターン

外部依存（Tauri fs等）をpropsで受け取りデフォルト値を本番実装とすることで、テスト・Storybookでの差し替えを容易にする。疎結合な設計がLLMへ渡すコンテキストをさらに小さくする。

## Tech Stack

- **Runtime:** Tauri 2
- **Frontend:** React 18 + TypeScript + Vite
- **Styling:** Tailwind CSS v4 + shadcn/ui
- **Router:** TanStack Router
- **State:** Zustand
- **DB:** SurrealDB embedded (kv-surrealkv)
- **Graph:** ReactFlow (@xyflow/react)
- **Testing:** Vitest + RTL + Storybook + Playwright
- **Package:** pnpm

## Development Protocol

[AGENTS.md](./AGENTS.md) に開発プロトコル（TaaC v9.0）を定義している。
LLMとの協調開発において人間とLLMが共有すべき規約を記述したものである。

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
