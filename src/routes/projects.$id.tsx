import { useEffect } from 'react'
import { useParams, useSearch, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
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
import { useGraphList } from '@/hooks/useGraphList'
import { useSourceGraph } from '@/hooks/useSourceGraph'
import { useTestContexts } from '@/hooks/useTestContexts'

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
        analyzedFiles,
        staleFiles,
        isAnalyzing,
        handleFileClick,
        handleReanalyzeSelected,
        handleReanalyzeAll,
        handleSourceNodesChange,
    } = useSourceGraph(id, project?.rootPath)

    // テストノード選択時の Subflow コンテキスト
    const contexts = useTestContexts(id, selectedFilePath)

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
                    <SourceGraphView
                        nodes={structureGraph?.nodes ?? []}
                        edges={structureGraph?.edges ?? []}
                        staleFiles={staleFiles}
                        selectedFilePath={selectedFilePath}
                        onNodeSelect={(filePath) => handleFileClick(filePath)}
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