import { useState, useRef, useCallback } from 'react'
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react'
import { useGraphStore } from '@/store/useGraphStore'
import type { GraphNodeData } from '@/bom/graph'

export type EditableNodeType = Node<GraphNodeData, 'editableNode'>

export type EditableNodeProps = NodeProps<EditableNodeType> & {
    onUpdateNode?: (id: string, data: Partial<GraphNodeData>) => void
}

/**
 * EditableNode
 *
 * [CTX-5] Selection Highlight:
 *   selected prop（ReactFlow が自動で渡す）に応じてスタイルを切り替える。
 *   - 単一選択: vermillion border + glow
 *   - 複数選択: ReactFlow の標準 selected クラスが付与されるため追加スタイル不要だが、
 *               同じスタイルを適用して一貫性を保つ
 *
 * @see docs/bom/graph.ts (GraphNodeData)
 */
export function EditableNode({ id, data, selected, onUpdateNode }: EditableNodeProps) {
    const storeUpdateNodeData = useGraphStore((s) => s.updateNodeData)
    const updateNodeData = onUpdateNode ?? ((nodeId, nodeData) => storeUpdateNodeData(nodeId, nodeData))

    const [isEditing, setIsEditing] = useState(false)
    const [draft, setDraft] = useState(data.label)
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
        if (e.key === 'Enter') { e.preventDefault(); commit() }
        if (e.key === 'Escape') { cancel() }
    }, [commit, cancel])

    // [CTX-5] selected に応じてボーダー・グローを切り替える
    const selectedStyle = selected
        ? 'border-(--primary) shadow-[0_0_12px_var(--primary-glow)]'
        : 'border-(--border)'

    return (
        <div
            data-testid={`editable-node-${id}`}
            className={`bg-[--card] border rounded-[--radius] px-3 py-2 min-w-35 cursor-grab ${selectedStyle}`}
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