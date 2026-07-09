import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'
import type { ExternalNodeData } from '@/bom/context-graph'
import { GraphNodeCard } from './GraphNodeCard'

export type ExternalNodeType = Node<ExternalNodeData, 'external'>

/**
 * ExternalNode
 * kind: 'external' の React Flow CustomNode。見た目は GraphNodeCard に委譲する。
 * Handle（接続点）はここで描画する。GraphNodeCard は React Flow に依存しないため。
 *
 * @see src/components/GraphNodeCard.tsx
 * @see src/bom/context-graph.ts
 */
export function ExternalNode({ data, selected }: NodeProps<ExternalNodeType>) {
    return (
        <>
            <Handle type="target" position={Position.Top} />
            <GraphNodeCard data={data} selected={selected} />
            <Handle type="source" position={Position.Bottom} />
        </>
    )
}
