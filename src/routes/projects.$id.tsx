import { useParams, useSearch, useRouter } from '@tanstack/react-router'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { toast } from 'sonner'
import { FileTree } from '@/components/FileTree'
import { SourceGraphView } from '@/components/SourceGraphView'
import { NodeProperty } from '@/components/NodeProperty'
import { ProjectDetailTopbar } from '@/components/ProjectDetailTopbar'
import { SettingsDialog } from '@/components/SettingsDialog'
import {
    ResizablePanelGroup,
    ResizablePanel,
    ResizableHandle,
} from '@/components/ui/resizable'
import { useProjectStore } from '@/store/useProjectStore'
import { useProjectDetailStore } from '@/store/useProjectDetailStore'
import { FILE_TREE_PANEL, GRAPH_EDITOR_PANEL, NODE_PROPERTY_PANEL } from '@/bom/layout'
import type { SourceGraph } from '@/bom/source-graph'
import type { SourceContext } from '@/bom/source-context'
import type { TestSuite } from '@/bom/test-analysis'
import type { GraphListItem } from '@/bom/graph'

/**
 * ProjectDetailRoute
 * "/projects/$id" ルートのコンポーネント。
 * CTX-Topbar / CTX-1 FileTree / CTX-2 GraphEditor / CTX-3 NodeProperty を組み込む。
 *
 * 3ペインは ResizablePanelGroup（shadcn/ui）で水平リサイズ可能。
 * パネルサイズの定数は docs/bom/layout.ts に集約。
 *
 * activeGraphId の SSOT は URL の ?graph= クエリパラメータ。
 *
 * [CTX-20] Project Structure Graph 統合:
 *   - マウント時に get_structure_graph / get_changed_files を取得
 *   - analyzedFiles = structureGraph.nodes[*].data.filePath の集合
 *   - staleFiles    = changedFiles ∩ analyzedFiles
 *   - FileTree ファイルクリック → 未登録なら analyze_file → リフレッシュ
 *   - 「Reanalyze All」/「Reanalyze」ボタンで明示的に再解析
 *   - selectedFilePath は File→Node ハイライトに使用。
 *     Node→File 方向は GraphEditor 改修（別 CTX）で setSelectedFilePath を呼ぶ想定。
 *
 * [CTX-22] Test Node Display:
 *   - マウント時・Reanalyze All 時に analyze_tests を呼びテストノードを登録
 *   - テストノードは nodeType='test' で SourceGraph に含まれ TestNode として描画される
 *
 * @see src/router.tsx
 * @see src/components/ProjectDetailTopbar.tsx
 * @see docs/bom/layout.ts
 * @see docs/bom/structure-graph.ts
 */
export const ProjectDetailRoute = () => {
    const { id } = useParams({ from: '/projects/$id' })
    const { graph: activeGraphId } = useSearch({ from: '/projects/$id' })
    const project = useProjectStore((s) => s.projects.find((p) => p.id === id))
    const setActiveGraphId = useProjectDetailStore((s) => s.setActiveGraphId)
    const [isSettingsOpen, setIsSettingsOpen] = useState(false)
    const router = useRouter()

    // マウント時に SurrealDB からグラフ一覧を取得し activeGraphId を注入する
    const setDetailHydrated = useProjectDetailStore((s) => s.setDetailHydrated)

    useEffect(() => {
        const { activeGraphId, setActiveGraphId } = useProjectDetailStore.getState()
        invoke<GraphListItem[]>('list_graphs', { projectId: id })
            .then((graphs) => {
                if (graphs.length > 0 && !activeGraphId) {
                    setActiveGraphId(graphs[0].id)
                }
            })
            .catch(() => toast.error('プロジェクト詳細の読み込みに失敗しました'))
            .finally(() => setDetailHydrated(true))
    }, [id, setDetailHydrated])

    // URL の ?graph= を store に同期する
    useEffect(() => {
        setActiveGraphId(activeGraphId ?? null)
    }, [activeGraphId, setActiveGraphId])

    // ============================================================
    // [CTX-20] Structure graph state
    // ============================================================
    const [structureGraph, setStructureGraph] = useState<SourceGraph | null>(null)
    const [changedFiles, setChangedFiles] = useState<string[]>([])
    const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null)
    const [isAnalyzing, setIsAnalyzing] = useState(false)

    // ============================================================
    // [CTX-22] Test Context Subflow
    // テストノードが選択されたとき list_test_suites を呼び
    // import 先ノード群を Subflow として表示する。
    // テストノード以外が選択されたら contexts をクリアする。
    // ============================================================
    const [contexts, setContexts] = useState<SourceContext[]>([])

    useEffect(() => {
        if (!selectedFilePath || !id) {
            setContexts([])
            return
        }
        const lower = selectedFilePath.toLowerCase()
        const isTest =
            lower.endsWith('.test.ts') ||
            lower.endsWith('.test.tsx') ||
            lower.endsWith('.spec.ts') ||
            lower.endsWith('.spec.tsx')

        if (!isTest) {
            setContexts([])
            return
        }

        invoke<TestSuite[]>('list_test_suites', { projectId: id })
            .then((suites) => {
                // 選択中テストファイルに対応する suite のみ抽出
                // testFileId は "test_file:mock-{projectId}-{filePath の / を - に変換}" 形式
                const fileKey = selectedFilePath.replace(/\//g, '-')
                const relevant = suites.filter(
                    (s) => s.nodeIds.length > 0 && s.testFileId.includes(fileKey)
                )
                const ctxs: SourceContext[] = relevant.map((s) => ({
                    id: s.id,
                    name: s.name,
                    projectId: id,
                    nodeIds: s.nodeIds,
                }))
                setContexts(ctxs)
            })
            .catch((e) => {
                console.warn('list_test_suites failed', e)
                setContexts([])
            })
    }, [selectedFilePath, id])

    const refreshStructure = useCallback(async () => {
        if (!id) return
        try {
            const graph = await invoke<SourceGraph>('get_structure_graph', {
                projectId: id,
            })
            setStructureGraph(graph)
        } catch (e) {
            console.error('get_structure_graph failed', e)
        }
    }, [id])

    const refreshChangedFiles = useCallback(async () => {
        if (!project?.rootPath) {
            setChangedFiles([])
            return
        }
        try {
            const files = await invoke<string[]>('get_changed_files', {
                rootPath: project.rootPath,
            })
            setChangedFiles(files)
        } catch (e) {
            // git が無い / 非リポジトリ等は静かに空配列にフォールバック
            console.warn('get_changed_files failed', e)
            setChangedFiles([])
        }
    }, [project?.rootPath])

    useEffect(() => {
        const init = async () => {
            await refreshStructure()
            await refreshChangedFiles()
            if (id) {
                // analyze_project の後に analyze_tests を呼ぶ
                // （ソースノードが登録された後でないと node_ids が解決できない）
                try {
                    await invoke('analyze_tests', { projectId: id })
                    await refreshStructure()
                } catch (e) {
                    console.warn('analyze_tests failed', e)
                }
            }
        }
        init()
    }, [refreshStructure, refreshChangedFiles])

    // ============================================================
    // [CTX-20] 派生 state: analyzedFiles / staleFiles
    // ============================================================
    const analyzedFiles = useMemo<ReadonlySet<string>>(() => {
        if (!structureGraph) return new Set()
        return new Set(
            structureGraph.nodes
                .map((n) => n.data?.filePath)
                .filter((p): p is string => !!p),
        )
    }, [structureGraph])

    const staleFiles = useMemo<ReadonlySet<string>>(() => {
        // changedFiles ∩ analyzedFiles のみ「stale」として意味を持つ。
        // 未登録ファイルの変更はグラフ上で表現できないので除外。
        return new Set(changedFiles.filter((f) => analyzedFiles.has(f)))
    }, [changedFiles, analyzedFiles])

    // ============================================================
    // [CTX-20] ハンドラ
    // ============================================================
    /** FileTree ファイルクリック: 未登録なら analyze_file、登録済みなら選択のみ */
    const handleFileClick = useCallback(
        async (filePath: string) => {
            if (!id) return
            setSelectedFilePath(filePath)
            if (analyzedFiles.has(filePath)) return // 既に登録済みなら何もしない
            setIsAnalyzing(true)
            try {
                await invoke('analyze_file', { projectId: id, filePath })
                await refreshStructure()
                await refreshChangedFiles()
            } catch (e) {
                toast.error(`解析に失敗: ${String(e)}`)
            } finally {
                setIsAnalyzing(false)
            }
        },
        [id, analyzedFiles, refreshStructure, refreshChangedFiles],
    )

    /** 選択中ファイルを明示的に再解析 */
    const handleReanalyzeSelected = useCallback(async () => {
        if (!id || !selectedFilePath) return
        setIsAnalyzing(true)
        try {
            await invoke('analyze_file', { projectId: id, filePath: selectedFilePath })
            await refreshStructure()
            await refreshChangedFiles()
            toast.success(`Reanalyzed: ${selectedFilePath}`)
        } catch (e) {
            toast.error(`再解析に失敗: ${String(e)}`)
        } finally {
            setIsAnalyzing(false)
        }
    }, [id, selectedFilePath, refreshStructure, refreshChangedFiles])

    /** プロジェクト全体を一括解析 */
    const handleReanalyzeAll = useCallback(async () => {
        if (!id) return
        setIsAnalyzing(true)
        try {
            await invoke('analyze_project', { projectId: id })
            await invoke('analyze_tests', { projectId: id })
            await refreshStructure()
            await refreshChangedFiles()
            toast.success('Project reanalyzed')
        } catch (e) {
            toast.error(`一括解析に失敗: ${String(e)}`)
        } finally {
            setIsAnalyzing(false)
        }
    }, [id, refreshStructure, refreshChangedFiles])

    /** SourceGraphView Node->File sync: node click updates selectedFilePath */
    const handleNodeSelect = useCallback(
        (filePath: string) => {
            setSelectedFilePath(filePath)
        },
        [],
    )

    /** SourceGraphView Position Persist: call save_graph after drag */
    const handleSourceNodesChange = useCallback(
        async (nodes: import('@xyflow/react').Node[]) => {
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

    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                height: '100vh',
                background: 'var(--background)',
                color: 'var(--foreground)',
            }}
        >
            <ProjectDetailTopbar
                projectId={id}
                project={project}
                onSettingsClick={() => setIsSettingsOpen(true)}
                onNavigate={(graphId) =>
                    router.navigate({
                        to: '/projects/$id',
                        params: { id },
                        search: { graph: graphId },
                    })
                }
            />

            <ResizablePanelGroup style={{ flex: 1, overflow: 'hidden' }}>
                {/* CTX-1: FileTree + [CTX-20] Toolbar */}
                <ResizablePanel
                    defaultSize={FILE_TREE_PANEL.defaultSize}
                    minSize={FILE_TREE_PANEL.minSize}
                    maxSize={FILE_TREE_PANEL.maxSize}
                >
                    <div className="flex flex-col h-full">
                        {/* [CTX-20] 解析ツールバー */}
                        <div className="flex items-center gap-3 px-3 h-8 shrink-0 border-b border-[--border]">
                            <button
                                type="button"
                                className="text-[10px] font-mono uppercase tracking-wider text-[--muted-foreground] hover:text-[--foreground] disabled:opacity-40 transition-colors"
                                onClick={handleReanalyzeAll}
                                disabled={isAnalyzing}
                                data-testid="reanalyze-all-button"
                            >
                                {isAnalyzing ? 'Analyzing…' : 'Reanalyze All'}
                            </button>
                            {selectedFilePath && analyzedFiles.has(selectedFilePath) && (
                                <button
                                    type="button"
                                    className="text-[10px] font-mono uppercase tracking-wider text-[--muted-foreground] hover:text-[--foreground] disabled:opacity-40 transition-colors"
                                    onClick={handleReanalyzeSelected}
                                    disabled={isAnalyzing}
                                    data-testid="reanalyze-selected-button"
                                >
                                    Reanalyze
                                </button>
                            )}
                        </div>

                        <div className="flex-1 min-h-0">
                            <FileTree
                                rootPath={project?.rootPath}
                                onFileClick={handleFileClick}
                                selectedFilePath={selectedFilePath}
                                staleFiles={staleFiles}
                                analyzedFiles={analyzedFiles}
                            />
                        </div>
                    </div>
                </ResizablePanel>

                <ResizableHandle />

                {/* CTX-2: GraphEditor */}
                <ResizablePanel
                    defaultSize={GRAPH_EDITOR_PANEL.defaultSize}
                    minSize={GRAPH_EDITOR_PANEL.minSize}
                >
                    <SourceGraphView
                        nodes={structureGraph?.nodes ?? []}
                        edges={structureGraph?.edges ?? []}
                        staleFiles={staleFiles}
                        selectedFilePath={selectedFilePath}
                        onNodeSelect={handleNodeSelect}
                        onReanalyze={handleReanalyzeSelected}
                        onNodesChange={handleSourceNodesChange}
                        contexts={contexts}
                    />
                </ResizablePanel>

                <ResizableHandle />

                {/* CTX-3: NodeProperty */}
                <ResizablePanel
                    defaultSize={NODE_PROPERTY_PANEL.defaultSize}
                    minSize={NODE_PROPERTY_PANEL.minSize}
                    maxSize={NODE_PROPERTY_PANEL.maxSize}
                >
                    <NodeProperty />
                </ResizablePanel>
            </ResizablePanelGroup>

            <SettingsDialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />
        </div>
    )
}