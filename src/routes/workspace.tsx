import { useSearch } from '@tanstack/react-router'
import { WorkspaceTopbar } from '@/components/WorkspaceTopbar'
import { ContextSidebar } from '@/components/ContextSidebar'
import type { WorkspaceView } from '@/bom/workspace'

/**
 * WorkspaceRoute
 * "/workspace?view=graph|pipeline" のページコンポーネント。
 * 第1スライス: Topbar + ContextSidebar + view 領域の切替のみ。
 *
 * @see docs/context/ContextMap.graph.html
 * @see docs/context/ContextMap.pipeline.html
 * @see src/router.tsx
 */
export function WorkspaceRoute() {
    const { view } = useSearch({ from: '/workspace' })

    return (
        <div
            data-testid="workspace-route"
            className="flex flex-col h-screen bg-background text-foreground"
        >
            <WorkspaceTopbar />
            <div className="flex flex-1 min-h-0 items-start p-6 gap-6">
                <ContextSidebar />
                <WorkspaceViewArea view={view} />
            </div>
        </div>
    )
}

function WorkspaceViewArea({ view }: { view: WorkspaceView }) {
    if (view === 'pipeline') {
        return <div data-testid="workspace-view-pipeline" className="flex-1 min-w-0" />
    }
    return <div data-testid="workspace-view-graph" className="flex-1 min-w-0" />
}
