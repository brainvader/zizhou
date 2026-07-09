import type { Node, NodeProps } from '@xyflow/react'
import type { StateNodeData } from '@/bom/context-graph'
import { GraphNodeCard } from './GraphNodeCard'

export type StateNodeType = Node<StateNodeData, 'state'>

/**
 * StateNode
 * kind: 'state' の React Flow CustomNode。見た目は GraphNodeCard に委譲する。
 *
 * @see src/components/GraphNodeCard.tsx
 * @see src/bom/context-graph.ts
 */
export function StateNode({ data }: NodeProps<StateNodeType>) {
    return <GraphNodeCard data={data} />
}
