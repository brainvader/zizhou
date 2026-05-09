import { useParams } from '@tanstack/react-router'
import { useEffect } from 'react'
import { GraphEditor } from '@/components/GraphEditor'
import { useProjectStore } from '@/store/useProjectStore'
import { useProjectDetailStore } from '@/store/useProjectDetailStore'

/**
 * ProjectDetailRoute
 * "/projects/$id" ルートのコンポーネント。
 * CTX-2 GraphEditor を仮組み込みした状態。
 * CTX-1 FileTree / CTX-3 NodeProperty は後続コンテキストで実装する。
 *
 * @see src/router.tsx
 * @see docs/specs/graph-editor.spec.tsx
 */
export const ProjectDetailRoute = () => {
    const { id } = useParams({ from: '/projects/$id' })
    const project = useProjectStore((s) => s.projects.find((p) => p.id === id))
    const setProjectRootPath = useProjectDetailStore((s) => s.setProjectRootPath)
    const setInitStatus = useProjectDetailStore((s) => s.setInitStatus)

    // projectRootPath を store に注入する
    useEffect(() => {
        if (project?.rootPath) {
            setProjectRootPath(project.rootPath)
            setInitStatus('checking')
        }
    }, [project?.rootPath, setProjectRootPath, setInitStatus])

    return (
        <div
            data-testid="project-detail"
            style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}
        >
            {/* CTX-2: GraphEditor（仮組み込み） */}
            <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
                <GraphEditor />
            </div>
        </div>
    )
}