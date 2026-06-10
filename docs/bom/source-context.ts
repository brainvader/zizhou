/**
 * docs/bom/source-context.ts
 *
 * @context CTX-22: Source Context
 *
 * SourceGraph 上のノード集合に名前を付けた「SourceContext」の型契約。
 * Rust 側の create_context / list_contexts / update_context / delete_context との対応を定義する。
 */

// ============================================================
// SourceContext
// SurrealDB source_context テーブルのレコード型。
// Rust コマンドの戻り値として使う。
// ============================================================

/**
 * SourceContext
 *
 * ユーザーが SourceGraph 上のノード集合に付けた名前付きグループ。
 * SurrealDB の source_context テーブルに永続化される。
 *
 * @field id         SurrealDB Thing 型: "source_context:xxx"
 * @field name       ユーザーが付けるコンテクスト名
 * @field projectId  所属プロジェクトの ID（Tauri が camelCase 化して返す）
 * @field nodeIds    含まれる SourceNode の ID 集合
 */
export type SourceContext = {
    id: string
    name: string
    projectId: string
    nodeIds: string[]
}

// ============================================================
// ContextStorage
// SurrealDB ↔ フロントエンド間のストレージ層インタフェース。
// GraphStorage と対称的な設計。src/services/ContextStorage.ts に実装する。
// ============================================================

/**
 * ContextStorage
 *
 * SourceContext の CRUD を担うストレージ層。
 * Props DI で差し替え可能にするためインタフェースとして定義する。
 *
 * 実装: src/services/ContextStorage.ts の defaultContextStorage
 */
export type ContextStorage = {
    /** プロジェクト配下の SourceContext 一覧を返す */
    listContexts: (projectId: string) => Promise<SourceContext[]>

    /** SourceContext を作成する */
    createContext: (
        projectId: string,
        name: string,
        nodeIds: string[],
    ) => Promise<SourceContext>

    /** SourceContext の name と nodeIds を更新する */
    updateContext: (
        contextId: string,
        name: string,
        nodeIds: string[],
    ) => Promise<SourceContext>

    /** SourceContext を削除する（ノード自体は残す） */
    deleteContext: (contextId: string) => Promise<void>
}

// ============================================================
// BoundaryEdge
// コンテクスト境界をまたぐエッジの算出結果。
// source / target のどちらか一方のみが SourceContext に属するエッジ。
// ============================================================

/**
 * isBoundaryEdge
 *
 * エッジの source/target が同一コンテクストに属するかを判定する。
 * 両端が同じコンテクストに属する → false（内部エッジ）
 * 両端が別コンテクスト or 一方が未所属 → true（境界エッジ）
 *
 * @param edgeSource  エッジの source ノード ID
 * @param edgeTarget  エッジの target ノード ID
 * @param contexts    プロジェクト内の全 SourceContext
 * @returns           境界エッジなら true
 */
export function isBoundaryEdge(
    edgeSource: string,
    edgeTarget: string,
    contexts: SourceContext[],
): boolean {
    // source/target が属するコンテクスト ID を解決する
    const findContextId = (nodeId: string): string | null => {
        const ctx = contexts.find((c) => c.nodeIds.includes(nodeId))
        return ctx?.id ?? null
    }

    const srcCtx = findContextId(edgeSource)
    const tgtCtx = findContextId(edgeTarget)

    // 両端とも未所属 → 境界なし
    if (srcCtx === null && tgtCtx === null) return false

    // 両端が同じコンテクスト → 内部エッジ
    if (srcCtx !== null && srcCtx === tgtCtx) return false

    // それ以外（片方のみ所属、または異なるコンテクスト）→ 境界エッジ
    return true
}