import { useParams, useSearch } from '@tanstack/react-router'
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
 * useProjectDetailStore にも同期する（useGraphFile が getState() で参照するため）。
 * リロード時も URL から復元されるため Zustand のみへの依存はない。
 *
 * @see src/router.tsx
 * @see src/components/ProjectDetailTopbar.tsx
 * @see docs/bom/layout.ts
 * @see docs/specs/file-tree.spec.tsx
 * @see docs/specs/graph-editor.spec.tsx
 */
export const ProjectDetailRoute = () => {
    const { id } = useParams({ from: '/projects/$id' })
    const { graph: activeGraphId } = useSearch({ from: '/projects/$id' })
    const project = useProjectStore((s) => s.projects.find((p) => p.id === id))
    const setProjectRootPath = useProjectDetailStore((s) => s.setProjectRootPath)
    const setActiveGraphId = useProjectDetailStore((s) => s.setActiveGraphId)
    const [isSettingsOpen, setIsSettingsOpen] = useState(false)

    // projectRootPath を store に注入する
    useEffect(() => {
        if (project?.rootPath) {
            setProjectRootPath(project.rootPath)
        }
    }, [project?.rootPath, setProjectRootPath])

    // URL の ?graph= を store に同期する（useGraphFile の getState() 参照のため）
    useEffect(() => {
        setActiveGraphId(activeGraphId ?? null)
    }, [activeGraphId, setActiveGraphId])

    return (
        <div
            style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}
        >
            {/* CTX-Topbar: Breadcrumb + New Graph + Settings */}
            <ProjectDetailTopbar
                projectId={id}
                project={project}
                onSettingsClick={() => setIsSettingsOpen(true)}
            />

            {/* 3ペイン水平リサイズレイアウト
                flex-1 + h-0 でトップバー分を除いた残高を確実に占有させる。
                flex: 1 + minHeight: 0 で Topbar 分を除いた残高を占有する。 */}
            <ResizablePanelGroup
                orientation="horizontal"
                style={{ flex: 1, minHeight: 0 }}
            >
                {/* CTX-1: FileTree */}
                <ResizablePanel
                    defaultSize={FILE_TREE_PANEL.defaultSize}
                    minSize={FILE_TREE_PANEL.minSize}
                    maxSize={FILE_TREE_PANEL.maxSize}
                >
                    <FileTree projectId={id} />
                </ResizablePanel>

                <ResizableHandle withHandle />

                {/* CTX-2: GraphEditor */}
                <ResizablePanel
                    defaultSize={GRAPH_EDITOR_PANEL.defaultSize}
                    minSize={GRAPH_EDITOR_PANEL.minSize}
                >
                    <GraphEditor activeGraphId={activeGraphId ?? null} />
                </ResizablePanel>

                <ResizableHandle withHandle />

                {/* CTX-3: NodeProperty */}
                <ResizablePanel
                    defaultSize={NODE_PROPERTY_PANEL.defaultSize}
                    minSize={NODE_PROPERTY_PANEL.minSize}
                    maxSize={NODE_PROPERTY_PANEL.maxSize}
                >
                    <aside
                        style={{
                            height: '100%',
                            borderLeft: '1px solid var(--border)',
                            overflowY: 'auto',
                        }}
                    >
                        <NodeProperty />
                    </aside>
                </ResizablePanel>
            </ResizablePanelGroup>

            <SettingsDialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />
        </div>
    )
}