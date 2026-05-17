import { useState, useEffect } from 'react'
import type { Node } from '@xyflow/react'
import { z } from 'zod'
import type { GraphNodeData } from '@/bom/graph'
import { useGraphStore } from '@/store/useGraphStore'

const LabelSchema = z.string().min(1)

type NodePropertyProps = {
    selectedNodeId?: string | null
    // [CTX-5] Visibility Guard 用。省略時は store.selectedNodeIds を使用する。
    selectedNodeIds?: string[]
    nodes?: Node<GraphNodeData>[]
    onUpdateNode?: (id: string, data: Partial<GraphNodeData>) => void
}

/**
 * @context  CTX-3/4/5 / NodeProperty — 編集フォーム
 * @bom      docs/bom/graph.ts (GraphStore, GraphNodeData)
 *
 * [CTX-5] Visibility Guard:
 *   selectedNodeIds.length !== 1 のとき（未選択・複数選択）は null を返す。
 *   単一選択時のみフォームを表示・編集可能にする。
 *
 * - label   → <input type="text">  / blur で commit / 空文字は Zod min(1) で弾く
 * - description → <textarea>       / blur で commit
 * - selectedNodeId が変わるたびにフォームを store の値で reset する
 * - onUpdateNode: 省略時は store.updateNodeData() に直接 commit する（props DI）
 */
export const NodeProperty = ({
    selectedNodeId: selectedNodeIdProp,
    selectedNodeIds: selectedNodeIdsProp,
    nodes: nodesProp,
    onUpdateNode,
}: NodePropertyProps = {}) => {
    const storeSelectedNodeId = useGraphStore((s) => s.selectedNodeId)
    const storeSelectedNodeIds = useGraphStore((s) => s.selectedNodeIds)
    const storeNodes = useGraphStore((s) => s.nodes)
    const storeUpdateNodeData = useGraphStore((s) => s.updateNodeData)

    const selectedNodeId = selectedNodeIdProp ?? storeSelectedNodeId
    const selectedNodeIds = selectedNodeIdsProp ?? storeSelectedNodeIds
    const nodes = nodesProp ?? storeNodes
    const commitUpdate = onUpdateNode ?? storeUpdateNodeData

    const node = selectedNodeId ? nodes.find((n) => n.id === selectedNodeId) : null

    const [labelDraft, setLabelDraft] = useState(node?.data.label ?? '')
    const [descriptionDraft, setDescriptionDraft] = useState(node?.data.description ?? '')
    const [labelError, setLabelError] = useState(false)

    useEffect(() => {
        setLabelDraft(node?.data.label ?? '')
        setDescriptionDraft(node?.data.description ?? '')
        setLabelError(false)
    }, [selectedNodeId]) // eslint-disable-line react-hooks/exhaustive-deps

    // [CTX-5] Visibility Guard: 単一選択以外は非表示
    if (selectedNodeIds.length !== 1) return null

    if (!node) return null

    const handleLabelBlur = () => {
        const result = LabelSchema.safeParse(labelDraft)
        if (!result.success) {
            setLabelError(true)
            return
        }
        setLabelError(false)
        commitUpdate(node.id, { label: labelDraft })
    }

    const handleDescriptionBlur = () => {
        commitUpdate(node.id, { description: descriptionDraft })
    }

    return (
        <div data-testid="node-property">
            <div>
                <label>name</label>
                <input
                    data-testid="input-label"
                    type="text"
                    value={labelDraft}
                    onChange={(e) => setLabelDraft(e.target.value)}
                    onBlur={handleLabelBlur}
                />
                {labelError && (
                    <span data-testid="error-label">name は必須です</span>
                )}
            </div>
            <div>
                <label>description</label>
                <textarea
                    data-testid="input-description"
                    value={descriptionDraft}
                    onChange={(e) => setDescriptionDraft(e.target.value)}
                    onBlur={handleDescriptionBlur}
                />
            </div>
        </div>
    )
}