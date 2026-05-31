import { useCallback } from 'react'
import { Link } from '@tanstack/react-router'
import { nanoid } from 'nanoid'
import { writeTextFile } from '@tauri-apps/plugin-fs'
import { toast } from 'sonner'
import { Settings, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useProjectStore } from '@/store/useProjectStore'
import { useProjectDetailStore } from '@/store/useProjectDetailStore'
import { graphFilePath } from '@/bom/graph'
import type { GraphFile, InitStatus } from '@/bom/graph'
import type { Project } from '@/bom/project'

type WriteTextFileFn = (path: string, contents: string) => Promise<void>
type NavigateFn = (graphId: string) => void

export type ProjectDetailTopbarProps = {
    projectId: string
    onSettingsClick?: () => void
    project?: Project
    initStatus?: InitStatus
    projectRootPath?: string
    /**
     * New Graph 作成後のナビゲーション。
     * 省略時は router.navigate にフォールバックするため、
     * Storybook / テストでは必ず渡すこと。
     */
    onNavigate: NavigateFn
    onWriteTextFile?: WriteTextFileFn
    /** props DI: Storybook / テスト用。省略時は TanStack Router の Link を使用 */
    LinkComponent?: React.ComponentType<{ to: string; children: React.ReactNode; className?: string }>
}

const DefaultLink = ({ to, children, className }: { to: string; children: React.ReactNode; className?: string }) => (
    <Link to={to} search={{}} className={className}>{children}</Link>
)

export const ProjectDetailTopbar = ({
    projectId,
    onSettingsClick,
    project: projectProp,
    initStatus: initStatusProp,
    projectRootPath: projectRootPathProp,
    onNavigate,
    onWriteTextFile = writeTextFile,
    LinkComponent,
}: ProjectDetailTopbarProps) => {
    const storeProject = useProjectStore((s) => s.projects.find((p) => p.id === projectId))
    const storeInitStatus = useProjectDetailStore((s) => s.initStatus)
    const storeProjectRootPath = useProjectDetailStore((s) => s.projectRootPath)

    const project = projectProp ?? storeProject
    const initStatus = initStatusProp ?? storeInitStatus
    const projectRootPath = projectRootPathProp ?? storeProjectRootPath

    const NavLink = LinkComponent ?? DefaultLink

    const handleNewGraph = useCallback(async () => {
        const graphId = nanoid()
        const filePath = graphFilePath(projectRootPath, graphId)
        const graphFile: GraphFile = { id: graphId, nodes: [], edges: [] }

        try {
            await onWriteTextFile(filePath, JSON.stringify(graphFile, null, 2))
            toast.success('グラフを作成しました')
            onNavigate(graphId)
        } catch {
            toast.error('グラフファイルの作成に失敗しました')
        }
    }, [projectRootPath, onNavigate, onWriteTextFile])

    return (
        <header
            data-testid="topbar"
            className="h-13 bg-card border-b border-border flex items-center px-5.5 gap-4 shrink-0 shadow-[inset_0_1px_0_#c0392b28]"
        >
            {/* ロゴ */}
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
                        Protocol v7.00
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

            {/* スペーサー */}
            <div className="flex-1" />

            {/* New Graph ボタン */}
            <Button
                data-testid="new-graph-btn"
                variant="ghost"
                size="icon"
                aria-label="New Graph"
                disabled={initStatus !== 'ready'}
                onClick={handleNewGraph}
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