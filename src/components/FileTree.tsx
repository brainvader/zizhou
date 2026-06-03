import { useEffect, useState, useCallback } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { useRouter } from '@tanstack/react-router'
import { useProjectDetailStore } from '@/store/useProjectDetailStore'
import { toast } from 'sonner'
import type { GraphListItem } from '@/bom/graph'

const defaultListGraphs = (projectId: string): Promise<GraphListItem[]> =>
    invoke<GraphListItem[]>('list_graphs', { projectId })

// ============================================================
// Types
// ============================================================

type ListGraphsFn = (projectId: string) => Promise<GraphListItem[]>

export type FileTreeProps = {
    projectId?: string
    activeGraphId?: string | null
    onNavigate?: (graphId: string) => void
    onListGraphs?: ListGraphsFn
}

// ============================================================
// FileTree
// ============================================================

/**
 * @context  CTX-1 / FileTree
 * @bom      docs/bom/graph.ts
 *
 * SurrealDB移行後の実装。invoke('list_graphs') でグラフ一覧を取得し表示する。
 * Tauri fs（readDir/join）依存を完全に廃止。
 *
 * props DI: onListGraphs / onNavigate を props で受け取る。
 * 省略時は invoke / useRouter にフォールバック。
 */
export const FileTree = ({
    projectId: projectIdProp,
    activeGraphId: activeGraphIdProp,
    onNavigate,
    onListGraphs = defaultListGraphs,
}: FileTreeProps = {}) => {
    const router = useRouter()
    const storeActiveGraphId = useProjectDetailStore((s) => s.activeGraphId)

    const activeGraphId = activeGraphIdProp ?? storeActiveGraphId

    const [graphs, setGraphs] = useState<GraphListItem[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const navigate = useCallback(
        (graphId: string) => {
            if (onNavigate) {
                onNavigate(graphId)
            } else {
                router.navigate({
                    to: '/projects/$id',
                    params: { id: projectIdProp ?? '' },
                    search: { graph: graphId },
                })
            }
        },
        [onNavigate, router, projectIdProp],
    )

    useEffect(() => {
        if (!projectIdProp) {
            setIsLoading(false)
            return
        }

        setIsLoading(true)
        setError(null)

        onListGraphs(projectIdProp)
            .then(setGraphs)
            .catch(() => {
                toast.error('グラフ一覧の取得に失敗しました')
                setError('Failed to load graphs')
            })
            .finally(() => setIsLoading(false))
    }, [projectIdProp, activeGraphId, onListGraphs])

    return (
        <nav
            data-testid="file-tree"
            className="flex flex-col h-full overflow-hidden border-r border-[--border]"
        >
            <div className="flex items-center px-3 h-9 shrink-0 border-b border-[--border]">
                <span className="text-[10px] font-mono tracking-widest uppercase text-[--muted-foreground]">
                    Graphs
                </span>
            </div>

            <div className="flex-1 overflow-y-auto py-1">
                {isLoading && (
                    <p className="px-3 py-2 text-xs text-[--muted-foreground]">Loading…</p>
                )}
                {error && (
                    <p className="px-3 py-2 text-xs text-[--primary]">{error}</p>
                )}
                {!isLoading && !error && graphs.length === 0 && (
                    <p className="px-3 py-2 text-xs text-[--muted-foreground]">No graphs</p>
                )}
                {!isLoading &&
                    !error &&
                    graphs.map((g) => {
                        const isSelected = g.id === activeGraphId
                        return (
                            <div
                                key={g.id}
                                role="button"
                                tabIndex={0}
                                data-testid={`graph-item-${g.id}`}
                                className={[
                                    'flex items-center gap-1.5 px-3 py-1 rounded-sm cursor-pointer select-none',
                                    'text-[11px] font-light transition-colors duration-100',
                                    isSelected
                                        ? 'bg-[--muted] text-[--foreground]'
                                        : 'text-[--muted-foreground] hover:text-[--foreground] hover:bg-[--muted]',
                                ].join(' ')}
                                onClick={() => navigate(g.id)}
                                onKeyDown={(e) => e.key === 'Enter' && navigate(g.id)}
                            >
                                <span className="truncate">{g.name}</span>
                            </div>
                        )
                    })}
            </div>
        </nav>
    )
}