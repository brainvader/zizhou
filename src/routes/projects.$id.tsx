import { useParams, useSearch, useRouter } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { FileTree } from '@/components/FileTree'
import { GraphEditor } from '@/components/GraphEditor'
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
import { useProjectDetailLoad } from '@/hooks/useProjectDetailLoad'
import { FILE_TREE_PANEL, GRAPH_EDITOR_PANEL, NODE_PROPERTY_PANEL } from '@/bom/layout'

/**
 * ProjectDetailRoute
 * "/projects/$id" ルートのコンポーネント。
 * CTX-Topbar / CTX-1 FileTree / CTX-2 GraphEditor / CTX-3 NodeProperty を組み込む。
 *
 * 3ペインは ResizablePanelGroup（shadcn/ui）で水平リサイズ可能。
 * パネルサイズの定数は docs/bom/layout.ts に集約。
 *
 * activeGraphId の SSOT は URL の ?graph= クエリパラメータ。
 * useSearch() で取得し、GraphEditor に props として渡すとともに
 * useProjectDetailStore にも同期する。
 *
 * @see src/router.tsx
 * @see src/components/ProjectDetailTopbar.tsx
 * @see docs/bom/layout.ts
 * @see src/hooks/useProjectDetailLoad.ts
 */
export const ProjectDetailRoute = () => {
    const { id } = useParams({ from: '/projects/$id' })
    const { graph: activeGraphId } = useSearch({ from: '/projects/$id' })
    const project = useProjectStore((s) => s.projects.find((p) => p.id === id))
    const setActiveGraphId = useProjectDetailStore((s) => s.setActiveGraphId)
    const [isSettingsOpen, setIsSettingsOpen] = useState(false)
    const router = useRouter()

    // マウント時に SurrealDB からグラフ一覧を取得し activeGraphId を注入する
    const { loadProjectDetail } = useProjectDetailLoad()
    useEffect(() => {
        loadProjectDetail(id)
    }, [id, loadProjectDetail])

    // URL の ?graph= を store に同期する
    useEffect(() => {
        setActiveGraphId(activeGraphId ?? null)
    }, [activeGraphId, setActiveGraphId])

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
                {/* CTX-1: FileTree */}
                <ResizablePanel
                    defaultSize={FILE_TREE_PANEL.defaultSize}
                    minSize={FILE_TREE_PANEL.minSize}
                    maxSize={FILE_TREE_PANEL.maxSize}
                >
                    <FileTree projectId={id} />
                </ResizablePanel>

                <ResizableHandle />

                {/* CTX-2: GraphEditor */}
                <ResizablePanel
                    defaultSize={GRAPH_EDITOR_PANEL.defaultSize}
                    minSize={GRAPH_EDITOR_PANEL.minSize}
                >
                    <GraphEditor activeGraphId={activeGraphId ?? null} />
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