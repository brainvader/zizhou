import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'
import type { StateNodeData } from '@/bom/context-graph'
import { GraphNodeCard } from './GraphNodeCard'

export type StateNodeType = Node<StateNodeData, 'state'>

/**
 * StateNode
 * kind: 'state' の React Flow CustomNode。見た目は GraphNodeCard に委譲する。
 * Handle（接続点）はここで描画する。GraphNodeCard は React Flow に依存しないため。
 *
 * @see src/components/GraphNodeCard.tsx
 * @see src/bom/context-graph.ts
 */
export function StateNode({ data, selected }: NodeProps<StateNodeType>) {
    return (
        <>
            <Handle type="target" position={Position.Top} />
            <GraphNodeCard data={data} selected={selected} />
            <Handle type="source" position={Position.Bottom} />
        </>
    )
}
