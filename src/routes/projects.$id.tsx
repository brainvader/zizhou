import { useParams } from '@tanstack/react-router'

/**
 * ProjectDetailRoute
 * "/projects/$id" のプレースホルダー。
 * ContextMap.projects.html はルート存在と id 表示のみを要求する。
 * 詳細 UI（FileTree / SourceGraph 等）は後続コンテキスト。
 *
 * @see docs/context/ContextMap.projects.html
 * @see src/router.tsx
 */
export function ProjectDetailRoute() {
    const { id } = useParams({ from: '/projects/$id' })

    return (
        <div
            data-testid="project-detail-route"
            className="flex items-center justify-center h-screen bg-background text-foreground"
        >
            <div data-testid="project-detail-id" className="font-mono text-sm text-muted-foreground">
                {id}
            </div>
        </div>
    )
}
