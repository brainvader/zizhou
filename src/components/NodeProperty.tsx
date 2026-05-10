import type { Node } from '@xyflow/react'
import type { GraphNodeData } from '@/bom/graph'
import { useGraphStore } from '@/store/useGraphStore'

type NodePropertyProps = {
    selectedNodeId?: string | null
    nodes?: Node<GraphNodeData>[]
}

/**
 * @context  CTX-3 / NodeProperty
 * @bom      docs/bom/graph.ts (GraphStore, GraphNodeData)
 *
 * selectedNodeId が null のとき何も表示しない（空白）。
 * selectedNodeId が設定されているとき、対応するノードの name・description を表示する。
 *
 * props DI: selectedNodeId / nodes を props で受け取る。
 * 省略時は useGraphStore からフォールバックする。
 */
export const NodeProperty = ({
    selectedNodeId: selectedNodeIdProp,
    nodes: nodesProp,
}: NodePropertyProps = {}) => {
    const storeSelectedNodeId = useGraphStore((s) => s.selectedNodeId)
    const storeNodes = useGraphStore((s) => s.nodes)

    const selectedNodeId = selectedNodeIdProp ?? storeSelectedNodeId
    const nodes = nodesProp ?? storeNodes

    if (!selectedNodeId) return null

    const node = nodes.find((n) => n.id === selectedNodeId)
    if (!node) return null

    const { label, description } = node.data

    return (
        <div className="flex flex-col gap-3 p-3">
            <div className="flex flex-col gap-1">
                <span className="text-[10px] font-mono tracking-widest uppercase text-[--muted-foreground]">
                    name
                </span>
                <div className="text-xs font-mono text-[--foreground] break-all">
                    {label}
                </div>
            </div>
            {description && (
                <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-mono tracking-widest uppercase text-[--muted-foreground]">
                        description
                    </span>
                    <div className="text-xs font-mono text-[--foreground] break-all whitespace-pre-wrap">
                        {description}
                    </div>
                </div>
            )}
        </div>
    )
}