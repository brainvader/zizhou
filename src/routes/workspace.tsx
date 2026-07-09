import { useState } from 'react'
import { useSearch } from '@tanstack/react-router'
import { WorkspaceTopbar } from '@/components/WorkspaceTopbar'
import { ContextSidebar } from '@/components/ContextSidebar'
import { ContextGraphView } from '@/components/ContextGraphView'
import { ContextPipelineView } from '@/components/ContextPipelineView'
import { ContextChatPanel } from '@/components/ContextChatPanel'
import {
    DEFAULT_VISIBLE_CONTEXT_IDS,
    type ContextNodeId,
    type WorkspaceView,
} from '@/bom/workspace'

/**
 * WorkspaceRoute
 * "/workspace?view=graph|pipeline" のページコンポーネント。
 * Topbar + ContextSidebar + view 領域（graph / pipeline）+ Chat（pipeline 時）。
 *
 * @see docs/context/ContextMap.graph.html
 * @see docs/context/ContextMap.pipeline.html
 * @see src/router.tsx
 */
export function WorkspaceRoute() {
    const { view } = useSearch({ from: '/workspace' })
    const [visibleIds, setVisibleIds] = useState<ContextNodeId[]>(() => [
        ...DEFAULT_VISIBLE_CONTEXT_IDS,
    ])

    return (
        <div
            data-testid="workspace-route"
            className="flex flex-col h-screen bg-background text-foreground"
        >
            <WorkspaceTopbar />
            <div className="flex flex-1 min-h-0 items-start p-6 gap-6">
                <ContextSidebar
                    defaultVisibleIds={visibleIds}
                    onVisibilityChange={setVisibleIds}
                />
                <WorkspaceViewArea view={view} visibleIds={visibleIds} />
                {view === 'pipeline' && <ContextChatPanel />}
            </div>
        </div>
    )
}

function WorkspaceViewArea({
    view,
    visibleIds,
}: {
    view: WorkspaceView
    visibleIds: readonly ContextNodeId[]
}) {
    if (view === 'pipeline') {
        return <ContextPipelineView visibleIds={visibleIds} />
    }
    return <ContextGraphView visibleIds={visibleIds} />
}
