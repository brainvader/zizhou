import { useEffect, useCallback } from 'react'
import { exists, mkdir, readTextFile } from '@tauri-apps/plugin-fs'
import { useProjectDetailStore } from '@/store/useProjectDetailStore'
import { useGraphStore } from '@/store/useGraphStore'
import { useGraphFile } from '@/hooks/useGraphFile'
import { graphsDir, graphFilePath, GraphFileSchema } from '@/bom/graph'
import type { InitStatus, GraphFile } from '@/bom/graph'

// ============================================================
// Types
// ============================================================

type ExistsFn = (path: string) => Promise<boolean>
type MkdirFn = (path: string, options?: { recursive: boolean }) => Promise<void>
type ReadTextFileFn = (path: string) => Promise<string>

export type UseGraphInitOptions = {
    // store 系（省略時は Zustand からフォールバック）
    projectRootPath?: string
    activeGraphId?: string | null
    initStatus?: InitStatus
    onSetInitStatus?: (status: InitStatus) => void
    onLoadGraph?: (graph: GraphFile) => void
    onResetGraph?: () => void
    // Tauri fs 系（省略時は Tauri 実装にフォールバック）
    onExists?: ExistsFn
    onMkdir?: MkdirFn
    onReadTextFile?: ReadTextFileFn
    // 自動保存ブロック制御（省略時は useGraphFile を使用）
    setHydrated?: (hydrated: boolean) => void
}

export type UseGraphInitReturn = {
    /** graphs/ ディレクトリを作成して initStatus を 'ready' に更新する */
    handleInit: () => Promise<void>
}

/**
 * useGraphInit
 *
 * GraphEditor から切り出した初期化・ロード責務を担う hook。
 *
 * 責務:
 * 1. **Init Check** — マウント時に graphs/ の存在確認を行い initStatus を更新する
 * 2. **Load Graph** — activeGraphId 変化時にグラフファイルを読み込み store に反映する
 * 3. **Init Dir**   — handleInit() で graphs/ を作成し initStatus を 'ready' に更新する
 *
 * props DI: onExists / onMkdir / onReadTextFile を引数で受け取る。
 * 省略時は Tauri 実装にフォールバックする。
 *
 * @see docs/bom/graph.ts
 * @see src/hooks/useGraphFile.ts
 */
export function useGraphInit({
    projectRootPath: projectRootPathProp,
    activeGraphId: activeGraphIdProp,
    initStatus: initStatusProp,
    onSetInitStatus,
    onLoadGraph,
    onResetGraph,
    onExists = exists,
    onMkdir = mkdir,
    onReadTextFile = readTextFile,
    setHydrated: setHydratedProp,
}: UseGraphInitOptions = {}): UseGraphInitReturn {
    // --- store フォールバック ---
    const storeProjectRootPath = useProjectDetailStore((s) => s.projectRootPath)
    const storeActiveGraphId = useProjectDetailStore((s) => s.activeGraphId)
    const storeInitStatus = useProjectDetailStore((s) => s.initStatus)
    const storeSetInitStatus = useProjectDetailStore((s) => s.setInitStatus)
    const storeLoadGraph = useGraphStore((s) => s.loadGraph)
    const storeResetGraph = useGraphStore((s) => s.resetGraph)
    const { setHydrated: storeSetHydrated } = useGraphFile()

    const projectRootPath = projectRootPathProp ?? storeProjectRootPath
    const activeGraphId = activeGraphIdProp ?? storeActiveGraphId
    const initStatus = initStatusProp ?? storeInitStatus
    const setInitStatus = onSetInitStatus ?? storeSetInitStatus
    const loadGraph = onLoadGraph ?? storeLoadGraph
    const resetGraph = onResetGraph ?? storeResetGraph
    const setHydrated = setHydratedProp ?? storeSetHydrated

    // --- 1. Init Check ---
    const checkGraphsDir = useCallback(async () => {
        if (!projectRootPath) return
        const dir = graphsDir(projectRootPath)
        const found = await onExists(dir)
        setInitStatus(found ? 'ready' : 'uninitialized')
    }, [projectRootPath, setInitStatus, onExists])

    useEffect(() => {
        checkGraphsDir()
    }, [checkGraphsDir])

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
                const fileExists = await onExists(filePath)
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

    // --- 3. Init Dir ---
    const handleInit = useCallback(async () => {
        const dir = graphsDir(projectRootPath)
        await onMkdir(dir, { recursive: true })
        setInitStatus('ready')
    }, [projectRootPath, setInitStatus, onMkdir])

    return { handleInit }
}