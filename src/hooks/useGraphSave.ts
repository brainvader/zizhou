import { useEffect, useRef, useCallback } from 'react'
import { toast } from 'sonner'
import { useGraphStore } from '@/store/useGraphStore'
import { useProjectDetailStore } from '@/store/useProjectDetailStore'
import { defaultGraphStorage } from '@/services/GraphStorage'
import type { Node, Edge } from '@xyflow/react'
import type {
    GraphNodeData,
    UseGraphSaveOptions,
    UseGraphSaveReturn,
} from '@/bom/graph'

/**
 * useGraphSave
 *
 * Zustand GraphStore を subscribe し、nodes / edges が変化するたびに
 * GraphStorage.saveGraph を呼んで SurrealDB に自動保存する hook。
 *
 * - setHydrated(true) が呼ばれるまで保存をスキップする
 * - activeGraphId が null の場合は保存をスキップする
 * - 保存中に変化があった場合は pending に積んで保存完了後に再実行する
 * - 保存失敗時は toast.error() で通知する（store にエラー状態は持たない）
 *
 * Position フラット化 / null 正規化は GraphStorage 内で行う。
 *
 * props DI:
 * - storage:     Pick<GraphStorage, 'saveGraph'> を差し替える（テスト・Storybook）
 * - setHydrated: 外部から hydration フラグを注入する（GraphEditor 経由）
 *
 * @context CTX-15 → CTX-21 改訂（onSaveGraph を storage 経由に統合）
 * @bom     docs/bom/graph.ts UseGraphSaveOptions / UseGraphSaveReturn
 */
export function useGraphSave({
    storage,
    setHydrated: setHydratedProp,
}: UseGraphSaveOptions = {}): UseGraphSaveReturn {
    const hydrated = useRef(false)
    const saving = useRef(false)
    const pendingNodes = useRef<Node<GraphNodeData>[] | null>(null)
    const pendingEdges = useRef<Edge[] | null>(null)

    useEffect(() => {
        hydrated.current = false
    }, [])

    const setHydrated = useCallback(
        (value: boolean) => {
            hydrated.current = value
            if (setHydratedProp) setHydratedProp(value)
        },
        [setHydratedProp]
    )

    const saveGraphRemote = storage?.saveGraph ?? defaultGraphStorage.saveGraph

    const saveGraph = useCallback(
        async (nodes: Node<GraphNodeData>[], edges: Edge[]): Promise<void> => {
            if (!hydrated.current) return
            const { activeGraphId } = useProjectDetailStore.getState()
            if (!activeGraphId) return

            if (saving.current) {
                pendingNodes.current = nodes
                pendingEdges.current = edges
                return
            }

            saving.current = true
            try {
                await saveGraphRemote(activeGraphId, nodes, edges)
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
        },
        [saveGraphRemote]
    )

    useEffect(() => {
        const unsubscribe = useGraphStore.subscribe((state) => {
            saveGraph(state.nodes, state.edges)
        })
        return () => unsubscribe()
    }, [saveGraph])

    return { setHydrated, saveGraph }
}