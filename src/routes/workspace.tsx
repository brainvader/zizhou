import { useCallback, useEffect, useState } from 'react'
import { useSearch } from '@tanstack/react-router'
import { WorkspaceTopbar } from '@/components/WorkspaceTopbar'
import { ContextSidebar } from '@/components/ContextSidebar'
import { ComponentGraphEditor } from '@/components/ComponentGraphEditor'
import { ContextPipelineView } from '@/components/ContextPipelineView'
import { ContextChatPanel } from '@/components/ContextChatPanel'
import { ProjectContextSetup } from '@/components/ProjectContextSetup'
import { useProjectStore } from '@/store/useProjectStore'
import {
    ensureZizhouContext,
    hasZizhouContext,
    type ExistsFn,
    type MkdirFn,
} from '@/lib/ensureZizhouContext'
import { useContextGraph } from '@/hooks/useContextGraph'
import type { ContextGraphNode, ContextGraphEdge } from '@/bom/context-graph'
import {
    DEFAULT_VISIBLE_CONTEXT_IDS,
    type ContextNodeId,
    type WorkspaceView,
} from '@/bom/workspace'

export type WorkspaceRouteProps = {
    onExists?: ExistsFn
    onMkdir?: MkdirFn
}

/**
 * WorkspaceRoute
 * "/workspace?view=&projectId=" — 先に Graph/Pipeline を表示し、
 * .zizhou/context が無いときだけ作成バナーを出す。
 *
 * @see docs/context/ContextMap.graph.html
 * @see docs/context/ContextMap.pipeline.html
 * @see docs/context/ContextMap.projects.html
 */
export function WorkspaceRoute({
    onExists,
    onMkdir,
}: WorkspaceRouteProps = {}) {
    const { view, projectId } = useSearch({ from: '/workspace' })
    const isHydrated = useProjectStore((s) => s.isHydrated)
    const project = useProjectStore((s) =>
        projectId ? s.projects.find((p) => p.id === projectId) : undefined,
    )
    const [visibleIds, setVisibleIds] = useState<ContextNodeId[]>(() => [
        ...DEFAULT_VISIBLE_CONTEXT_IDS,
    ])
    const [needsSetup, setNeedsSetup] = useState(false)
    const [isCreating, setIsCreating] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const { nodes, edges, extractContextGraph } = useContextGraph()

    useEffect(() => {
        if (!projectId || !isHydrated || !project) {
            setNeedsSetup(false)
            return
        }
        let cancelled = false
        void hasZizhouContext(project.rootPath, onExists).then((ok) => {
            if (!cancelled) setNeedsSetup(!ok)
        })
        return () => {
            cancelled = true
        }
    }, [projectId, isHydrated, project, onExists])

    // .zizhou/context の存在が確認できた（needsSetup === false）後にのみ抽出する。
    // 存在しない状態で呼んでも空/失敗になるだけのため。
    useEffect(() => {
        if (!project || needsSetup) return
        void extractContextGraph(project.rootPath)
    }, [project, needsSetup, extractContextGraph])

    const handleCreate = useCallback(async () => {
        if (!project) return
        setIsCreating(true)
        setError(null)
        try {
            await ensureZizhouContext(project.rootPath, { onExists, onMkdir })
            setNeedsSetup(false)
        } catch {
            setError('.zizhou/context の作成に失敗しました')
        } finally {
            setIsCreating(false)
        }
    }, [project, onExists, onMkdir])

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
                <div className="flex flex-1 self-stretch min-h-0 flex-col gap-3 min-w-0">
                    {needsSetup && project && (
                        <ProjectContextSetup
                            projectName={project.name}
                            rootPath={project.rootPath}
                            onCreate={handleCreate}
                            isCreating={isCreating}
                            error={error}
                            variant="inline"
                        />
                    )}
                    <WorkspaceViewArea
                        view={view}
                        visibleIds={visibleIds}
                        nodes={nodes}
                        edges={edges}
                    />
                </div>
                {view === 'pipeline' && <ContextChatPanel />}
            </div>
        </div>
    )
}

function WorkspaceViewArea({
    view,
    visibleIds,
    nodes,
    edges,
}: {
    view: WorkspaceView
    visibleIds: readonly ContextNodeId[]
    nodes: ContextGraphNode[]
    edges: ContextGraphEdge[]
}) {
    if (view === 'pipeline') {
        return <ContextPipelineView visibleIds={visibleIds} />
    }
    // 抽出結果が空（未取得/抽出0件）のときは ComponentGraphEditor 側の
    // デフォルト値（CONTEXT_GRAPH_NODES/EDGES）にフォールバックさせる。
    return (
        <ComponentGraphEditor
            visibleIds={visibleIds}
            nodes={nodes.length > 0 ? nodes : undefined}
            edges={edges.length > 0 ? edges : undefined}
        />
    )
}
