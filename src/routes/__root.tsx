import { Outlet, createRootRoute } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useProjectLoad } from '@/hooks/useProjectLoad'

/**
 * RootRoute
 * アプリ全体のルートレイアウト。
 * どのルートに直接アクセスしても loadProjects() が走ることを保証する。
 *
 * @see src/hooks/useProjectLoad.ts
 */
const RootComponent = () => {
    const { loadProjects } = useProjectLoad()

    useEffect(() => {
        loadProjects()
    }, [loadProjects])

    return <Outlet />
}

export const rootRoute = createRootRoute({
    component: RootComponent,
})