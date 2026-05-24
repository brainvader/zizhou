import { useEffect, useRef, useCallback } from 'react'
import { writeTextFile } from '@tauri-apps/plugin-fs'
import { toast } from 'sonner'
import { useGraphStore } from '@/store/useGraphStore'
import { useProjectDetailStore } from '@/store/useProjectDetailStore'
import { GraphFileSchema } from '@/bom/graph'

/**
 * module スコープの hydration フラグ。
 * useGraphFile は複数箇所でインスタンス化されるため、
 * useRef ではなく module 変数で共有する。
 * （useGraphInit と GraphEditor で別インスタンスになる問題を回避）
 *
 * マウント時に false にリセットする。
 * ページリロード後もモジュールが再評価されないため、
 * useEffect で明示的にリセットしないと前回の true が残る。
 */
let hydrated = false

/**
 * useGraphFile
 * Tauri fs を使ったグラフ JSON の永続化 hook。
 *
 * [永続化] useGraphStore の nodes[], edges[] を subscribe で監視し、
 *     変化があるたびに {projectRootPath}/graphs/{activeGraphId}.json に保存する。
 *
 *     - hydrated が false の間は保存しない
 *       （GraphEditor が loadGraph を完了するまで待機）。
 *     - saving.current が true の間は最新状態を pending に記憶し、
 *       保存完了後に再実行する（Race Condition 対策）。
 *     - activeGraphId / projectRootPath が未設定の場合は保存しない。
 *     - エラーは toast.error() で通知する（Store にエラー状態は持たない）。
 *
 * @see docs/bom/graph.ts GraphStore / GraphFile
 */
export const useGraphFile = () => {
    const saving = useRef(false)
    const pendingNodes = useRef<ReturnType<typeof useGraphStore.getState>['nodes'] | null>(null)
    const pendingEdges = useRef<ReturnType<typeof useGraphStore.getState>['edges'] | null>(null)

    // マウント時に hydrated をリセットする。
    // ページリロードでモジュールが再評価されないため明示的にリセットが必要。
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
        const { activeGraphId, projectRootPath } = useProjectDetailStore.getState()
        if (!activeGraphId || !projectRootPath) return

        if (saving.current) {
            // 保存中は最新の状態を pending に記憶する
            pendingNodes.current = nodes
            pendingEdges.current = edges
            return
        }

        saving.current = true
        try {
            const graphFile = GraphFileSchema.parse({ id: activeGraphId, nodes, edges })
            const filePath = `${projectRootPath}/graphs/${activeGraphId}.json`
            await writeTextFile(filePath, JSON.stringify(graphFile, null, 2))
        } catch {
            toast.error('グラフの保存に失敗しました')
        } finally {
            saving.current = false
            // pending があれば保存完了後に最新状態で再実行
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