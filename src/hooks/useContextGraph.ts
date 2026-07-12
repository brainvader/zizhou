import { useCallback, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { toast } from 'sonner'
import {
    toContextGraph,
    sidebarItemsFromExtracted,
    toContextSummaryNodes,
    type ExtractResult,
} from '@/bom/extracted-graph'
import type { ContextGraphNode, ContextGraphEdge } from '@/bom/context-graph'
import type { ContextSidebarItem } from '@/bom/workspace'

type ExtractContextGraphFn = (rootPath: string) => Promise<ExtractResult>

/**
 * デフォルトのinvokeラッパー。モジュールスコープの定数にすることで参照を安定させる。
 * useContextGraph() の引数省略時にインライン関数リテラルを渡すと、呼び出しごとに
 * 新しい関数として評価され、それに依存する extractContextGraph（useCallback）の
 * 参照も毎レンダー変わってしまい、それを依存配列に含む呼び出し側のuseEffectが
 * 無限に再発火する（既知の制約: useEffectの依存配列に毎レンダー変わる値を入れない）。
 */
const defaultExtractContextGraph: ExtractContextGraphFn = (rootPath) =>
    invoke('extract_context_graph', { rootPath })

export type UseContextGraphReturn = {
    nodes: ContextGraphNode[]
    edges: ContextGraphEdge[]
    sidebarItems: ContextSidebarItem[]
    /** Contextsセクション用。data-contextごとに集約した1ノード（criteria checklist付き） */
    contextNodes: ContextGraphNode[]
    isLoading: boolean
    error: string | null
    extractContextGraph: (rootPath: string) => Promise<void>
}

/**
 * useContextGraph
 * `.zizhou/context/*.html` を extract_context_graph（Tauriコマンド）で抽出し、
 * toContextGraph() で ContextGraphNode[]/ContextGraphEdge[]（UIセクション用の構造グラフ）に、
 * sidebarItemsFromExtracted() で ContextSidebarItem[] に、
 * toContextSummaryNodes() で contextNodes（Contextsセクション用の集約ノード）に
 * 変換して保持する hook。
 *
 * 発火タイミングはこの hook の責務外。呼び出し側（WorkspaceRoute）が
 * .zizhou/context の存在確認後に extractContextGraph(rootPath) を呼ぶ。
 * sidebarItems をサイドバーの静的contextsセクションとどうマージするかも
 * 呼び出し側の責務（この hook は抽出結果由来のui項目のみを返す）。
 *
 * @see src/bom/extracted-graph.ts toContextGraph, sidebarItemsFromExtracted, toContextSummaryNodes
 * @see src-tauri/src/services/context_extractor.rs extract_context_graph
 */
export function useContextGraph(
    onExtractContextGraph: ExtractContextGraphFn = defaultExtractContextGraph,
): UseContextGraphReturn {
    const [nodes, setNodes] = useState<ContextGraphNode[]>([])
    const [edges, setEdges] = useState<ContextGraphEdge[]>([])
    const [sidebarItems, setSidebarItems] = useState<ContextSidebarItem[]>([])
    const [contextNodes, setContextNodes] = useState<ContextGraphNode[]>([])
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
                setSidebarItems(sidebarItemsFromExtracted(result))
                setContextNodes(toContextSummaryNodes(result))
            } catch {
                setNodes([])
                setEdges([])
                setSidebarItems([])
                setContextNodes([])
                setError('コンテキストグラフの抽出に失敗しました')
                toast.error('コンテキストグラフの抽出に失敗しました')
            } finally {
                setIsLoading(false)
            }
        },
        [onExtractContextGraph],
    )

    return { nodes, edges, sidebarItems, contextNodes, isLoading, error, extractContextGraph }
}