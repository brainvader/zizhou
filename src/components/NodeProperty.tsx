import { useGraphStore } from '@/store/useGraphStore'

/**
 * @context  CTX-3 / NodeProperty
 * @bom      docs/bom/graph.ts (GraphStore, GraphNodeData)
 *
 * selectedNodeId が null のとき何も表示しない（空白）。
 * selectedNodeId が設定されているとき、対応するノードの name・description を表示する。
 */
export const NodeProperty = () => {
    const selectedNodeId = useGraphStore((s) => s.selectedNodeId)
    const nodes = useGraphStore((s) => s.nodes)

    if (!selectedNodeId) return null

    const node = nodes.find((n) => n.id === selectedNodeId)
    if (!node) return null

    const { label, description } = node.data

    return (
        <div className="flex flex-col gap-3 p-3">
            {/* name フィールド */}
            <div className="flex flex-col gap-1">
                <span className="text-[10px] font-mono tracking-widest uppercase text-[--muted-foreground]">
                    name
                </span>
                <div className="text-xs font-mono text-[--foreground] break-all">
                    {label}
                </div>
            </div>

            {/* description フィールド（存在するときのみ） */}
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