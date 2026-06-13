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
    const findContextId = (nodeId: string): string | null => {
        const ctx = contexts.find((c) => c.nodeIds.includes(nodeId))
        return ctx?.id ?? null
    }

    const srcCtx = findContextId(edgeSource)
    const tgtCtx = findContextId(edgeTarget)

    if (srcCtx === null && tgtCtx === null) return false
    if (srcCtx !== null && srcCtx === tgtCtx) return false
    return true
}

// ============================================================
// Subflow 座標計算                                    [CTX-22]
// ReactFlow の parentId 方式では子ノードの position は
// 親コンテナ相対座標になるため、以下の変換関数を使う。
// ============================================================

/** ノード位置の最小情報。ReactFlow Node から抽出して渡す。 */
export type NodePositionEntry = {
    id: string
    position: { x: number; y: number }
}

/** コンテナ矩形。x/y は絶対座標、width/height はパディング込みのサイズ。 */
export type ContainerRect = {
    x: number
    y: number
    width: number
    height: number
}

/**
 * computeContainerRect
 *
 * 指定ノード群の絶対座標から包含矩形を計算し、
 * パディングを加えたコンテナの位置・サイズを返す。
 *
 * nodeIds に対応するノードが1つも見つからない場合は null を返す。
 *
 * @param nodeIds    コンテナに含めるノードの ID 集合
 * @param allNodes   グラフ上の全ノード（position は絶対座標）
 * @param padding    コンテナの内側余白（デフォルト 40px）
 * @param nodeHeight ノードの概算高さ（下端計算用、デフォルト 60px）
 * @param nodeWidth  ノードの概算幅（右端計算用、デフォルト 180px）
 */
export function computeContainerRect(
    nodeIds: string[],
    allNodes: NodePositionEntry[],
    padding = 40,
    nodeHeight = 60,
    nodeWidth = 180,
): ContainerRect | null {
    const targets = allNodes.filter((n) => nodeIds.includes(n.id))
    if (targets.length === 0) return null

    const xs = targets.map((n) => n.position.x)
    const ys = targets.map((n) => n.position.y)

    const minX = Math.min(...xs)
    const minY = Math.min(...ys)
    const maxX = Math.max(...xs) + nodeWidth
    const maxY = Math.max(...ys) + nodeHeight

    return {
        x: minX - padding,
        y: minY - padding,
        width: maxX - minX + padding * 2,
        height: maxY - minY + padding * 2,
    }
}

/**
 * toRelativePosition
 *
 * 子ノードの絶対座標を親コンテナ相対座標に変換する。
 *
 * ReactFlow は parentId が設定されたノードの position を
 * 親の左上角からの相対座標として解釈する。
 *
 * @param absolutePos   子ノードの絶対座標
 * @param containerPos  親コンテナの絶対座標（ContainerRect の x/y）
 * @returns             親相対座標
 */
export function toRelativePosition(
    absolutePos: { x: number; y: number },
    containerPos: { x: number; y: number },
): { x: number; y: number } {
    return {
        x: absolutePos.x - containerPos.x,
        y: absolutePos.y - containerPos.y,
    }
}