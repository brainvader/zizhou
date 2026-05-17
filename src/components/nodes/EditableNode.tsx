import { useState, useRef, useCallback } from 'react'
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react'
import { useGraphStore } from '@/store/useGraphStore'
import type { GraphNodeData } from '@/bom/graph'

// v12 の正しいカスタムノード型定義パターン:
// Node<DataType, 'nodeTypeName'> を先に定義し NodeProps に渡す
export type EditableNodeType = Node<GraphNodeData, 'editableNode'>

export type EditableNodeProps = NodeProps<EditableNodeType> & {
    // props DI: 省略時は store.updateNodeData() に直接 commit する
    onUpdateNode?: (id: string, data: Partial<GraphNodeData>) => void
}

/**
 * EditableNode
 *
 * 責務: ラベルのインライン編集が可能な ReactFlow カスタムノード。
 *
 * - 通常状態: label / description をテキスト表示する
 * - ダブルクリックで inline <input> に切り替わる
 * - Enter / blur で確定 → onUpdateNode / store.updateNodeData() に commit する
 * - Escape でキャンセル → 元の label に戻る
 * - label が空文字の場合は commit しない
 * - <input> には className="nodrag" を付与してドラッグと競合させない
 *
 * @see docs/bom/graph.ts (GraphNodeData, GraphStore.updateNodeData)
 * @see docs/specs/EditableNode.spec.tsx
 * @see src/stories/EditableNode.stories.tsx
 */
export function EditableNode({ id, data, onUpdateNode }: EditableNodeProps) {
    const storeUpdateNodeData = useGraphStore((s) => s.updateNodeData)
    const updateNodeData = onUpdateNode ?? ((nodeId, nodeData) => storeUpdateNodeData(nodeId, nodeData))

    const [isEditing, setIsEditing] = useState(false)
    const [draft, setDraft] = useState(data.label)

    // Escape キャンセル時の二重 commit を防ぐフラグ
    const cancelledRef = useRef(false)

    const startEditing = useCallback(() => {
        setDraft(data.label)
        cancelledRef.current = false
        setIsEditing(true)
    }, [data.label])

    const commit = useCallback(() => {
        if (cancelledRef.current) return
        if (draft.trim()) {
            updateNodeData(id, { label: draft.trim() })
        }
        setIsEditing(false)
    }, [draft, id, updateNodeData])

    const cancel = useCallback(() => {
        cancelledRef.current = true
        setIsEditing(false)
    }, [])

    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault()
            commit()
        }
        if (e.key === 'Escape') {
            cancel()
        }
    }, [commit, cancel])

    return (
        <div
            data-testid={`editable-node-${id}`}
            className="bg-[--card] border border-[--border] rounded-[--radius] px-3 py-2 min-w-35 cursor-grab"
            onDoubleClick={startEditing}
        >
            <Handle type="target" position={Position.Left} />

            {isEditing ? (
                <input
                    data-testid="inline-input"
                    className="nodrag bg-transparent border-none outline-none text-xs font-semibold text-[--card-foreground] w-full font-sans"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onBlur={commit}
                    onKeyDown={handleKeyDown}
                    autoFocus
                />
            ) : (
                <div className="text-xs font-semibold text-[--card-foreground] pl-2">
                    {data.label}
                </div>
            )}

            {!isEditing && data.description && (
                <div className="text-[11px] text-[--muted-foreground] pl-2 mt-0.5">
                    {data.description}
                </div>
            )}

            <Handle type="source" position={Position.Right} />
        </div>
    )
}