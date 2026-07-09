import type { Node, NodeProps } from '@xyflow/react'
import type { ExternalNodeData } from '@/bom/context-graph'
import { GraphNodeCard } from './GraphNodeCard'

export type ExternalNodeType = Node<ExternalNodeData, 'external'>

/**
 * ExternalNode
 * kind: 'external' の React Flow CustomNode。見た目は GraphNodeCard に委譲する。
 *
 * @see src/components/GraphNodeCard.tsx
 * @see src/bom/context-graph.ts
 */
export function ExternalNode({ data }: NodeProps<ExternalNodeType>) {
    return <GraphNodeCard data={data} />
}
