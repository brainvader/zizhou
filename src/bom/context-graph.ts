/**
 * Context Graph キャンバスの静的ノード／エッジ SSOT。
 * ContextMap.graph.html のモック配置を定数化したもの。
 *
 * @see docs/context/ContextMap.graph.html
 * @see src/bom/workspace.ts
 */
import type { ContextNodeId } from '@/bom/workspace'

export type ContextGraphChecklistItem = {
    label: string
    done: boolean
}

export type ContextGraphNode = {
    id: string
    contextId: ContextNodeId
    label: string
    kind?: string
    checklist?: readonly ContextGraphChecklistItem[]
    position: { x: number; y: number }
    width?: number
    accent?: 'primary' | 'dashed'
}

export type ContextGraphEdge = {
    id: string
    require: readonly ContextNodeId[]
    d: string
    dashed?: boolean
}

/** ContextMap モック相当のノード定義 */
export const CONTEXT_GRAPH_NODES: readonly ContextGraphNode[] = [
    {
        id: 'foundation',
        contextId: 'foundation',
        label: 'グラフ基盤',
        position: { x: 0, y: 0 },
        width: 190,
        checklist: [
            { label: 'SurrealDBのnode/edgeスキーマを定義する', done: true },
            { label: 'React Flowでグラフを描画する', done: false },
        ],
    },
    {
        id: 'source',
        contextId: 'source',
        label: 'ソース解析',
        position: { x: 250, y: 0 },
        width: 190,
        checklist: [
            { label: 'ファイル間の依存関係を取得する', done: true },
            { label: 'テストファイルの依存元/依存先を辿る', done: false },
        ],
    },
    {
        id: 'project',
        contextId: 'project',
        label: 'プロジェクト管理',
        position: { x: 250, y: 170 },
        width: 190,
        checklist: [{ label: 'rootPathを選択・検証する', done: true }],
    },
    {
        id: 'taskflow-add-todo',
        contextId: 'taskflow',
        label: 'AddTodoForm',
        kind: 'component',
        position: { x: 10, y: 264 },
        width: 150,
    },
    {
        id: 'taskflow-todo-list',
        contextId: 'taskflow',
        label: 'TodoListView',
        kind: 'component',
        position: { x: 225, y: 264 },
        width: 150,
    },
    {
        id: 'taskflow-filter-tabs',
        contextId: 'taskflow',
        label: 'FilterTabs',
        kind: 'component',
        position: { x: 440, y: 264 },
        width: 150,
    },
    {
        id: 'taskflow-use-todo-store',
        contextId: 'taskflow',
        label: 'useTodoStore',
        kind: 'hook',
        position: { x: 225, y: 408 },
        width: 150,
        accent: 'primary',
    },
    {
        id: 'taskflow-zustand',
        contextId: 'taskflow',
        label: 'zustand',
        kind: 'external',
        position: { x: 100, y: 526 },
        width: 130,
        accent: 'dashed',
    },
    {
        id: 'taskflow-persist-todos',
        contextId: 'taskflow',
        label: 'persistTodos',
        kind: 'ContextMap.storage.html',
        position: { x: 350, y: 526 },
        width: 150,
        accent: 'dashed',
    },
    {
        id: 'taskflow-global-store',
        contextId: 'taskflow',
        label: 'global-store',
        kind: 'state',
        position: { x: 545, y: 380 },
        width: 90,
        accent: 'dashed',
    },
] as const

/** ContextMap モック相当のエッジ定義 */
export const CONTEXT_GRAPH_EDGES: readonly ContextGraphEdge[] = [
    {
        id: 'foundation-source',
        require: ['foundation', 'source'],
        d: 'M190 55 C215 55,225 55,250 55',
    },
    {
        id: 'foundation-project',
        require: ['foundation', 'project'],
        d: 'M110 130 C110 170,160 190,250 205',
    },
    {
        id: 'taskflow-add-to-store',
        require: ['taskflow'],
        d: 'M85 316 C85 350, 200 370, 280 408',
    },
    {
        id: 'taskflow-list-to-store',
        require: ['taskflow'],
        d: 'M300 316 C300 350, 300 370, 300 408',
    },
    {
        id: 'taskflow-filter-to-store',
        require: ['taskflow'],
        d: 'M515 316 C515 350, 400 370, 320 408',
    },
    {
        id: 'taskflow-store-to-zustand',
        require: ['taskflow'],
        d: 'M280 474 C230 500, 200 508, 165 526',
    },
    {
        id: 'taskflow-store-to-persist',
        require: ['taskflow'],
        d: 'M320 474 C370 500, 400 508, 425 526',
    },
    {
        id: 'taskflow-store-to-global',
        require: ['taskflow'],
        d: 'M375 440 C460 440, 520 425, 545 408',
        dashed: true,
    },
] as const
