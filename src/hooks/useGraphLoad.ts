import { useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { toast } from 'sonner'
import { useProjectDetailStore } from '@/store/useProjectDetailStore'
import { useGraphStore } from '@/store/useGraphStore'
import { GraphFileSchema } from '@/bom/graph'
import type { GraphFile, UseGraphLoadOptions } from '@/bom/graph'

/**
 * useGraphLoad
 *
 * activeGraphId が変化するたびに invoke('load_graph') を呼び、
 * SurrealDB からノード・エッジを取得して GraphStore に hydrate する hook。
 *
 * useGraphInit（Tauri fs 依存）の置き換え。
 *
 * - activeGraphId が null のとき何もしない（isDetailHydrated が true になるまで待つ）
 * - load 成功: loadGraph(graphFile) → setHydrated(true)
 * - load 失敗: resetGraph() → toast.error() → setHydrated(true)
 * - グラフが空（nodes/edges が空配列）の場合は resetGraph() を呼ばず loadGraph() で空を渡す
 *
 * props DI:
 * - onLoadGraph: テスト・Storybook で invoke を差し替える
 * - onLoadGraphFn / onResetGraph: store action を差し替える
 * - setHydrated: isDetailHydrated の setter を差し替える
 * - activeGraphId: store の値を上書きする（Storybook 用）
 *
 * @context CTX-15
 * @bom     docs/bom/graph.ts UseGraphLoadOptions
 */
export function useGraphLoad({
    onLoadGraph,
    onLoadGraphFn,
    onResetGraph,
    setHydrated: setHydratedProp,
    activeGraphId: activeGraphIdProp,
}: UseGraphLoadOptions = {}): void {
    const storeActiveGraphId = useProjectDetailStore((s) => s.activeGraphId)
    const storeIsDetailHydrated = useProjectDetailStore((s) => s.isDetailHydrated)
    const storeLoadGraph = useGraphStore((s) => s.loadGraph)
    const storeResetGraph = useGraphStore((s) => s.resetGraph)
    const storeSetDetailHydrated = useProjectDetailStore((s) => s.setDetailHydrated)

    const activeGraphId = activeGraphIdProp !== undefined ? activeGraphIdProp : storeActiveGraphId
    const loadGraphFn = onLoadGraphFn ?? storeLoadGraph
    const resetGraph = onResetGraph ?? storeResetGraph
    const setHydrated = setHydratedProp ?? storeSetDetailHydrated

    const defaultOnLoadGraph = (graphId: string): Promise<GraphFile> =>
        invoke<GraphFile>('load_graph', { graphId })

    const loadGraphRemote = onLoadGraph ?? defaultOnLoadGraph

    useEffect(() => {
        // isDetailHydrated が false（グラフ一覧未取得）のときはスキップ
        // activeGraphIdProp が明示指定された場合（Storybook / テスト）はスキップしない
        if (activeGraphIdProp === undefined && !storeIsDetailHydrated) return
        if (!activeGraphId) return

        let cancelled = false

        const load = async () => {
            setHydrated(false)
            try {
                const raw = await loadGraphRemote(activeGraphId)
                if (cancelled) return

                const result = GraphFileSchema.safeParse(raw)
                if (result.success) {
                    loadGraphFn(result.data)
                } else {
                    // パース失敗時は空グラフで続行（resetGraph は呼ばない）
                    loadGraphFn({ id: activeGraphId, nodes: [], edges: [] })
                }
            } catch {
                if (cancelled) return
                resetGraph()
                toast.error('グラフの読み込みに失敗しました')
            } finally {
                if (!cancelled) setHydrated(true)
            }
        }

        load()

        return () => {
            cancelled = true
        }
    }, [activeGraphId, storeIsDetailHydrated]) // eslint-disable-line react-hooks/exhaustive-deps
}