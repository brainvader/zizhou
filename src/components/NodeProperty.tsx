import { useState, useEffect } from 'react'
import type { Node } from '@xyflow/react'
import { z } from 'zod'
import type { GraphNodeData } from '@/bom/graph'
import { useGraphStore } from '@/store/useGraphStore'

// Zod バリデーション: label は最低1文字必要
const LabelSchema = z.string().min(1)

type NodePropertyProps = {
    selectedNodeId?: string | null
    nodes?: Node<GraphNodeData>[]
    // props DI: 省略時は store.updateNodeData() に直接 commit する
    onUpdateNode?: (id: string, data: Partial<GraphNodeData>) => void
}

/**
 * @context  CTX-4 / NodeProperty — 編集フォーム
 * @bom      docs/bom/graph.ts (GraphStore, GraphNodeData)
 *
 * selectedNodeId が null のとき何も表示しない（空白）。
 * selectedNodeId が設定されているとき、label / description を編集フォームで表示する。
 *
 * - label   → <input type="text">  / blur で commit / 空文字は Zod min(1) で弾く
 * - description → <textarea>       / blur で commit
 * - selectedNodeId が変わるたびにフォームを store の値で reset する
 * - onUpdateNode: 確定時に呼ぶコールバック prop（props DI）
 *                 省略時は store.updateNodeData() に直接 commit する
 */
export const NodeProperty = ({
    selectedNodeId: selectedNodeIdProp,
    nodes: nodesProp,
    onUpdateNode,
}: NodePropertyProps = {}) => {
    const storeSelectedNodeId = useGraphStore((s) => s.selectedNodeId)
    const storeNodes = useGraphStore((s) => s.nodes)
    const storeUpdateNodeData = useGraphStore((s) => s.updateNodeData)

    const selectedNodeId = selectedNodeIdProp ?? storeSelectedNodeId
    const nodes = nodesProp ?? storeNodes
    const commitUpdate = onUpdateNode ?? storeUpdateNodeData

    const node = selectedNodeId ? nodes.find((n) => n.id === selectedNodeId) : null

    const [labelDraft, setLabelDraft] = useState(node?.data.label ?? '')
    const [descriptionDraft, setDescriptionDraft] = useState(node?.data.description ?? '')
    const [labelError, setLabelError] = useState(false)

    // selectedNodeId が変わるたびにフォームを store の値で reset する
    useEffect(() => {
        setLabelDraft(node?.data.label ?? '')
        setDescriptionDraft(node?.data.description ?? '')
        setLabelError(false)
    }, [selectedNodeId, node?.data.label, node?.data.description])

    if (!selectedNodeId || !node) return null

    const handleLabelBlur = () => {
        const result = LabelSchema.safeParse(labelDraft)
        if (!result.success) {
            setLabelError(true)
            return
        }
        setLabelError(false)
        commitUpdate(selectedNodeId, { label: labelDraft })
    }

    const handleDescriptionBlur = () => {
        commitUpdate(selectedNodeId, { description: descriptionDraft })
    }

    return (
        <div data-testid="node-property" className="flex flex-col gap-3 p-3">
            {/* label フィールド */}
            <div className="flex flex-col gap-1">
                <span className="text-[10px] font-mono tracking-widest uppercase text-[--muted-foreground]">
                    name
                </span>
                <input
                    data-testid="input-label"
                    type="text"
                    value={labelDraft}
                    onChange={(e) => {
                        setLabelDraft(e.target.value)
                        if (labelError) setLabelError(false)
                    }}
                    onBlur={handleLabelBlur}
                    className="text-xs font-mono bg-transparent border border-[--border] rounded px-2 py-1 text-[--foreground] focus:outline-none focus:border-[--ring]"
                />
                {labelError && (
                    <span
                        data-testid="error-label"
                        className="text-[10px] font-mono text-[--destructive]"
                    >
                        name は必須です
                    </span>
                )}
            </div>

            {/* description フィールド */}
            <div className="flex flex-col gap-1">
                <span className="text-[10px] font-mono tracking-widest uppercase text-[--muted-foreground]">
                    description
                </span>
                <textarea
                    data-testid="input-description"
                    value={descriptionDraft}
                    onChange={(e) => setDescriptionDraft(e.target.value)}
                    onBlur={handleDescriptionBlur}
                    rows={4}
                    className="text-xs font-mono bg-transparent border border-[--border] rounded px-2 py-1 text-[--foreground] focus:outline-none focus:border-[--ring] resize-none whitespace-pre-wrap"
                />
            </div>
        </div>
    )
}