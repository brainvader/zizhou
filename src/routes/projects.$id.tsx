import { useParams } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { FileTree } from '@/components/FileTree'
import { GraphEditor } from '@/components/GraphEditor'
import { NodeProperty } from '@/components/NodeProperty'
import { ProjectDetailTopbar } from '@/components/ProjectDetailTopbar'
import { SettingsDialog } from '@/components/SettingsDialog'
import { useProjectFile } from '@/hooks/useProjectFile'
import { useProjectStore } from '@/store/useProjectStore'
import { useProjectDetailStore } from '@/store/useProjectDetailStore'

/**
 * ProjectDetailRoute
 * "/projects/$id" ルートのコンポーネント。
 * CTX-Topbar / CTX-1 FileTree / CTX-2 GraphEditor / CTX-3 NodeProperty を組み込む。
 *
 * @see src/router.tsx
 * @see src/components/ProjectDetailTopbar.tsx
 * @see docs/specs/file-tree.spec.tsx
 * @see docs/specs/graph-editor.spec.tsx
 */
export const ProjectDetailRoute = () => {
    const { id } = useParams({ from: '/projects/$id' })
    const { loadProjects } = useProjectFile()
    const project = useProjectStore((s) => s.projects.find((p) => p.id === id))
    const setProjectRootPath = useProjectDetailStore((s) => s.setProjectRootPath)
    const setInitStatus = useProjectDetailStore((s) => s.setInitStatus)
    const [isSettingsOpen, setIsSettingsOpen] = useState(false)

    // 直接アクセス・リロード時も projects[] を hydrate する
    useEffect(() => {
        loadProjects()
    }, [loadProjects])

    // projectRootPath を store に注入する
    useEffect(() => {
        if (project?.rootPath) {
            setProjectRootPath(project.rootPath)
            setInitStatus('checking')
        }
    }, [project?.rootPath, setProjectRootPath, setInitStatus])

    return (
        <div
            style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}
        >
            {/* CTX-Topbar: Breadcrumb + New Graph + Settings */}
            <ProjectDetailTopbar
                projectId={id}
                onSettingsClick={() => setIsSettingsOpen(true)}
            />

            <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
                {/* CTX-1: FileTree */}
                <FileTree />

                {/* CTX-2: GraphEditor */}
                <GraphEditor />

                {/* CTX-3: NodeProperty */}
                <aside
                    data-testid="node-property"
                    style={{
                        width: '200px',
                        flexShrink: 0,
                        borderLeft: '1px solid var(--border)',
                        overflowY: 'auto',
                    }}
                >
                    <NodeProperty />
                </aside>
            </div>

            <SettingsDialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />
        </div>
    )
}