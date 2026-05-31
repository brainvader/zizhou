import { useCallback } from 'react'
import { useGraphStore } from '@/store/useGraphStore'
import { useProjectDetailStore } from '@/store/useProjectDetailStore'
import { importToGraphFile } from '@/bom/llm-export'
import type { LlmImportPayload } from '@/bom/llm-export'
import type { Node, Edge } from '@xyflow/react'
import type { GraphNodeData } from '@/bom/graph'

export type UseGraphImportOptions = {
    /**
     * props DI: インポート後の永続化処理。
     * 省略時は useGraphFile.saveGraph を直接呼ぶのではなく、
     * loadGraph で store を更新すれば useGraphFile の subscribe が自動で保存する。
     * テストでは明示的に渡して検証する。
     */
    onSaveGraph?: (nodes: Node<GraphNodeData>[], edges: Edge[]) => Promise<void>
}

export type UseGraphImportReturn = {
    importGraph: (payload: LlmImportPayload) => Promise<void>
}

/**
 * useGraphImport
 *
 * LlmImportPayload を GraphFile に変換し、store に loadGraph する。
 * loadGraph により useGraphFile の subscribe が発火して自動保存される。
 *
 * - activeGraphId が null のとき何もしない
 * - onSaveGraph が渡された場合は loadGraph 後に明示的に呼ぶ（テスト用）
 *
 * @context CTX-10
 * @see docs/bom/llm-export.ts
 * @see docs/specs/graph-export-import.spec.ts
 */
export function useGraphImport({
    onSaveGraph,
}: UseGraphImportOptions = {}): UseGraphImportReturn {
    const loadGraph = useGraphStore((s) => s.loadGraph)
    const activeGraphId = useProjectDetailStore((s) => s.activeGraphId)

    const importGraph = useCallback(async (payload: LlmImportPayload): Promise<void> => {
        if (!activeGraphId) return

        const graphFile = importToGraphFile(payload, activeGraphId)
        loadGraph(graphFile)

        if (onSaveGraph) {
            await onSaveGraph(
                graphFile.nodes as Node<GraphNodeData>[],
                graphFile.edges,
            )
        }
    }, [activeGraphId, loadGraph, onSaveGraph])

    return { importGraph }
}