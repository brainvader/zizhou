import { useEffect, useRef, useCallback } from 'react'
import { toast } from 'sonner'
import { useGraphStore } from '@/store/useGraphStore'
import { useProjectDetailStore } from '@/store/useProjectDetailStore'
import { GraphFileSchema } from '@/bom/graph'

/**
 * module スコープの hydration フラグ。
 */
let hydrated = false

/**
 * useGraphFile
 *
 * @deprecated SurrealDB 移行により将来廃止予定。
 *             現在は projectRootPath を使用しない暫定実装。
 *             activeGraphId が設定されている場合のみ保存を試みる。
 *
 * @see docs/bom/graph.ts GraphStore / GraphFile
 */
export const useGraphFile = () => {
    const saving = useRef(false)
    const pendingNodes = useRef<ReturnType<typeof useGraphStore.getState>['nodes'] | null>(null)
    const pendingEdges = useRef<ReturnType<typeof useGraphStore.getState>['edges'] | null>(null)

    useEffect(() => {
        hydrated = false
    }, [])

    const setHydrated = useCallback((value: boolean) => {
        hydrated = value
    }, [])

    const saveGraph = useCallback(async (
        nodes: ReturnType<typeof useGraphStore.getState>['nodes'],
        edges: ReturnType<typeof useGraphStore.getState>['edges'],
    ): Promise<void> => {
        if (!hydrated) return
        const { activeGraphId } = useProjectDetailStore.getState()
        if (!activeGraphId) return

        if (saving.current) {
            pendingNodes.current = nodes
            pendingEdges.current = edges
            return
        }

        saving.current = true
        try {
            // TODO: SurrealDB 移行後は invoke('save_graph', { graphId, nodes, edges }) に置き換える
            const graphFile = GraphFileSchema.parse({ id: activeGraphId, nodes, edges })
            // projectRootPath が不要になるまでの暫定: 保存をスキップ
            void graphFile
        } catch {
            toast.error('グラフの保存に失敗しました')
        } finally {
            saving.current = false
            if (pendingNodes.current !== null && pendingEdges.current !== null) {
                const n = pendingNodes.current
                const e = pendingEdges.current
                pendingNodes.current = null
                pendingEdges.current = null
                saveGraph(n, e)
            }
        }
    }, [])

    useEffect(() => {
        const unsubscribe = useGraphStore.subscribe((state) => {
            saveGraph(state.nodes, state.edges)
        })
        return () => unsubscribe()
    }, [saveGraph])

    return { setHydrated, saveGraph }
}