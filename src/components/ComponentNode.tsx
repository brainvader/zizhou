import type { Node, NodeProps } from '@xyflow/react'
import type { ComponentNodeData } from '@/bom/context-graph'
import { GraphNodeCard } from './GraphNodeCard'
import { GraphNodeHandles } from './GraphNodeHandles'

export type ComponentNodeType = Node<ComponentNodeData, 'component'>

/**
 * ComponentNode
 * kind: 'component' の React Flow CustomNode。見た目は GraphNodeCard に委譲する。
 * Handle（接続点、上下左右4方向）は GraphNodeHandles が描画する。
 *
 * @see src/components/GraphNodeCard.tsx
 * @see src/components/GraphNodeHandles.tsx
 * @see src/bom/context-graph.ts
 */
export function ComponentNode({ data, selected }: NodeProps<ComponentNodeType>) {
    return (
        <>
            <GraphNodeHandles />
            <GraphNodeCard data={data} selected={selected} />
        </>
    )
}
