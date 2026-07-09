import type { Node, NodeProps } from '@xyflow/react'
import type { StateNodeData } from '@/bom/context-graph'
import { GraphNodeCard } from './GraphNodeCard'
import { GraphNodeHandles } from './GraphNodeHandles'

export type StateNodeType = Node<StateNodeData, 'state'>

/**
 * StateNode
 * kind: 'state' の React Flow CustomNode。見た目は GraphNodeCard に委譲する。
 * Handle（接続点、上下左右4方向）は GraphNodeHandles が描画する。
 *
 * @see src/components/GraphNodeCard.tsx
 * @see src/components/GraphNodeHandles.tsx
 * @see src/bom/context-graph.ts
 */
export function StateNode({ data, selected }: NodeProps<StateNodeType>) {
    return (
        <>
            <GraphNodeHandles />
            <GraphNodeCard data={data} selected={selected} />
        </>
    )
}
