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
    source: string
    target: string
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
    accent?: 'primary' | 'dashed'
    checklist?: readonly ContextGraphChecklistItem[]
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
 * それ以外の kind（component/hook/external/state）は、checklist があれば
 * そのまま引き継ぐ（ZTE抽出由来のcriteriaをグラフ上に表示するため）。
 * 無ければキー自体を含めない。
 * accent（枠線の視覚強調）は React Flow 公式の BaseNode パターンに倣い、
 * data 経由でカスタムノード内部から参照する。
 */
export function toCustomNodeData(node: ContextGraphNode): CustomNodeData {
    const base: BaseNodeData = {
        id: node.id,
        contextId: node.contextId,
        label: node.label,
        accent: node.accent,
        ...(node.kind === 'feature'
            ? { checklist: node.checklist ?? [] }
            : node.checklist && node.checklist.length > 0
              ? { checklist: node.checklist }
              : {}),
    }
    return { ...base, kind: node.kind } as CustomNodeData
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

/** ContextMap モック相当のエッジ定義（source/target はノード id） */
export const CONTEXT_GRAPH_EDGES: readonly ContextGraphEdge[] = [
    {
        id: 'foundation-source',
        source: 'foundation',
        target: 'source',
    },
    {
        id: 'foundation-project',
        source: 'foundation',
        target: 'project',
    },
    {
        id: 'todo-add-to-store',
        source: 'add-todo-form',
        target: 'use-todo-store',
    },
    {
        id: 'todo-list-to-store',
        source: 'todo-list-view',
        target: 'use-todo-store',
    },
    {
        id: 'todo-filter-to-store',
        source: 'filter-tabs',
        target: 'use-todo-store',
    },
    {
        id: 'todo-store-to-zustand',
        source: 'use-todo-store',
        target: 'zustand',
    },
    {
        id: 'todo-store-to-persist',
        source: 'use-todo-store',
        target: 'persist-todos',
    },
    {
        id: 'todo-store-to-global',
        source: 'use-todo-store',
        target: 'global-store',
        dashed: true,
    },
] as const