import type { Node, NodeProps } from '@xyflow/react'
import type { HookNodeData } from '@/bom/context-graph'
import { GraphNodeCard } from './GraphNodeCard'
import { GraphNodeHandles } from './GraphNodeHandles'

export type HookNodeType = Node<HookNodeData, 'hook'>

/**
 * HookNode
 * kind: 'hook' の React Flow CustomNode。見た目は GraphNodeCard に委譲する。
 * Handle（接続点、上下左右4方向）は GraphNodeHandles が描画する。
 *
 * @see src/components/GraphNodeCard.tsx
 * @see src/components/GraphNodeHandles.tsx
 * @see src/bom/context-graph.ts
 */
export function HookNode({ data, selected }: NodeProps<HookNodeType>) {
    return (
        <>
            <GraphNodeHandles />
            <GraphNodeCard data={data} selected={selected} />
        </>
    )
}
