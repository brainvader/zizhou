import { useEffect } from 'react'
import { readTextFile } from '@tauri-apps/plugin-fs'
import { useProjectDetailStore } from '@/store/useProjectDetailStore'
import { useGraphStore } from '@/store/useGraphStore'
import { GraphFileSchema } from '@/bom/graph'
import type { GraphFile } from '@/bom/graph'

// NOTE: このhookはTauri fs依存のグラフ読み込みを担っていたが、
//       SurrealDB移行後は useGraphLoad（invoke('load_graph') ベース）に置き換える予定。
//       現在はビルドを通すための最小修正版。

type ReadTextFileFn = (path: string) => Promise<string>
type ExistsFn = (path: string) => Promise<boolean>

export type UseGraphInitOptions = {
    projectRootPath?: string
    activeGraphId?: string | null
    onLoadGraph?: (graph: GraphFile) => void
    onResetGraph?: () => void
    onExists?: ExistsFn
    onReadTextFile?: ReadTextFileFn
    setHydrated?: (hydrated: boolean) => void
}

export type UseGraphInitReturn = void

export function useGraphInit({
    projectRootPath: projectRootPathProp,
    activeGraphId: activeGraphIdProp,
    onLoadGraph,
    onResetGraph,
    onExists,
    onReadTextFile = readTextFile,
    setHydrated: setHydratedProp,
}: UseGraphInitOptions = {}): UseGraphInitReturn {
    const storeActiveGraphId = useProjectDetailStore((s) => s.activeGraphId)
    const storeLoadGraph = useGraphStore((s) => s.loadGraph)
    const storeResetGraph = useGraphStore((s) => s.resetGraph)

    const activeGraphId = activeGraphIdProp ?? storeActiveGraphId
    const loadGraph = onLoadGraph ?? storeLoadGraph
    const resetGraph = onResetGraph ?? storeResetGraph
    const setHydrated = setHydratedProp ?? (() => { })

    // projectRootPath が未設定（SurrealDB移行後は不要）の場合は何もしない
    useEffect(() => {
        if (!projectRootPathProp || !activeGraphId) {
            setHydrated(false)
            return
        }

        const load = async () => {
            setHydrated(false)
            try {
                const filePath = `${projectRootPathProp}/graphs/${activeGraphId}.json`
                const existsFn = onExists ?? ((await import('@tauri-apps/plugin-fs')).exists)
                const fileExists = await existsFn(filePath)
                if (fileExists) {
                    const text = await onReadTextFile(filePath)
                    const result = GraphFileSchema.safeParse(JSON.parse(text))
                    if (result.success) {
                        loadGraph(result.data)
                    } else {
                        resetGraph()
                    }
                } else {
                    resetGraph()
                }
            } catch {
                resetGraph()
            } finally {
                setHydrated(true)
            }
        }

        load()
    }, [activeGraphId, projectRootPathProp, loadGraph, resetGraph, setHydrated, onExists, onReadTextFile])
}