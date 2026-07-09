import {
    CONTEXT_GRAPH_EDGES,
    CONTEXT_GRAPH_NODES,
    type ContextGraphEdge,
    type ContextGraphNode,
} from '@/bom/context-graph'
import type { ContextNodeId } from '@/bom/workspace'
import { cn } from '@/lib/utils'

export type ContextGraphViewProps = {
    visibleIds: readonly ContextNodeId[]
    nodes?: readonly ContextGraphNode[]
    edges?: readonly ContextGraphEdge[]
}

/**
 * ContextGraphView
 * 可視コンテキストのグラフを静的レイアウトで表示する。
 *
 * - ノード: visibleIds に含まれる contextId のみ
 * - エッジ: require した全コンテキストが可視のときのみ
 * - 可視ノード 0: 空状態メッセージ
 *
 * @see docs/context/ContextMap.graph.html
 * @see src/bom/context-graph.ts
 */
export function ContextGraphView({
    visibleIds,
    nodes = CONTEXT_GRAPH_NODES,
    edges = CONTEXT_GRAPH_EDGES,
}: ContextGraphViewProps) {
    const visible = new Set(visibleIds)
    const visibleNodes = nodes.filter((n) => visible.has(n.contextId))
    const visibleEdges = edges.filter((e) =>
        e.require.every((id) => visible.has(id)),
    )
    const isEmpty = visibleNodes.length === 0

    return (
        <div
            data-testid="workspace-view-graph"
            className="relative w-[600px] h-[560px] shrink-0"
        >
            {isEmpty ? (
                <div
                    data-testid="graph-empty"
                    className="absolute inset-0 flex items-center justify-center text-muted-foreground text-xs font-mono"
                >
                    表示中のコンテクストがありません
                </div>
            ) : (
                <>
                    <svg
                        width={600}
                        height={560}
                        className="absolute inset-0 pointer-events-none"
                        aria-hidden
                    >
                        <defs>
                            <marker
                                id="context-graph-arrow"
                                viewBox="0 0 10 10"
                                refX={8}
                                refY={5}
                                markerWidth={6}
                                markerHeight={6}
                                orient="auto-start-reverse"
                            >
                                <path
                                    d="M2 1L8 5L2 9"
                                    fill="none"
                                    stroke="#3a4048"
                                    strokeWidth={1.4}
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            </marker>
                        </defs>
                        {visibleEdges.map((edge) => (
                            <path
                                key={edge.id}
                                data-testid={`graph-edge-${edge.id}`}
                                d={edge.d}
                                fill="none"
                                stroke={edge.dashed ? '#242830' : '#3a4048'}
                                strokeWidth={edge.dashed ? 1.2 : 1}
                                strokeDasharray={edge.dashed ? '3 3' : undefined}
                                markerEnd="url(#context-graph-arrow)"
                            />
                        ))}
                    </svg>

                    {visibleNodes.map((node) => (
                        <GraphNode key={node.id} node={node} />
                    ))}
                </>
            )}
        </div>
    )
}

function GraphNode({ node }: { node: ContextGraphNode }) {
    const hasChecklist = (node.checklist?.length ?? 0) > 0

    return (
        <div
            data-testid={`graph-node-${node.id}`}
            data-context={node.contextId}
            className={cn(
                'absolute bg-card rounded-[10px] px-3.5 py-3',
                node.accent === 'primary'
                    ? 'border-[1.5px] border-primary'
                    : node.accent === 'dashed'
                      ? 'border border-dashed border-border bg-[#101317]'
                      : 'border border-border',
            )}
            style={{
                left: node.position.x,
                top: node.position.y,
                width: node.width ?? 150,
            }}
        >
            <div
                className={cn(
                    'font-semibold',
                    hasChecklist ? 'text-sm mb-2' : 'text-[12.5px]',
                    node.accent === 'dashed' && 'font-medium text-[#a3a8b0] text-[11.5px]',
                )}
            >
                {node.label}
            </div>
            {node.kind && (
                <div className="text-[10px] text-muted-foreground mt-0.5">{node.kind}</div>
            )}
            {node.checklist?.map((item) => (
                <div
                    key={item.label}
                    className="flex items-start gap-1.5 text-xs text-[#a3a8b0] mb-1 last:mb-0 leading-snug"
                >
                    <input
                        type="checkbox"
                        checked={item.done}
                        disabled
                        readOnly
                        className="mt-0.5"
                    />
                    <span>{item.label}</span>
                </div>
            ))}
        </div>
    )
}
