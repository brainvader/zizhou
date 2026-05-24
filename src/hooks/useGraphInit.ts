import { useEffect } from 'react'
import { readTextFile } from '@tauri-apps/plugin-fs'
import { useProjectDetailStore } from '@/store/useProjectDetailStore'
import { useGraphStore } from '@/store/useGraphStore'
import { graphFilePath, GraphFileSchema } from '@/bom/graph'
import type { InitStatus, GraphFile } from '@/bom/graph'

type ReadTextFileFn = (path: string) => Promise<string>
type ExistsFn = (path: string) => Promise<boolean>

export type UseGraphInitOptions = {
    projectRootPath?: string
    activeGraphId?: string | null
    initStatus?: InitStatus
    onSetInitStatus?: (status: InitStatus) => void
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
    initStatus: initStatusProp,
    onSetInitStatus,
    onLoadGraph,
    onResetGraph,
    onExists,
    onReadTextFile = readTextFile,
    setHydrated: setHydratedProp,
}: UseGraphInitOptions = {}): UseGraphInitReturn {
    const storeProjectRootPath = useProjectDetailStore((s) => s.projectRootPath)
    const storeActiveGraphId = useProjectDetailStore((s) => s.activeGraphId)
    const storeInitStatus = useProjectDetailStore((s) => s.initStatus)
    const storeSetInitStatus = useProjectDetailStore((s) => s.setInitStatus)
    const storeLoadGraph = useGraphStore((s) => s.loadGraph)
    const storeResetGraph = useGraphStore((s) => s.resetGraph)

    const projectRootPath = projectRootPathProp ?? storeProjectRootPath
    const activeGraphId = activeGraphIdProp ?? storeActiveGraphId
    const initStatus = initStatusProp ?? storeInitStatus
    const setInitStatus = onSetInitStatus ?? storeSetInitStatus
    const loadGraph = onLoadGraph ?? storeLoadGraph
    const resetGraph = onResetGraph ?? storeResetGraph

    // useGraphFile は GraphEditor 側でインスタンス化する。
    // useGraphInit 内で呼ぶと subscribe が2重登録されるため、
    // setHydrated は必ず外から渡す。渡されない場合は no-op。
    const setHydrated = setHydratedProp ?? (() => { })

    // --- 1. Init Check: projectRootPath が設定されたら即 'ready' ---
    useEffect(() => {
        if (!projectRootPath) return
        setInitStatus('ready')
    }, [projectRootPath, setInitStatus])

    // --- 2. Load Graph ---
    useEffect(() => {
        if (initStatus !== 'ready' || !activeGraphId || !projectRootPath) {
            setHydrated(false)
            return
        }

        const loadAndHydrate = async () => {
            setHydrated(false)
            try {
                const filePath = graphFilePath(projectRootPath, activeGraphId)
                const exists = onExists ?? ((await import('@tauri-apps/plugin-fs')).exists)
                const fileExists = await exists(filePath)
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

        loadAndHydrate()
    }, [activeGraphId, initStatus, projectRootPath, loadGraph, resetGraph, setHydrated, onExists, onReadTextFile])
}