import { useCallback } from 'react'
import { Link } from '@tanstack/react-router'
import { invoke } from '@tauri-apps/api/core'
import { toast } from 'sonner'
import { Settings, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useProjectStore } from '@/store/useProjectStore'
import { useProjectDetailStore } from '@/store/useProjectDetailStore'
import type { Project } from '@/bom/project'

// ============================================================
// Types
// ============================================================

type NavigateFn = (graphId: string) => void
type CreateGraphFn = (projectId: string, name: string) => Promise<{ id: string }>

export type ProjectDetailTopbarProps = {
    projectId: string
    onSettingsClick?: () => void
    project?: Project
    /**
     * New Graph 作成後のナビゲーション。
     * 省略時は router.navigate にフォールバックするため、
     * Storybook / テストでは必ず渡すこと。
     */
    onNavigate: NavigateFn
    /** props DI: Storybook / テスト用。省略時は invoke('create_graph') を使用 */
    onCreateGraph?: CreateGraphFn
    /** props DI: Storybook / テスト用。省略時は TanStack Router の Link を使用 */
    LinkComponent?: React.ComponentType<{ to: string; children: React.ReactNode; className?: string }>
    /** 外部（テストやStorybook等）から明示的に非活性化状態を注入するためのオプション */
    disabled?: boolean
    /** プロトコルのバージョン表現を外部制御するためのオプショナルProps。Storybookとの整合性のために使用。 */
    protocolVersion?: string
}

// ============================================================
// Components
// ============================================================

const DefaultLink = ({ to, children, className }: { to: string; children: React.ReactNode; className?: string }) => (
    <Link to={to} search={{}} className={className}>{children}</Link>
)

const defaultCreateGraph: CreateGraphFn = (projectId, name) =>
    invoke('create_graph', { projectId, name })

export const ProjectDetailTopbar = ({
    projectId,
    onSettingsClick,
    project: projectProp,
    onNavigate,
    onCreateGraph = defaultCreateGraph,
    LinkComponent,
    disabled: disabledProp,
    protocolVersion = 'v8.10',
}: ProjectDetailTopbarProps) => {
    const storeProject = useProjectStore((s) => s.projects.find((p) => p.id === projectId))
    const project = projectProp ?? storeProject

    const isDetailHydrated = useProjectDetailStore((s) => s.isDetailHydrated)

    // 外部からの明示的な disabled 指定、または hydration 未完了の場合はボタンを非活性にする
    const isButtonDisabled = disabledProp ?? !isDetailHydrated

    const NavLink = LinkComponent ?? DefaultLink

    const handleNewGraph = useCallback(async () => {
        if (isButtonDisabled) return

        try {
            const graph = await onCreateGraph(projectId, `graph-${Date.now()}`)
            toast.success('グラフを作成しました')
            onNavigate(graph.id)
        } catch {
            toast.error('グラフの作成に失敗しました')
        }
    }, [projectId, onNavigate, onCreateGraph, isButtonDisabled])

    return (
        <header
            data-testid="topbar"
            className="h-13 bg-card border-b border-border flex items-center px-5.5 gap-4 shrink-0 shadow-[inset_0_1px_0_#c0392b28]"
        >
            {/* ロゴエリア */}
            <div className="flex items-center gap-3">
                <div className="relative inline-block after:content-[''] after:absolute after:-bottom-0.75 after:left-0 after:right-0 after:h-0.5 after:bg-primary after:rounded-sm after:opacity-80">
                    <span
                        className="font-serif text-[20px] font-normal text-foreground tracking-[0.15em] leading-none drop-shadow-sm"
                        style={{ fontFamily: "'Noto Serif JP', serif" }}
                    >
                        地蔵
                    </span>
                </div>
                <div className="w-px h-4.5 bg-border" />
                <div className="flex flex-col gap-px">
                    <span className="font-mono text-[9px] text-muted-foreground tracking-[0.25em] uppercase">
                        Zizou
                    </span>
                    <span className="font-mono text-[8px] text-[#6b7280] tracking-[0.15em]">
                        Protocol {protocolVersion}
                    </span>
                </div>
            </div>

            {/* Breadcrumb */}
            <span className="text-border text-base mx-1.5 select-none">/</span>
            <NavLink
                to="/"
                className="font-mono text-[11px] text-muted-foreground tracking-widest hover:text-foreground transition-colors"
            >
                Home
            </NavLink>
            {project && (
                <>
                    <span className="text-border text-base mx-1.5 select-none">/</span>
                    <span
                        data-testid="breadcrumb-project"
                        className="font-mono text-[11px] text-muted-foreground tracking-widest"
                    >
                        {project.name}
                    </span>
                </>
            )}

            <div className="flex-1" />

            {/* New Graph ボタン */}
            <Button
                data-testid="new-graph-btn"
                variant="ghost"
                size="icon"
                aria-label="New Graph"
                onClick={handleNewGraph}
                disabled={isButtonDisabled}
                className="w-8 h-8 text-muted-foreground hover:text-foreground"
            >
                <Plus size={16} />
            </Button>

            {/* Settings ボタン */}
            <Button
                data-testid="settings-btn"
                variant="ghost"
                size="icon"
                aria-label="Settings"
                onClick={onSettingsClick}
                className="w-8 h-8 text-muted-foreground hover:text-foreground"
            >
                <Settings size={16} />
            </Button>
        </header>
    )
}