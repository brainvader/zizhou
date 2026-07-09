import { useCallback, useEffect, useState } from 'react'
import { ReactFlow, Background, applyNodeChanges, type NodeChange } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import {
    CONTEXT_GRAPH_EDGES,
    CONTEXT_GRAPH_NODES,
    type ContextGraphEdge,
    type ContextGraphNode,
} from '@/bom/context-graph'
import { toReactFlowNodes, toReactFlowEdges, reconcileNodes } from '@/bom/graph-editor'
import { GRAPH_NODE_TYPES } from '@/bom/graph-node-types'
import type { ContextNodeId } from '@/bom/workspace'

export type ComponentGraphEditorProps = {
    visibleIds: readonly ContextNodeId[]
    nodes?: readonly ContextGraphNode[]
    edges?: readonly ContextGraphEdge[]
}

/**
 * ComponentGraphEditor
 * React Flow ベースのグラフエディタ。可視コンテキストのノード・エッジを表示する。
 *
 * 既存の ContextGraphView（静的SVG版）は温存し、これは並行導入の新規コンポーネント。
 * controlled mode を採用する（useNodesState/useEdgesState は使わない、既知の制約）。
 * ノードのドラッグ位置はローカル state で保持し、visibleIds 変化のたびに
 * ノードid集合が変わっていなければ reconcileNodes で state を維持する
 * （content-comparison stabilization。無条件に作り直すとドラッグ位置が毎回消える）。
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
}: ComponentGraphEditorProps) {
    const baseNodes = toReactFlowNodes(nodes, visibleIds)
    const rfEdges = toReactFlowEdges(edges, nodes, visibleIds)

    const [rfNodes, setRfNodes] = useState(baseNodes)

    useEffect(() => {
        setRfNodes((prev) => reconcileNodes(prev, baseNodes))
        // baseNodes はレンダーごとに新しい配列参照になるため、内容（visibleIds/nodes/edges）で比較する
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visibleIds, nodes, edges])

    const handleNodesChange = useCallback((changes: NodeChange[]) => {
        setRfNodes((nds) => applyNodeChanges(changes, nds))
    }, [])

    const isEmpty = rfNodes.length === 0

    return (
        <div
            data-testid="component-graph-editor"
            className="relative w-[600px] h-[560px] shrink-0"
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
                    nodesConnectable={false}
                    fitView
                >
                    <Background />
                </ReactFlow>
            )}
        </div>
    )
}
