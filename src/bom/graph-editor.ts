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
 * ノードid集合が前と同じなら prevNodes（ドラッグ後の位置を保持したstate）を、
 * 変わっていれば nextNodes（props から再計算した新しいノード配列）を返す。
 *
 * controlled mode で ReactFlow を使う際、visibleIds の変化のたびに
 * toReactFlowNodes が新しい配列を生成してしまうため、このガードが無いと
 * ドラッグで動かした位置が毎レンダーでリセットされてしまう。
 */
export function reconcileNodes<T extends { id: string }>(
    prevNodes: readonly T[],
    nextNodes: readonly T[],
): readonly T[] {
    const prevIds = prevNodes.map((n) => n.id).join(',')
    const nextIds = nextNodes.map((n) => n.id).join(',')
    return prevIds === nextIds ? prevNodes : nextNodes
}

export type HandleSide = 'top' | 'right' | 'bottom' | 'left'

function centerX(node: ContextGraphNode): number {
    return node.position.x + (node.width ?? 0) / 2
}

/**
 * source→target の相対位置から、接続に使う4方向の Handle id（GraphNodeHandles参照）を選ぶ。
 * ノードの高さ情報を持たないため、垂直方向は position.y（左上）をそのまま近似値として使う。
 * |dx| と |dy| を比較し、大きい方の軸を採用する（同値のときは水平方向を優先）。
 */
export function pickHandleIds(
    source: ContextGraphNode,
    target: ContextGraphNode,
): { sourceHandle: HandleSide; targetHandle: HandleSide } {
    const dx = centerX(target) - centerX(source)
    const dy = target.position.y - source.position.y

    if (Math.abs(dx) >= Math.abs(dy)) {
        return dx >= 0
            ? { sourceHandle: 'right', targetHandle: 'left' }
            : { sourceHandle: 'left', targetHandle: 'right' }
    }
    return dy >= 0
        ? { sourceHandle: 'bottom', targetHandle: 'top' }
        : { sourceHandle: 'top', targetHandle: 'bottom' }
}

/**
 * source/target 両端のノードが可視のときだけエッジを React Flow の Edge[] に変換する。
 * sourceHandle/targetHandle は pickHandleIds が両ノードの相対位置から自動選択する。
 */
export function toReactFlowEdges(
    edges: readonly ContextGraphEdge[],
    nodes: readonly ContextGraphNode[],
    visibleIds: readonly ContextNodeId[],
): GraphEditorEdge[] {
    const visible = new Set(visibleIds)
    const visibleNodes = nodes.filter((n) => visible.has(n.contextId))
    const nodeById = new Map(visibleNodes.map((n) => [n.id, n]))

    return edges
        .filter((e) => nodeById.has(e.source) && nodeById.has(e.target))
        .map((e) => {
            const sourceNode = nodeById.get(e.source)!
            const targetNode = nodeById.get(e.target)!
            const { sourceHandle, targetHandle } = pickHandleIds(sourceNode, targetNode)
            return {
                id: e.id,
                source: e.source,
                target: e.target,
                sourceHandle,
                targetHandle,
                style: e.dashed ? { strokeDasharray: '3 3' } : undefined,
            }
        })
}
