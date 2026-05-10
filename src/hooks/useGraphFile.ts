import { useEffect, useRef, useCallback } from 'react'
import { writeTextFile } from '@tauri-apps/plugin-fs'
import { toast } from 'sonner'
import { useGraphStore } from '@/store/useGraphStore'
import { useProjectDetailStore } from '@/store/useProjectDetailStore'
import { GraphFileSchema } from '@/bom/graph'

/**
 * useGraphFile
 * Tauri fs を使ったグラフ JSON の永続化 hook。
 *
 * [永続化] useGraphStore の nodes[], edges[] を subscribe で監視し、
 *     変化があるたびに {projectRootPath}/graphs/{activeGraphId}.json に保存する。
 *
 *     - hydrated.current が false の間は保存しない
 *       （GraphEditor が loadGraph を完了するまで待機）。
 *     - saving.current が true の間は重複保存をスキップする（Race Condition 対策）。
 *     - activeGraphId / projectRootPath が未設定の場合は保存しない。
 *     - エラーは toast.error() で通知する（Store にエラー状態は持たない）。
 *
 * [使い方]
 *     GraphEditor.tsx の useEffect で useGraphFile() を呼び出す。
 *     loadGraph() / resetGraph() 完了後に setHydrated(true) を呼んで保存を有効にする。
 *
 * saveGraph / setHydrated は useCallback でメモ化し、
 * 関数参照を固定することで useEffect の依存配列に安全に含められる。
 *
 * @see docs/bom/graph.ts GraphStore / GraphFile
 */
export const useGraphFile = () => {
    const hydrated = useRef(false)
    const saving = useRef(false)

    /**
     * setHydrated
     * loadGraph() / resetGraph() 完了後に GraphEditor から呼び出す。
     * true になるまで subscribe コールバックは保存をスキップする。
     */
    const setHydrated = useCallback((value: boolean) => {
        hydrated.current = value
    }, [])

    const saveGraph = useCallback(async (
        nodes: ReturnType<typeof useGraphStore.getState>['nodes'],
        edges: ReturnType<typeof useGraphStore.getState>['edges'],
    ): Promise<void> => {
        const { activeGraphId, projectRootPath } = useProjectDetailStore.getState()
        if (!activeGraphId || !projectRootPath) return
        if (saving.current) return

        saving.current = true
        try {
            const graphFile = GraphFileSchema.parse({ id: activeGraphId, nodes, edges })
            const filePath = `${projectRootPath}/graphs/${activeGraphId}.json`
            await writeTextFile(filePath, JSON.stringify(graphFile, null, 2))
        } catch {
            toast.error('グラフの保存に失敗しました')
        } finally {
            saving.current = false
        }
    }, [])

    useEffect(() => {
        const unsubscribe = useGraphStore.subscribe((state) => {
            if (!hydrated.current) return
            saveGraph(state.nodes, state.edges)
        })
        return () => unsubscribe()
    }, [saveGraph])

    return { setHydrated, saveGraph }
}