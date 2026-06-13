import { invoke } from '@tauri-apps/api/core'
import type { ContextStorage, SourceContext } from '@/bom/source-context'

/**
 * defaultContextStorage
 *
 * SurrealDB ↔ フロントエンド間の SourceContext ストレージ層の既定実装。
 * Tauri コマンド invoke をラップする。
 *
 * Props DI 用に ContextStorage 型を export しており、テスト・Storybook では
 * `{ ...defaultContextStorage, listContexts: mockFn }` で部分上書き可能。
 *
 * バックエンド契約:
 *   - list_contexts(projectId)                    → Vec<ContextResponse>
 *   - create_context(projectId, name, nodeIds)    → ContextResponse
 *   - update_context(contextId, name, nodeIds)    → ContextResponse
 *   - delete_context(contextId)                   → ()
 *
 * Tauri の自動 camelCase 変換により Rust の project_id / node_ids は
 * フロントエンド側では projectId / nodeIds として受け取れる。
 *
 * @context CTX-22
 * @bom     docs/bom/source-context.ts ContextStorage
 */
export const defaultContextStorage: ContextStorage = {
    /**
     * プロジェクト配下の SourceContext 一覧を返す。
     * @param projectId プロジェクト ID（例: "project:1"）
     */
    listContexts: (projectId: string): Promise<SourceContext[]> =>
        invoke<SourceContext[]>('list_contexts', { projectId }),

    /**
     * SourceContext を作成する。
     * @param projectId プロジェクト ID
     * @param name      コンテクスト名
     * @param nodeIds   含まれる SourceNode の ID 集合
     */
    createContext: (
        projectId: string,
        name: string,
        nodeIds: string[],
    ): Promise<SourceContext> =>
        invoke<SourceContext>('create_context', { projectId, name, nodeIds }),

    /**
     * SourceContext の name と nodeIds を更新する。
     * @param contextId コンテクスト ID（例: "source_context:xxx"）
     * @param name      新しいコンテクスト名
     * @param nodeIds   新しい nodeIds
     */
    updateContext: (
        contextId: string,
        name: string,
        nodeIds: string[],
    ): Promise<SourceContext> =>
        invoke<SourceContext>('update_context', { contextId, name, nodeIds }),

    /**
     * SourceContext を削除する（ノード自体は残す）。
     * @param contextId コンテクスト ID
     */
    deleteContext: (contextId: string): Promise<void> =>
        invoke<void>('delete_context', { contextId }),
}