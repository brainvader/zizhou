import { useCallback } from 'react'
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

export type ProjectDetailTopbarProps = {
    /** TanStack Router の useParams から渡されるプロジェクト ID */
    projectId: string
    /** Settings アイコンボタンクリック時のコールバック */
    onSettingsClick?: () => void
    // props DI
    project?: Project
    initStatus?: InitStatus
    projectRootPath?: string
    onSetActiveGraphId?: (id: string) => void
    onWriteTextFile?: WriteTextFileFn
}

/**
 * ProjectDetailTopbar
 *
 * 責務: project-detail 画面のヘッダー。
 * - 地蔵ロゴ
 * - プロジェクト名 breadcrumb（projectId prop → useProjectStore で解決）
 * - New Graph ボタン（initStatus が 'ready' 以外のとき disabled）
 * - Settings ボタン（onSettingsClick コールバック経由）
 *
 * props DI: project / initStatus / projectRootPath / onSetActiveGraphId /
 *           onWriteTextFile を props で受け取る。
 * 省略時は Tauri 実装・Zustand store にフォールバックする。
 *
 * @see docs/bom/graph.ts
 * @see docs/bom/project.ts
 * @see docs/specs/project-detail-topbar.spec.tsx
 * @see docs/specs/project-detail-topbar.e2e.spec.ts
 */
export const ProjectDetailTopbar = ({
    projectId,
    onSettingsClick,
    project: projectProp,
    initStatus: initStatusProp,
    projectRootPath: projectRootPathProp,
    onSetActiveGraphId,
    onWriteTextFile = writeTextFile,
}: ProjectDetailTopbarProps) => {
    const storeProject = useProjectStore((s) => s.projects.find((p) => p.id === projectId))
    const storeInitStatus = useProjectDetailStore((s) => s.initStatus)
    const storeProjectRootPath = useProjectDetailStore((s) => s.projectRootPath)
    const storeSetActiveGraphId = useProjectDetailStore((s) => s.setActiveGraphId)

    const project = projectProp ?? storeProject
    const initStatus = initStatusProp ?? storeInitStatus
    const projectRootPath = projectRootPathProp ?? storeProjectRootPath
    const setActiveGraphId = onSetActiveGraphId ?? storeSetActiveGraphId

    // --- New Graph ---
    const handleNewGraph = useCallback(async () => {
        const graphId = nanoid()
        const filePath = graphFilePath(projectRootPath, graphId)
        const graphFile: GraphFile = { id: graphId, nodes: [], edges: [] }

        try {
            await onWriteTextFile(filePath, JSON.stringify(graphFile, null, 2))
            setActiveGraphId(graphId)
        } catch {
            toast.error('グラフファイルの作成に失敗しました')
        }
    }, [projectRootPath, setActiveGraphId, onWriteTextFile])

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
                    <span className="font-mono text-[8px] text-[#454a52] tracking-[0.15em]">
                        Protocol v7.00
                    </span>
                </div>
            </div>

            {/* Breadcrumb */}
            {project && (
                <>
                    <span
                        data-testid="breadcrumb-sep"
                        className="text-border text-base mx-1.5 select-none"
                    >
                        /
                    </span>
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