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
import {
    CONTEXT_GRAPH_NODES,
    CONTEXT_GRAPH_EDGES,
    type ContextGraphNode,
    type ContextGraphEdge,
} from '@/bom/context-graph'
import {
    DEFAULT_VISIBLE_CONTEXT_IDS,
    WORKSPACE_SIDEBAR_ITEMS,
    type ContextNodeId,
    type WorkspaceView,
} from '@/bom/workspace'

// contexts セクション（foundation/source/project = Zizhou自身の固定グラフ）に属する
// ノード/エッジだけを静的デモから取り出す。ui セクション（抽出結果由来）とは独立して
// 常に表示できるようにするため。
const CONTEXTS_SECTION_IDS = new Set(
    WORKSPACE_SIDEBAR_ITEMS.filter((item) => item.section === 'contexts').map(
        (item) => item.id,
    ),
)
const STATIC_CONTEXT_NODES = CONTEXT_GRAPH_NODES.filter((n) =>
    CONTEXTS_SECTION_IDS.has(n.contextId),
)
const staticContextNodeIds = new Set(STATIC_CONTEXT_NODES.map((n) => n.id))
const STATIC_CONTEXT_EDGES = CONTEXT_GRAPH_EDGES.filter(
    (e) => staticContextNodeIds.has(e.source) && staticContextNodeIds.has(e.target),
)

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
    const { nodes, edges, sidebarItems, extractContextGraph } = useContextGraph()

    // 可視コンテキストのSSOT。ユーザーが手動でサイドバーを操作するまでは
    // 抽出結果（sidebarItems）から自動導出し、操作後はその選択を優先する。
    // 以前は useEffect で setVisibleIds していたため、ContextSidebar を
    // key で再マウントするタイミングと1レンダー分ズレ、再マウント時点で
    // まだ古い visibleIds を defaultVisibleIds として渡してしまうバグがあった。
    // レンダー中に同期的に導出することでズレを無くす。
    const [manualVisibleIds, setManualVisibleIds] = useState<ContextNodeId[] | null>(null)
    const autoVisibleIds =
        sidebarItems.length > 0
            ? sidebarItems.map((item) => item.id)
            : [...DEFAULT_VISIBLE_CONTEXT_IDS]
    const visibleIds = manualVisibleIds ?? autoVisibleIds
    const [needsSetup, setNeedsSetup] = useState(false)
    const [isCreating, setIsCreating] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // グラフでノードをクリックしたときの選択状態。選択中は view を問答無用で
    // pipeline に切り替え、そのノード自身の describe/criteria を表示する
    // （view の search param 自体は書き換えない。ローカルな一時オーバーライド）。
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
    const effectiveView: WorkspaceView = selectedNodeId ? 'pipeline' : view
    const handleNodeClick = useCallback((nodeId: string) => {
        setSelectedNodeId(nodeId)
    }, [])
    // サイドバーで別のコンテキストに切り替えたら、選択中ノードの詳細表示は解除する
    // （別コンテキストを見ているのに前のノード詳細が残り続けるのを防ぐ）
    const handleVisibilityChange = useCallback((next: ContextNodeId[]) => {
        setSelectedNodeId(null)
        setManualVisibleIds(next)
    }, [])

    // 「CONTEXTS」という見出し自体は ContextSidebar 側で常に表示される（0件でもラベルは残る）。
    // その下の行（foundation/source/project = Zizhou自身の固定グラフ）は、今開いている
    // プロジェクトに対象となるコンテキストが無いとき（＝抽出結果が無いとき）だけ出す。
    // 抽出結果（sidebarItems）があるときは、そのプロジェクトと無関係な行なので出さない
    // （グラフ側も同様に、対応する行が無い静的ノードは合成しない）。
    const hasProjectContext = sidebarItems.length > 0
    const mergedNodes = hasProjectContext ? nodes : [...STATIC_CONTEXT_NODES, ...nodes]
    const mergedEdges = hasProjectContext ? edges : [...STATIC_CONTEXT_EDGES, ...edges]
    const items = [
        ...(hasProjectContext
            ? []
            : WORKSPACE_SIDEBAR_ITEMS.filter((item) => item.section === 'contexts')),
        ...(hasProjectContext ? sidebarItems : WORKSPACE_SIDEBAR_ITEMS.filter((item) => item.section === 'ui')),
    ]
    const selectedNode = selectedNodeId
        ? mergedNodes.find((n) => n.id === selectedNodeId)
        : undefined

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
                    key={sidebarItems.length > 0 ? 'extracted' : 'static'}
                    items={items}
                    defaultVisibleIds={visibleIds}
                    onVisibilityChange={handleVisibilityChange}
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
                        view={effectiveView}
                        visibleIds={visibleIds}
                        nodes={mergedNodes}
                        edges={mergedEdges}
                        selectedNode={selectedNode}
                        onNodeClick={handleNodeClick}
                    />
                </div>
                {effectiveView === 'pipeline' && <ContextChatPanel />}
            </div>
        </div>
    )
}

function WorkspaceViewArea({
    view,
    visibleIds,
    nodes,
    edges,
    selectedNode,
    onNodeClick,
}: {
    view: WorkspaceView
    visibleIds: readonly ContextNodeId[]
    nodes: ContextGraphNode[]
    edges: ContextGraphEdge[]
    selectedNode?: ContextGraphNode
    onNodeClick: (nodeId: string) => void
}) {
    if (view === 'pipeline') {
        return <ContextPipelineView visibleIds={visibleIds} selectedNode={selectedNode} />
    }
    return (
        <ComponentGraphEditor
            visibleIds={visibleIds}
            nodes={nodes}
            edges={edges}
            onNodeClick={onNodeClick}
        />
    )
}