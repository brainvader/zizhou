import type { Node, NodeProps } from '@xyflow/react'
import type { FeatureNodeData } from '@/bom/context-graph'
import { GraphNodeCard } from './GraphNodeCard'

export type FeatureNodeType = Node<FeatureNodeData, 'feature'>

/**
 * FeatureNode
 * kind: 'feature' の React Flow CustomNode（checklist持ち）。見た目は GraphNodeCard に委譲する。
 *
 * @see src/components/GraphNodeCard.tsx
 * @see src/bom/context-graph.ts
 */
export function FeatureNode({ data }: NodeProps<FeatureNodeType>) {
    return <GraphNodeCard data={data} />
}
