import { useEffect, useCallback } from 'react'
import { useParams, useSearch, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { FileTree } from '@/components/FileTree'
import { SourceGraphView } from '@/components/SourceGraphView'
import { ProjectDetailTopbar } from '@/components/ProjectDetailTopbar'
import { SettingsDialog } from '@/components/SettingsDialog'
import {
    ResizablePanelGroup,
    ResizablePanel,
    ResizableHandle,
} from '@/components/ui/resizable'
import { useProjectStore } from '@/store/useProjectStore'
import { useProjectDetailStore } from '@/store/useProjectDetailStore'
import { FILE_TREE_PANEL, GRAPH_EDITOR_PANEL } from '@/bom/layout'
import { useGraphList } from '@/hooks/useGraphList'
import { useSourceGraph } from '@/hooks/useSourceGraph'
import type { RelatedNodes } from '@/bom/source-graph'

/**
 * ProjectDetailRoute
 * "/projects/$id" ルートのコンポーネント。
 * CTX-Topbar / CTX-1 FileTree / CTX-2 SourceGraphView / CTX-3 NodeProperty を組み込む。
 *
 * 3ペインは ResizablePanelGroup（shadcn/ui）で水平リサイズ可能。
 * パネルサイズの定数は docs/bom/layout.ts に集約。
 *
 * activeGraphId の SSOT は URL の ?graph= クエリパラメータ。
 *
 * @see src/router.tsx
 * @see src/components/ProjectDetailTopbar.tsx
 * @see docs/bom/layout.ts
 */
export const ProjectDetailRoute = () => {
    const { id } = useParams({ from: '/projects/$id' })
    const { graph: activeGraphId } = useSearch({ from: '/projects/$id' })
    const project = useProjectStore((s) => s.projects.find((p) => p.id === id))
    const setActiveGraphId = useProjectDetailStore((s) => s.setActiveGraphId)
    const [isSettingsOpen, setIsSettingsOpen] = useState(false)
    const router = useRouter()

    // SurrealDB からグラフ一覧を取得し activeGraphId を注入する
    useGraphList(id)

    // URL の ?graph= を store に同期する
    useEffect(() => {
        setActiveGraphId(activeGraphId ?? null)
    }, [activeGraphId, setActiveGraphId])

    // SourceGraph 取得・解析・ハンドラ
    const {
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
    } = useSourceGraph(id, project?.rootPath)

    // [CTX-22] TaaC: 選択テストファイルの依存先・利用先を取得する
    const handleGetRelatedNodes = useCallback(
        (_projectId: string, filePath: string) =>
            invoke<RelatedNodes>('get_related_nodes', { projectId: id, filePath }),
        [id],
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

                {/* CTX-2: SourceGraphView */}
                <ResizablePanel
                    defaultSize={GRAPH_EDITOR_PANEL.defaultSize}
                    minSize={GRAPH_EDITOR_PANEL.minSize}
                >
                    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                        <SourceGraphView
                            nodes={structureGraph?.nodes ?? []}
                            edges={structureGraph?.edges ?? []}
                            staleFiles={staleFiles}
                            selectedFilePath={selectedFilePath}
                            onNodeSelect={setSelectedFilePath}
                            onReanalyze={handleReanalyzeSelected}
                            onNodesChange={handleSourceNodesChange}
                            onGetRelatedNodes={handleGetRelatedNodes}
                        />
                    </div>
                </ResizablePanel>

            </ResizablePanelGroup>

            <SettingsDialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />
        </div>
    )
}