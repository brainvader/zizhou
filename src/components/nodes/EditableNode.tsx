/**
 * EditableNode
 *
 * [CTX-5] Selection Highlight:
 *   selected prop（ReactFlow が自動で渡す）に応じてスタイルを切り替える。
 *
 * [CTX-7] isEditing 外部制御:
 *   isEditing は GraphEditor の editingNodeId (useState) から prop で受け取る。
 *   - ダブルクリック → onStartEditing() を呼ぶ（GraphEditor が editingNodeId をセット）
 *   - commit (Enter/blur) → updateNodeData() + onStopEditing() を呼ぶ
 *   - cancel (Escape) → onStopEditing() を呼ぶ（store 更新なし）
 *
 * [CTX-14] Run Button:
 *   service が存在するノードに "▶ Run" ボタンを表示する。
 *   - onRun?: () => void — クリック時のコールバック（GraphEditor から注入）
 *   - isRunning?: boolean — true のとき "⟳ Running…" 表示かつ非活性
 *
 * @context CTX-4/5/7/14
 * @see docs/bom/graph.ts (GraphNodeData)
 * @see docs/bom/execute.ts (ExecuteRequest, ExecuteResponse)
 * @see docs/specs/EditableNode.spec.tsx
 * @see docs/specs/node-execute.spec.tsx
 * @see src/stories/EditableNode.stories.tsx
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react'
import { useGraphStore } from '@/store/useGraphStore'
import type { GraphNodeData } from '@/bom/graph'
import { NODE_TYPE_COLOR } from '@/bom/graph'

export type EditableNodeType = Node<GraphNodeData, 'editableNode'>

export type EditableNodeProps = NodeProps<EditableNodeType> & {
    /** props DI: 省略時は store.updateNodeData() を使用する */
    onUpdateNode?: (id: string, data: Partial<GraphNodeData>) => void
    /** [CTX-7] GraphEditor の editingNodeId から渡される。true のとき inline input を表示する */
    isEditing?: boolean
    /** [CTX-7] ダブルクリック時に GraphEditor へ通知する */
    onStartEditing?: () => void
    /** [CTX-7] commit / cancel 完了時に GraphEditor へ通知する */
    onStopEditing?: () => void
    /** [CTX-14] Run ボタンクリック時のコールバック（GraphEditor から注入） */
    onRun?: () => void
    /** [CTX-14] 実行中フラグ（true のとき Running… 表示かつ非活性） */
    isRunning?: boolean
}

export function EditableNode({
    id,
    data,
    selected,
    onUpdateNode,
    isEditing = false,
    onStartEditing,
    onStopEditing,
    onRun,
    isRunning = false,
}: EditableNodeProps) {
    const storeUpdateNodeData = useGraphStore((s) => s.updateNodeData)
    const updateNodeData = onUpdateNode ?? ((nodeId, nodeData) => storeUpdateNodeData(nodeId, nodeData))

    const [draft, setDraft] = useState(data.label)
    const cancelledRef = useRef(false)

    // isEditing が true になったとき draft を現在の label で初期化する
    useEffect(() => {
        if (isEditing) {
            setDraft(data.label)
            cancelledRef.current = false
        }
    }, [isEditing, data.label])

    const commit = useCallback(() => {
        if (cancelledRef.current) return
        if (draft.trim()) {
            updateNodeData(id, { label: draft.trim() })
        }
        onStopEditing?.()
    }, [draft, id, updateNodeData, onStopEditing])

    const cancel = useCallback(() => {
        cancelledRef.current = true
        onStopEditing?.()
    }, [onStopEditing])

    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') { e.preventDefault(); commit() }
        if (e.key === 'Escape') { cancel() }
    }, [commit, cancel])

    const handleDoubleClick = useCallback(() => {
        onStartEditing?.()
    }, [onStartEditing])

    // [CTX-14] Run ボタンのクリックがノードのドラッグを開始しないよう stopPropagation
    const handleRunClick = useCallback((e: React.MouseEvent) => {
        e.stopPropagation()
        onRun?.()
    }, [onRun])

    // [CTX-5] selected に応じてボーダー・グローを切り替える
    const selectedStyle = selected
        ? 'shadow-[0_0_12px_var(--primary-glow)]'
        : ''

    const borderColor = selected
        ? 'var(--primary)'
        : NODE_TYPE_COLOR[data.nodeType ?? 'custom']

    // [CTX-14] service が存在するノードのみ Run ボタンを表示する
    const showRunButton = !!data.service

    return (
        <div
            data-testid="editable-node"
            data-status={data.status ?? 'todo'}
            className={`bg-[--card] border rounded-[--radius] px-3 py-2 min-w-35 cursor-grab ${selectedStyle}`}
            style={{ borderColor }}
            onDoubleClick={handleDoubleClick}
        >
            <Handle type="target" position={Position.Left} />

            {data.nodeType && (
                <div
                    data-testid="node-type-badge"
                    className="text-[9px] font-mono text-[--muted-foreground] pl-2 mb-0.5"
                >
                    {data.nodeType}
                </div>
            )}

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

            <input
                data-testid="node-status-checkbox"
                type="checkbox"
                className="nodrag"
                checked={data.status === 'done'}
                onChange={() => {
                    const next = data.status === 'done' ? 'todo' : 'done'
                    updateNodeData(id, { status: next })
                }}
            />

            {!isEditing && data.description && (
                <div className="text-[11px] text-[--muted-foreground] pl-2 mt-0.5">
                    {data.description}
                </div>
            )}

            {/* [CTX-14] Run Button — service 付きノードのみ表示 */}
            {showRunButton && (
                <button
                    data-testid="btn-run-node"
                    data-running={isRunning ? 'true' : undefined}
                    className={[
                        'nodrag mt-1.5 ml-1.5 px-2 py-0.5 text-[10px] font-mono rounded-[--radius] border inline-flex items-center gap-1',
                        isRunning
                            ? 'text-[--muted-foreground] border-[--border] pointer-events-none opacity-50'
                            : 'text-[--primary] border-[--primary] opacity-70 hover:opacity-100 hover:shadow-[0_0_6px_var(--primary-glow)]',
                    ].join(' ')}
                    onClick={isRunning ? undefined : handleRunClick}
                >
                    {isRunning ? '⟳ Running…' : '▶ Run'}
                </button>
            )}

            <Handle type="source" position={Position.Right} />
        </div>
    )
}