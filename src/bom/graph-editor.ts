/**
 * ContextGraphNode/ContextGraphEdge → React Flow の Node/Edge への変換。
 * 可視集合（visibleIds）に基づくフィルタリングも含む、フレームワーク結合層。
 *
 * @see src/bom/context-graph.ts
 * @see src/components/ComponentGraphEditor.tsx
 */
import type { Node, Edge } from '@xyflow/react'
import {
    toCustomNodeData,
    type ContextGraphNode,
    type ContextGraphEdge,
    type CustomNodeData,
} from '@/bom/context-graph'
import type { ContextNodeId } from '@/bom/workspace'

export type GraphEditorNode = Node<CustomNodeData>
export type GraphEditorEdge = Edge

/**
 * 可視コンテキストに含まれるノードを React Flow の Node[] に変換する。
 * node.type は kind と一致させ、nodeTypes（GRAPH_NODE_TYPES）の振り分けキーとして使う。
 * width は data ではなく style 経由で渡す（React Flow公式の推奨に合わせる）。
 */
export function toReactFlowNodes(
    nodes: readonly ContextGraphNode[],
    visibleIds: readonly ContextNodeId[],
): GraphEditorNode[] {
    const visible = new Set(visibleIds)
    return nodes
        .filter((n) => visible.has(n.contextId))
        .map((n) => ({
            id: n.id,
            type: n.kind,
            position: n.position,
            style: n.width != null ? { width: n.width } : undefined,
            data: toCustomNodeData(n),
        }))
}

/**
 * source/target 両端のノードが可視のときだけエッジを React Flow の Edge[] に変換する。
 */
export function toReactFlowEdges(
    edges: readonly ContextGraphEdge[],
    nodes: readonly ContextGraphNode[],
    visibleIds: readonly ContextNodeId[],
): GraphEditorEdge[] {
    const visible = new Set(visibleIds)
    const visibleNodeIds = new Set(
        nodes.filter((n) => visible.has(n.contextId)).map((n) => n.id),
    )
    return edges
        .filter((e) => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target))
        .map((e) => ({
            id: e.id,
            source: e.source,
            target: e.target,
            style: e.dashed ? { strokeDasharray: '3 3' } : undefined,
        }))
}
