import { useEffect } from 'react'
import { toast } from 'sonner'
import { useProjectDetailStore } from '@/store/useProjectDetailStore'
import { useGraphStore } from '@/store/useGraphStore'
import { defaultGraphStorage } from '@/services/GraphStorage'
import type { UseGraphLoadOptions } from '@/bom/graph'

/**
 * useGraphLoad
 *
 * activeGraphId が変化するたびに GraphStorage.loadGraph を呼び、
 * SurrealDB からノード・エッジを取得して GraphStore に hydrate する hook。
 *
 * - activeGraphId が null のとき何もしない（isDetailHydrated が true になるまで待つ）
 * - load 成功: loadGraph(graphFile) → setHydrated(true)
 * - load 失敗（invoke エラー or バックエンド契約違反）: resetGraph() → toast.error() → setHydrated(true)
 *
 * props DI:
 * - storage:        Pick<GraphStorage, 'loadGraph'> を差し替える（テスト・Storybook）
 * - onLoadGraphFn / onResetGraph: store action を差し替える
 * - setHydrated:    isDetailHydrated の setter を差し替える
 * - activeGraphId:  store の値を上書きする（Storybook 用）
 *
 * @context CTX-15 → CTX-21 改訂（onLoadGraph を storage 経由に統合）
 * @bom     docs/bom/graph.ts UseGraphLoadOptions
 */
export function useGraphLoad({
    storage,
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
    const loadGraphRemote = storage?.loadGraph ?? defaultGraphStorage.loadGraph

    useEffect(() => {
        // isDetailHydrated が false（グラフ一覧未取得）のときはスキップ
        // activeGraphIdProp が明示指定された場合（Storybook / テスト）はスキップしない
        if (activeGraphIdProp === undefined && !storeIsDetailHydrated) return
        if (!activeGraphId) return

        let cancelled = false

        const load = async () => {
            setHydrated(false)
            try {
                const graph = await loadGraphRemote(activeGraphId)
                if (cancelled) return
                loadGraphFn(graph)
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