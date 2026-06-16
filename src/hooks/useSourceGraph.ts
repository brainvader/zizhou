import { useState, useCallback, useEffect, useMemo } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { toast } from 'sonner'
import type { Node } from '@xyflow/react'
import type { SourceGraph } from '@/bom/source-graph'
import { isTestFile } from '@/bom/source-graph'
import { useProjectDetailStore } from '@/store/useProjectDetailStore'

/**
 * useSourceGraph
 *
 * SourceGraph の取得・解析・位置保存を担うフック。
 *
 * 責務:
 *   - マウント時に get_structure_graph / get_changed_files / analyze_tests を実行
 *   - analyzedFiles / staleFiles を派生 state として算出
 *   - handleFileClick / handleReanalyzeSelected / handleReanalyzeAll を提供
 *   - handleSourceNodesChange でノード位置を save_graph に永続化
 *
 * @param projectId プロジェクト ID
 * @param rootPath  プロジェクトルートパス（get_changed_files に使用）
 * @context CTX-20, CTX-22
 */
export function useSourceGraph(projectId: string, rootPath: string | undefined) {
    const [structureGraph, setStructureGraph] = useState<SourceGraph | null>(null)
    const [changedFiles, setChangedFiles] = useState<string[]>([])
    const [isAnalyzing, setIsAnalyzing] = useState(false)

    // [CTX-22] selectedTestFilePath を Zustand で管理（ページ内遷移でキャッシュ）
    const selectedFilePath = useProjectDetailStore((s) => s.selectedTestFilePath)
    const setSelectedFilePath = useProjectDetailStore((s) => s.setSelectedTestFilePath)

    const refreshStructure = useCallback(async () => {
        try {
            const graph = await invoke<SourceGraph>('get_structure_graph', { projectId })
            setStructureGraph(graph)
        } catch (e) {
            console.error('get_structure_graph failed', e)
        }
    }, [projectId])

    const refreshChangedFiles = useCallback(async () => {
        if (!rootPath) {
            setChangedFiles([])
            return
        }
        try {
            const files = await invoke<string[]>('get_changed_files', { rootPath })
            setChangedFiles(files)
        } catch (e) {
            console.warn('get_changed_files failed', e)
            setChangedFiles([])
        }
    }, [rootPath])

    useEffect(() => {
        const init = async () => {
            await refreshStructure()
            await refreshChangedFiles()
            try {
                await invoke('analyze_tests', { projectId })
                await refreshStructure()
            } catch (e) {
                console.warn('analyze_tests failed', e)
            }
        }
        init()
    }, [refreshStructure, refreshChangedFiles, projectId])

    const analyzedFiles = useMemo<ReadonlySet<string>>(() => {
        if (!structureGraph) return new Set()
        return new Set(
            structureGraph.nodes
                .map((n) => n.data?.filePath)
                .filter((p): p is string => !!p),
        )
    }, [structureGraph])

    const staleFiles = useMemo<ReadonlySet<string>>(
        () => new Set(changedFiles.filter((f) => analyzedFiles.has(f))),
        [changedFiles, analyzedFiles],
    )

    const handleFileClick = useCallback(
        async (filePath: string) => {
            // [CTX-22] TaaC: テストファイル以外は SourceGraph を更新しない
            setSelectedFilePath(filePath)
            if (!isTestFile(filePath)) return
            if (analyzedFiles.has(filePath)) return
            setIsAnalyzing(true)
            try {
                await invoke('analyze_file', { projectId, filePath })
                await refreshStructure()
                await refreshChangedFiles()
            } catch (e) {
                toast.error(`解析に失敗: ${String(e)}`)
            } finally {
                setIsAnalyzing(false)
            }
        },
        [projectId, analyzedFiles, refreshStructure, refreshChangedFiles],
    )

    const handleReanalyzeSelected = useCallback(async () => {
        if (!selectedFilePath) return
        setIsAnalyzing(true)
        try {
            await invoke('analyze_file', { projectId, filePath: selectedFilePath })
            await refreshStructure()
            await refreshChangedFiles()
            toast.success(`Reanalyzed: ${selectedFilePath}`)
        } catch (e) {
            toast.error(`再解析に失敗: ${String(e)}`)
        } finally {
            setIsAnalyzing(false)
        }
    }, [projectId, selectedFilePath, refreshStructure, refreshChangedFiles])

    const handleReanalyzeAll = useCallback(async () => {
        setIsAnalyzing(true)
        try {
            await invoke('analyze_project', { projectId })
            await invoke('analyze_tests', { projectId })
            await refreshStructure()
            await refreshChangedFiles()
            toast.success('Project reanalyzed')
        } catch (e) {
            toast.error(`一括解析に失敗: ${String(e)}`)
        } finally {
            setIsAnalyzing(false)
        }
    }, [projectId, refreshStructure, refreshChangedFiles])

    const handleSourceNodesChange = useCallback(
        async (nodes: Node[]) => {
            if (!structureGraph) return
            try {
                await invoke('save_graph', {
                    graphId: structureGraph.id,
                    nodes,
                    edges: structureGraph.edges,
                })
            } catch (e) {
                console.error('save_graph failed', e)
            }
        },
        [structureGraph],
    )

    return {
        structureGraph,
        selectedFilePath,
        setSelectedFilePath,
        analyzedFiles,
        staleFiles,
        isAnalyzing,
        handleFileClick,
        handleReanalyzeSelected,
        handleReanalyzeAll,
        handleSourceNodesChange,
    }
}