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

/**
 * ノードの種別。ContextMap.graph.html の data-kind 属性と1:1対応する。
 * React Flow 導入後は nodeTypes の振り分けキーとして使う。
 */
export type NodeKind = 'component' | 'hook' | 'external' | 'state' | 'feature'

export type ContextGraphNode = {
    id: string
    contextId: ContextNodeId
    label: string
    kind: NodeKind
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

// ============================================================
// CustomNode data
// React Flow の Node<T>.data に載せる、kind ごとのnarrow型。
// ContextGraphNode（抽出・保存用の共通データ）から変換して使う。
// ============================================================

export type BaseNodeData = {
    id: string
    contextId: ContextNodeId
    label: string
}

export type ComponentNodeData = BaseNodeData & { kind: 'component' }
export type HookNodeData = BaseNodeData & { kind: 'hook' }
export type ExternalNodeData = BaseNodeData & { kind: 'external' }
export type StateNodeData = BaseNodeData & { kind: 'state' }
export type FeatureNodeData = BaseNodeData & {
    kind: 'feature'
    checklist: readonly ContextGraphChecklistItem[]
}

export type CustomNodeData =
    | ComponentNodeData
    | HookNodeData
    | ExternalNodeData
    | StateNodeData
    | FeatureNodeData

/**
 * ContextGraphNode を CustomNode 用の narrow な data 型に変換する。
 * kind === 'feature' のとき checklist が無ければ空配列にフォールバックする。
 */
export function toCustomNodeData(node: ContextGraphNode): CustomNodeData {
    const base: BaseNodeData = {
        id: node.id,
        contextId: node.contextId,
        label: node.label,
    }
    if (node.kind === 'feature') {
        return { ...base, kind: 'feature', checklist: node.checklist ?? [] }
    }
    return { ...base, kind: node.kind }
}

/** ContextMap モック相当のノード定義 */
export const CONTEXT_GRAPH_NODES: readonly ContextGraphNode[] = [
    {
        id: 'foundation',
        contextId: 'foundation',
        label: 'グラフ基盤',
        kind: 'feature',
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
        kind: 'feature',
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
        kind: 'feature',
        position: { x: 250, y: 170 },
        width: 190,
        checklist: [{ label: 'rootPathを選択・検証する', done: true }],
    },
    {
        id: 'add-todo-form',
        contextId: 'todo',
        label: 'AddTodoForm',
        kind: 'component',
        position: { x: 10, y: 264 },
        width: 150,
    },
    {
        id: 'todo-list-view',
        contextId: 'todo',
        label: 'TodoListView',
        kind: 'component',
        position: { x: 225, y: 264 },
        width: 150,
    },
    {
        id: 'filter-tabs',
        contextId: 'todo',
        label: 'FilterTabs',
        kind: 'component',
        position: { x: 440, y: 264 },
        width: 150,
    },
    {
        id: 'use-todo-store',
        contextId: 'todo',
        label: 'useTodoStore',
        kind: 'hook',
        position: { x: 225, y: 408 },
        width: 150,
        accent: 'primary',
    },
    {
        id: 'zustand',
        contextId: 'todo',
        label: 'zustand',
        kind: 'external',
        position: { x: 100, y: 526 },
        width: 130,
        accent: 'dashed',
    },
    {
        // kind は暫定で 'external' としている。本来は別ContextMap
        // （ContextMap.storage.html の service/schema unit）への参照を
        // 持つべきだが、参照の表現方法は Todo サンプル生成フェーズまで保留。
        id: 'persist-todos',
        contextId: 'todo',
        label: 'persistTodos',
        kind: 'external',
        position: { x: 350, y: 526 },
        width: 150,
        accent: 'dashed',
    },
    {
        id: 'global-store',
        contextId: 'todo',
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
        id: 'todo-add-to-store',
        require: ['todo'],
        d: 'M85 316 C85 350, 200 370, 280 408',
    },
    {
        id: 'todo-list-to-store',
        require: ['todo'],
        d: 'M300 316 C300 350, 300 370, 300 408',
    },
    {
        id: 'todo-filter-to-store',
        require: ['todo'],
        d: 'M515 316 C515 350, 400 370, 320 408',
    },
    {
        id: 'todo-store-to-zustand',
        require: ['todo'],
        d: 'M280 474 C230 500, 200 508, 165 526',
    },
    {
        id: 'todo-store-to-persist',
        require: ['todo'],
        d: 'M320 474 C370 500, 400 508, 425 526',
    },
    {
        id: 'todo-store-to-global',
        require: ['todo'],
        d: 'M375 440 C460 440, 520 425, 545 408',
        dashed: true,
    },
] as const
