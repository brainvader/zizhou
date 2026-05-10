import { useCallback } from 'react'
import { useParams } from '@tanstack/react-router'
import { nanoid } from 'nanoid'
import { writeTextFile } from '@tauri-apps/plugin-fs'
import { toast } from 'sonner'
import { Settings, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useProjectStore } from '@/store/useProjectStore'
import { useProjectDetailStore } from '@/store/useProjectDetailStore'
import { graphFilePath } from '@/bom/graph'
import type { GraphFile } from '@/bom/graph'

type ProjectDetailTopbarProps = {
    /** Settings アイコンボタンクリック時のコールバック */
    onSettingsClick?: () => void
}

/**
 * ProjectDetailTopbar
 *
 * 責務: project-detail 画面のヘッダー。
 * - 地蔵ロゴ（Topbar から継承）
 * - プロジェクト名 breadcrumb（useParams の id → useProjectStore で解決）
 * - New Graph ボタン（initStatus が 'ready' 以外のとき disabled）
 * - Settings ボタン（onSettingsClick コールバック経由）
 *
 * local-state なし（ステートレス）。
 * breadcrumb のプロジェクト名は useProjectStore から引く。
 *
 * @see docs/bom/graph.ts
 * @see docs/bom/project.ts
 * @see docs/specs/project-detail-topbar.spec.tsx
 * @see docs/specs/project-detail-topbar.e2e.spec.ts
 */
export const ProjectDetailTopbar = ({ onSettingsClick }: ProjectDetailTopbarProps) => {
    const { id } = useParams({ from: '/projects/$id' })

    const project = useProjectStore((s) => s.projects.find((p) => p.id === id))

    const initStatus = useProjectDetailStore((s) => s.initStatus)
    const projectRootPath = useProjectDetailStore((s) => s.projectRootPath)
    const setActiveGraphId = useProjectDetailStore((s) => s.setActiveGraphId)

    // --- New Graph ---
    const handleNewGraph = useCallback(async () => {
        const graphId = nanoid()
        const filePath = graphFilePath(projectRootPath, graphId)
        const graphFile: GraphFile = { id: graphId, nodes: [], edges: [] }

        try {
            // NOTE: 絶対パスで書き込むため第3引数（options/baseDir）は不要。
            await writeTextFile(filePath, JSON.stringify(graphFile, null, 2))
            setActiveGraphId(graphId)
        } catch {
            toast.error('グラフファイルの作成に失敗しました')
        }
    }, [projectRootPath, setActiveGraphId])

    return (
        <header
            data-testid="topbar"
            className="h-13 bg-card border-b border-border flex items-center px-5.5 gap-4 shrink-0 shadow-[inset_0_1px_0_#c0392b28]"
        >
            {/* ロゴ */}
            <div className="flex items-center gap-3">
                {/* 漢字 + 朱色アンダーライン */}
                <div className="relative inline-block after:content-[''] after:absolute after:-bottom-0.75 after:left-0 after:right-0 after:h-0.5 after:bg-primary after:rounded-sm after:opacity-80">
                    <span
                        className="font-serif text-[20px] font-normal text-foreground tracking-[0.15em] leading-none drop-shadow-sm"
                        style={{ fontFamily: "'Noto Serif JP', serif" }}
                    >
                        地蔵
                    </span>
                </div>

                {/* セパレーター */}
                <div className="w-px h-4.5 bg-border" />

                {/* romaji + version */}
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