import type { Node, NodeProps } from '@xyflow/react'
import type { FeatureNodeData } from '@/bom/context-graph'
import { GraphNodeCard } from './GraphNodeCard'
import { GraphNodeHandles } from './GraphNodeHandles'

export type FeatureNodeType = Node<FeatureNodeData, 'feature'>

/**
 * FeatureNode
 * kind: 'feature' の React Flow CustomNode（checklist持ち）。見た目は GraphNodeCard に委譲する。
 * Handle（接続点、上下左右4方向）は GraphNodeHandles が描画する。
 *
 * @see src/components/GraphNodeCard.tsx
 * @see src/components/GraphNodeHandles.tsx
 * @see src/bom/context-graph.ts
 */
export function FeatureNode({ data, selected }: NodeProps<FeatureNodeType>) {
    return (
        <>
            <GraphNodeHandles />
            <GraphNodeCard data={data} selected={selected} />
        </>
    )
}
