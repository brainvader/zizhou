import { useEffect } from 'react'
import { useParams, useNavigate } from '@tanstack/react-router'

/**
 * ProjectDetailRoute
 * "/projects/$id" — Workspace への互換リダイレクト。
 * カードは /workspace?projectId= へ直リンクするが、旧 URL も受け付ける。
 *
 * @see docs/context/ContextMap.projects.html
 */
export function ProjectDetailRoute() {
    const { id } = useParams({ from: '/projects/$id' })
    const navigate = useNavigate()

    useEffect(() => {
        void navigate({
            to: '/workspace',
            search: { view: 'graph', projectId: id },
            replace: true,
        })
    }, [navigate, id])

    return (
        <div
            data-testid="project-detail-route"
            className="flex items-center justify-center h-screen bg-background text-muted-foreground text-sm"
        >
            <div data-testid="project-detail-id" className="font-mono">
                {id}
            </div>
        </div>
    )
}
