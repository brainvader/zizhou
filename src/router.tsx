import { createRouter, createRoute } from '@tanstack/react-router'
import { rootRoute } from '@/routes/__root'
import { IndexRoute } from '@/routes/index'
import { ProjectDetailRoute } from '@/routes/projects.$id'
import { WorkspaceRoute } from '@/routes/workspace'
import { parseWorkspaceView, parseWorkspaceProjectId } from '@/bom/workspace'

/**
 * router
 * TanStack Router のルートツリー定義。routing の SSOT。
 * Zustand に currentPath は持たない。
 *
 * ルート構成:
 *   /             → IndexRoute
 *   /projects/$id → ProjectDetailRoute（.zizhou/context ゲート → Workspace）
 *   /workspace    → WorkspaceRoute (?view=&projectId=, 未指定 view は graph)
 *   *             → NotFound（rootRoute.notFoundComponent）
 *
 * @see docs/context/ContextMap.projects.html
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
    component: ProjectDetailRoute,
})

const workspaceRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/workspace',
    validateSearch: (search: Record<string, unknown>) => ({
        view: parseWorkspaceView(search.view),
        projectId: parseWorkspaceProjectId(search.projectId),
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
