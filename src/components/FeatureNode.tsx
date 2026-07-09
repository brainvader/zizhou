import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'
import type { FeatureNodeData } from '@/bom/context-graph'
import { GraphNodeCard } from './GraphNodeCard'

export type FeatureNodeType = Node<FeatureNodeData, 'feature'>

/**
 * FeatureNode
 * kind: 'feature' の React Flow CustomNode（checklist持ち）。見た目は GraphNodeCard に委譲する。
 * Handle（接続点）はここで描画する。GraphNodeCard は React Flow に依存しないため。
 *
 * @see src/components/GraphNodeCard.tsx
 * @see src/bom/context-graph.ts
 */
export function FeatureNode({ data }: NodeProps<FeatureNodeType>) {
    return (
        <>
            <Handle type="target" position={Position.Top} />
            <GraphNodeCard data={data} />
            <Handle type="source" position={Position.Bottom} />
        </>
    )
}
