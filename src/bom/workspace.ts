/**
 * Workspace（Context Graph / Pipeline）の型・定数 SSOT。
 *
 * 第1スライス: シェル（Topbar + ContextSidebar）と view 切替。
 * 第2スライス: ContextGraphView（可視フィルタ）。
 * 第3スライス: ContextPipelineView（静的ステージ）。
 * 第4スライス: ContextChatPanel（ローカル送信）。
 *
 * @see docs/context/ContextMap.graph.html
 * @see docs/context/ContextMap.pipeline.html
 */

// ============================================================
// WorkspaceView
// /workspace?view= の SSOT。未指定時は graph。
// ============================================================

export type WorkspaceView = 'graph' | 'pipeline'

export const DEFAULT_WORKSPACE_VIEW: WorkspaceView = 'graph'

export function parseWorkspaceView(value: unknown): WorkspaceView {
    return value === 'pipeline' ? 'pipeline' : DEFAULT_WORKSPACE_VIEW
}

export function parseWorkspaceProjectId(value: unknown): string | undefined {
    return typeof value === 'string' && value.length > 0 ? value : undefined
}

export type WorkspaceSearch = {
    view: WorkspaceView
    projectId?: string
}

// ============================================================
// ContextSidebar
// Contexts = 独立トグル / UI = 排他選択。セクション間は排他。
// ============================================================

export type ContextSection = 'contexts' | 'ui'

/**
 * コンテキストの識別子。
 * Zizhou自身の固定コンテキスト（foundation/source/project/settings/login）に加え、
 * Extractorが外部プロジェクトから動的に発見するcontext（data-context属性の値）も
 * 同じ型で表現するため string に広げている。
 */
export type ContextNodeId = string

export type ContextSidebarItem = {
    id: ContextNodeId
    section: ContextSection
    label: string
}

export const WORKSPACE_SIDEBAR_ITEMS: readonly ContextSidebarItem[] = [
    { id: 'foundation', section: 'contexts', label: 'グラフ基盤' },
    { id: 'source', section: 'contexts', label: 'ソース解析' },
    { id: 'project', section: 'contexts', label: 'プロジェクト管理' },
    { id: 'todo', section: 'ui', label: 'Todo' },
    { id: 'settings', section: 'ui', label: '設定画面' },
    { id: 'login', section: 'ui', label: 'ログイン画面' },
] as const

/** ContextMap 初期表示: グラフ基盤のみ ON */
export const DEFAULT_VISIBLE_CONTEXT_IDS: readonly ContextNodeId[] = ['foundation']

/**
 * 同一のcontextId（例: "todo"）を UI/Contexts 両セクションのサイドバー項目として
 * 出すための区別用サフィックス。ContextSidebarの行id（key/data-testid/選択状態の
 * 一意キー）はセクションを跨いで重複できないため、Contexts側だけ内部的に別idを振る。
 * グラフ側のノードフィルタリングでは baseContextId() で剥がして本来のcontextIdに戻す。
 */
const CONTEXTS_SECTION_ID_SUFFIX = ':ctx'

/** contextId（例: "todo"）から、Contextsセクション用の一意なidを作る */
export function toContextsSectionId(id: string): ContextNodeId {
    return `${id}${CONTEXTS_SECTION_ID_SUFFIX}`
}

/**
 * Contextsセクション用id（例: "todo:ctx"）を元のcontextId（"todo"）に戻す。
 * サフィックスが無いid（foundation等、Zizhou自身の固定コンテキスト）はそのまま返す。
 */
export function baseContextId(id: ContextNodeId): ContextNodeId {
    return id.endsWith(CONTEXTS_SECTION_ID_SUFFIX)
        ? id.slice(0, -CONTEXTS_SECTION_ID_SUFFIX.length)
        : id
}