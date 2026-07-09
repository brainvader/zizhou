import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'
import type { ComponentNodeData } from '@/bom/context-graph'
import { GraphNodeCard } from './GraphNodeCard'

export type ComponentNodeType = Node<ComponentNodeData, 'component'>

/**
 * ComponentNode
 * kind: 'component' の React Flow CustomNode。見た目は GraphNodeCard に委譲する。
 * Handle（接続点）はここで描画する。GraphNodeCard は React Flow に依存しないため。
 *
 * @see src/components/GraphNodeCard.tsx
 * @see src/bom/context-graph.ts
 */
export function ComponentNode({ data, selected }: NodeProps<ComponentNodeType>) {
    return (
        <>
            <Handle type="target" position={Position.Top} />
            <GraphNodeCard data={data} selected={selected} />
            <Handle type="source" position={Position.Bottom} />
        </>
    )
}
