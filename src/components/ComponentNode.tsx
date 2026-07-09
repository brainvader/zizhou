import type { Node, NodeProps } from '@xyflow/react'
import type { ComponentNodeData } from '@/bom/context-graph'
import { GraphNodeCard } from './GraphNodeCard'

export type ComponentNodeType = Node<ComponentNodeData, 'component'>

/**
 * ComponentNode
 * kind: 'component' の React Flow CustomNode。見た目は GraphNodeCard に委譲する。
 *
 * @see src/components/GraphNodeCard.tsx
 * @see src/bom/context-graph.ts
 */
export function ComponentNode({ data }: NodeProps<ComponentNodeType>) {
    return <GraphNodeCard data={data} />
}
