import { useCallback, useEffect, useState } from 'react'
import {
    ReactFlow,
    Background,
    Controls,
    applyNodeChanges,
    useReactFlow,
    type NodeChange,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import {
    CONTEXT_GRAPH_EDGES,
    CONTEXT_GRAPH_NODES,
    type ContextGraphEdge,
    type ContextGraphNode,
} from '@/bom/context-graph'
import { toReactFlowNodes, toReactFlowEdges, reconcileNodes, type GraphEditorNode } from '@/bom/graph-editor'
import { GRAPH_NODE_TYPES } from '@/bom/graph-node-types'
import type { ContextNodeId } from '@/bom/workspace'

export type ComponentGraphEditorProps = {
    visibleIds: readonly ContextNodeId[]
    nodes?: readonly ContextGraphNode[]
    edges?: readonly ContextGraphEdge[]
    onNodeClick?: (nodeId: string) => void
}

/**
 * ComponentGraphEditor
 * React Flow ベースのグラフエディタ。可視コンテキストのノード・エッジを表示する。
 * /workspace の view=graph（デフォルト）で表示される、グラフ表示の実体。
 *
 * controlled mode を採用する（useNodesState/useEdgesState は使わない、既知の制約）。
 * ノードのドラッグ位置はローカル state で保持し、visibleIds 変化のたびに
 * ノードid集合が変わっていなければ reconcileNodes で state を維持する
 * （content-comparison stabilization。無条件に作り直すとドラッグ位置が毎回消える）。
 * fitView（ReactFlowのbool prop）は初回マウント時にしか効かないため、
 * ノードid集合が変わるたびに FitViewOnChange が useReactFlow().fitView() を呼び直す。
 * 接続の作成（onConnect）は現時点では対象外。
 *
 * @see src/bom/graph-editor.ts
 * @see src/bom/graph-node-types.ts
 * @see docs/context/ContextMap.graph.html
 */
export function ComponentGraphEditor({
    visibleIds,
    nodes = CONTEXT_GRAPH_NODES,
    edges = CONTEXT_GRAPH_EDGES,
    onNodeClick,
}: ComponentGraphEditorProps) {
    const baseNodes = toReactFlowNodes(nodes, visibleIds)
    const rfEdges = toReactFlowEdges(edges, nodes, visibleIds)

    const [rfNodes, setRfNodes] = useState(baseNodes)

    useEffect(() => {
        setRfNodes((prev) => [...reconcileNodes(prev, baseNodes)])
        // baseNodes はレンダーごとに新しい配列参照になるため、内容（visibleIds/nodes/edges）で比較する
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visibleIds, nodes, edges])

    const handleNodesChange = useCallback((changes: NodeChange<GraphEditorNode>[]) => {
        setRfNodes((nds) => applyNodeChanges(changes, nds))
    }, [])

    const isEmpty = rfNodes.length === 0
    const visibleNodeIds = rfNodes.map((n) => n.id).join(',')

    return (
        <div
            data-testid="component-graph-editor"
            className="relative flex-1 min-h-0 w-full"
        >
            {isEmpty ? (
                <div
                    data-testid="component-graph-empty"
                    className="absolute inset-0 flex items-center justify-center text-muted-foreground text-xs font-mono"
                >
                    表示中のコンテクストがありません
                </div>
            ) : (
                <ReactFlow
                    nodes={rfNodes}
                    edges={rfEdges}
                    nodeTypes={GRAPH_NODE_TYPES}
                    onNodesChange={handleNodesChange}
                    onNodeClick={(_event, node) => onNodeClick?.(node.id)}
                    nodesConnectable={false}
                    fitView
                >
                    <Background />
                    <Controls />
                    <FitViewOnChange nodeIds={visibleNodeIds} />
                </ReactFlow>
            )}
        </div>
    )
}

/**
 * FitViewOnChange
 * nodeIds（ノードid集合を join した文字列）が変わったときだけ fitView() を呼び直す。
 * rfNodes 自体を依存に使うとドラッグによる position 変化のたびにも発火してしまうため、
 * id集合の文字列だけを依存にして、可視ノードの入れ替わり時のみ再フィットする。
 */
function FitViewOnChange({ nodeIds }: { nodeIds: string }) {
    const { fitView } = useReactFlow()

    useEffect(() => {
        fitView({ duration: 200 })
        // fitView 自体は ReactFlow インスタンスに紐づく安定した関数だが、
        // 型上は毎レンダー新しい参照になりうるため依存から外し、nodeIds のみで判定する
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [nodeIds])

    return null
}