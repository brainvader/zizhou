import { Handle, Position } from '@xyflow/react'

const SIDES = [
    { position: Position.Top, id: 'top' },
    { position: Position.Right, id: 'right' },
    { position: Position.Bottom, id: 'bottom' },
    { position: Position.Left, id: 'left' },
] as const

/**
 * GraphNodeHandles
 * 上下左右4方向すべてに source/target の Handle を配置する。
 * どの方向を実際に使うかは接続先ノードとの相対位置から toReactFlowEdges 側が自動選択する
 * （pickHandleIds、id は 'top' | 'right' | 'bottom' | 'left'）。
 * 見た目には出さない（接続のドラッグ操作自体は現状オフのため、視覚的な意味を持たない）。
 *
 * @see src/bom/graph-editor.ts (pickHandleIds)
 */
export function GraphNodeHandles() {
    return (
        <>
            {SIDES.map(({ position, id }) => (
                <Handle
                    key={`target-${id}`}
                    type="target"
                    position={position}
                    id={id}
                    className="opacity-0 pointer-events-none"
                />
            ))}
            {SIDES.map(({ position, id }) => (
                <Handle
                    key={`source-${id}`}
                    type="source"
                    position={position}
                    id={id}
                    className="opacity-0 pointer-events-none"
                />
            ))}
        </>
    )
}
