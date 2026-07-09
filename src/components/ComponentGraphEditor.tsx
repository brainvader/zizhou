import { ReactFlow, Background } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import {
    CONTEXT_GRAPH_EDGES,
    CONTEXT_GRAPH_NODES,
    type ContextGraphEdge,
    type ContextGraphNode,
} from '@/bom/context-graph'
import { toReactFlowNodes, toReactFlowEdges } from '@/bom/graph-editor'
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
 * 現時点ではドラッグ・接続などの編集操作は無効化し、表示専用として静的版と挙動を揃える。
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
    const rfNodes = toReactFlowNodes(nodes, visibleIds)
    const rfEdges = toReactFlowEdges(edges, nodes, visibleIds)
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
                    nodesDraggable={false}
                    nodesConnectable={false}
                    fitView
                >
                    <Background />
                </ReactFlow>
            )}
        </div>
    )
}
