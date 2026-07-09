import type { Node, NodeProps } from '@xyflow/react'
import type { HookNodeData } from '@/bom/context-graph'
import { GraphNodeCard } from './GraphNodeCard'

export type HookNodeType = Node<HookNodeData, 'hook'>

/**
 * HookNode
 * kind: 'hook' の React Flow CustomNode。見た目は GraphNodeCard に委譲する。
 *
 * @see src/components/GraphNodeCard.tsx
 * @see src/bom/context-graph.ts
 */
export function HookNode({ data }: NodeProps<HookNodeType>) {
    return <GraphNodeCard data={data} />
}
