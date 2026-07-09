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

// ============================================================
// ContextSidebar
// Contexts = 独立トグル / UI = 排他選択。セクション間は排他。
// ============================================================

export type ContextSection = 'contexts' | 'ui'

export type ContextNodeId =
    | 'foundation'
    | 'source'
    | 'project'
    | 'taskflow'
    | 'settings'
    | 'login'

export type ContextSidebarItem = {
    id: ContextNodeId
    section: ContextSection
    label: string
}

export const WORKSPACE_SIDEBAR_ITEMS: readonly ContextSidebarItem[] = [
    { id: 'foundation', section: 'contexts', label: 'グラフ基盤' },
    { id: 'source', section: 'contexts', label: 'ソース解析' },
    { id: 'project', section: 'contexts', label: 'プロジェクト管理' },
    { id: 'taskflow', section: 'ui', label: 'TaskFlow' },
    { id: 'settings', section: 'ui', label: '設定画面' },
    { id: 'login', section: 'ui', label: 'ログイン画面' },
] as const

/** ContextMap 初期表示: グラフ基盤のみ ON */
export const DEFAULT_VISIBLE_CONTEXT_IDS: readonly ContextNodeId[] = ['foundation']
