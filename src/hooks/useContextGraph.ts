import { useCallback, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { toast } from 'sonner'
import { toContextGraph, type ExtractResult } from '@/bom/extracted-graph'
import type { ContextGraphNode, ContextGraphEdge } from '@/bom/context-graph'

type ExtractContextGraphFn = (rootPath: string) => Promise<ExtractResult>

export type UseContextGraphReturn = {
    nodes: ContextGraphNode[]
    edges: ContextGraphEdge[]
    isLoading: boolean
    error: string | null
    extractContextGraph: (rootPath: string) => Promise<void>
}

/**
 * useContextGraph
 * `.zizhou/context/*.html` を extract_context_graph（Tauriコマンド）で抽出し、
 * toContextGraph() で ContextGraphNode[]/ContextGraphEdge[] に変換して保持する hook。
 *
 * 発火タイミングはこの hook の責務外。呼び出し側（WorkspaceRoute）が
 * .zizhou/context の存在確認後に extractContextGraph(rootPath) を呼ぶ。
 *
 * @see src/bom/extracted-graph.ts toContextGraph
 * @see src-tauri/src/services/context_extractor.rs extract_context_graph
 */
export function useContextGraph(
    onExtractContextGraph: ExtractContextGraphFn = (rootPath) =>
        invoke('extract_context_graph', { rootPath }),
): UseContextGraphReturn {
    const [nodes, setNodes] = useState<ContextGraphNode[]>([])
    const [edges, setEdges] = useState<ContextGraphEdge[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const extractContextGraph = useCallback(
        async (rootPath: string): Promise<void> => {
            setIsLoading(true)
            setError(null)
            try {
                const result = await onExtractContextGraph(rootPath)
                const { nodes, edges } = toContextGraph(result)
                setNodes(nodes)
                setEdges(edges)
            } catch {
                setNodes([])
                setEdges([])
                setError('コンテキストグラフの抽出に失敗しました')
                toast.error('コンテキストグラフの抽出に失敗しました')
            } finally {
                setIsLoading(false)
            }
        },
        [onExtractContextGraph],
    )

    return { nodes, edges, isLoading, error, extractContextGraph }
}