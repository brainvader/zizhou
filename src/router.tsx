import { createRouter, createRoute } from '@tanstack/react-router'
import { rootRoute } from '@/routes/__root'
import { IndexRoute } from '@/routes/index'
import { ProjectDetailRoute } from '@/routes/projects.$id'
import { WorkspaceRoute } from '@/routes/workspace'
import { parseWorkspaceView, type WorkspaceView } from '@/bom/workspace'

/**
 * router
 * TanStack Router のルートツリー定義。routing の SSOT。
 * Zustand に currentPath は持たない。
 *
 * ルート構成:
 *   /             → IndexRoute   (CTX-2: PROJECT-GRID)
 *   /projects/$id → ProjectDetailRoute
 *   /workspace    → WorkspaceRoute (?view=graph|pipeline, 未指定は graph)
 *
 * search params:
 *   ?graph={graphId} — 開いているグラフの ID。activeGraphId の SSOT。
 *   ?view=graph|pipeline — Workspace の表示モード。
 *
 * @see docs/bom/project.ts — routing は TanStack Router に委譲
 * @see docs/context/ContextMap.graph.html
 * @see docs/context/ContextMap.pipeline.html
 */
const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: IndexRoute,
})

const projectDetailRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/projects/$id',
    validateSearch: (search: Record<string, unknown>) => ({
        graph: typeof search.graph === 'string' ? search.graph : undefined,
    }),
    component: ProjectDetailRoute,
})

const workspaceRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/workspace',
    validateSearch: (search: Record<string, unknown>) => ({
        view: parseWorkspaceView(search.view) as WorkspaceView,
    }),
    component: WorkspaceRoute,
})

const routeTree = rootRoute.addChildren([
    indexRoute,
    projectDetailRoute,
    workspaceRoute,
])

export const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
    interface Register {
        router: typeof router
    }
}
