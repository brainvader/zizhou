import { useEffect, useRef, useCallback } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { toast } from 'sonner'
import { useGraphStore } from '@/store/useGraphStore'
import { useProjectDetailStore } from '@/store/useProjectDetailStore'
import type { Node, Edge } from '@xyflow/react'
import type { GraphNodeData, UseGraphSaveOptions, UseGraphSaveReturn } from '@/bom/graph'

/**
 * useGraphSave
 *
 * Zustand GraphStore を subscribe し、nodes / edges が変化するたびに
 * invoke('save_graph') を呼んで SurrealDB に自動保存する hook。
 *
 * useGraphFile（Tauri fs 依存）の置き換え。
 * subscribe ベースの自動保存は useGraphFile と同等の挙動を維持する。
 *
 * - setHydrated(true) が呼ばれるまで保存をスキップする
 * - activeGraphId が null の場合は保存をスキップする
 * - 保存中に変化があった場合は pending に積んで保存完了後に再実行する
 * - invoke 失敗時は toast.error() で通知する（store にエラー状態は持たない）
 *
 * フロントから invoke に渡す nodes の形状:
 *   { id, label, nodeType, status, service, provider, input, description, position_x, position_y }
 *   ※ ReactFlow Node<GraphNodeData> から position をフラット化する
 *
 * props DI:
 * - onSaveGraph: テスト・Storybook で invoke を差し替える
 * - setHydrated: 外部から hydration フラグを注入する（GraphEditor 経由）
 *
 * @context CTX-15
 * @bom     docs/bom/graph.ts UseGraphSaveOptions / UseGraphSaveReturn
 */
export function useGraphSave({
    onSaveGraph,
    setHydrated: setHydratedProp,
}: UseGraphSaveOptions = {}): UseGraphSaveReturn {
    const hydrated = useRef(false)
    const saving = useRef(false)
    const pendingNodes = useRef<Node<GraphNodeData>[] | null>(null)
    const pendingEdges = useRef<Edge[] | null>(null)

    useEffect(() => {
        hydrated.current = false
    }, [])

    const setHydrated = useCallback((value: boolean) => {
        hydrated.current = value
        if (setHydratedProp) setHydratedProp(value)
    }, [setHydratedProp])

    const defaultOnSaveGraph = useCallback(
        (graphId: string, nodes: Node<GraphNodeData>[], edges: Edge[]): Promise<void> => {
            // ReactFlow の Node<GraphNodeData> → SaveNodeInput に変換
            const saveNodes = nodes.map((n) => ({
                id: n.id,
                label: n.data.label,
                node_type: n.data.nodeType ?? null,
                status: n.data.status ?? null,
                service: n.data.service ?? null,
                provider: n.data.provider ?? null,
                input: n.data.input ?? null,
                description: n.data.description ?? null,
                position_x: n.position.x,
                position_y: n.position.y,
            }))

            const saveEdges = edges.map((e) => ({
                id: e.id,
                source: e.source,
                target: e.target,
            }))

            return invoke('save_graph', { graphId, nodes: saveNodes, edges: saveEdges })
        },
        []
    )

    const saveGraphRemote = onSaveGraph ?? defaultOnSaveGraph

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