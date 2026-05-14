import { createRouter, createRootRoute, createRoute } from '@tanstack/react-router'
import { IndexRoute } from '@/routes/index'
import { ProjectDetailRoute } from '@/routes/projects.$id'

/**
 * router
 * TanStack Router のルートツリー定義。routing の SSOT。
 * Zustand に currentPath は持たない。
 *
 * ルート構成:
 *   /             → IndexRoute   (CTX-2: PROJECT-GRID)
 *   /projects/$id → ProjectDetailRoute
 *
 * search params:
 *   ?graph={graphId} — 開いているグラフの ID。activeGraphId の SSOT。
 *
 * @see docs/bom/project.ts — routing は TanStack Router に委譲
 * @see docs/specs/routing.spec.tsx
 */
const rootRoute = createRootRoute()

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

const routeTree = rootRoute.addChildren([indexRoute, projectDetailRoute])

export const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
    interface Register {
        router: typeof router
    }
}