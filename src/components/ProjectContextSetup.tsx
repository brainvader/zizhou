import { Button } from '@/components/ui/button'
import { zizhouContextPath } from '@/bom/zizhou-context'
import { cn } from '@/lib/utils'

export type ProjectContextSetupProps = {
    projectName: string
    rootPath: string
    /** 「作成する」クリック。親が ensure する */
    onCreate: () => void | Promise<void>
    isCreating?: boolean
    error?: string | null
    /** inline: グラフ上バナー / page: 全画面（Story 用） */
    variant?: 'inline' | 'page'
}

/**
 * ProjectContextSetup
 * .zizhou/context が無いとき、作成を促す UI。
 * Workspace では inline バナーとしてグラフと併せて表示する。
 *
 * @see docs/context/ContextMap.projects.html
 * @see src/lib/ensureZizhouContext.ts
 */
export function ProjectContextSetup({
    projectName,
    rootPath,
    onCreate,
    isCreating = false,
    error = null,
    variant = 'inline',
}: ProjectContextSetupProps) {
    const targetPath = zizhouContextPath(rootPath)

    return (
        <div
            data-testid="project-context-setup"
            className={cn(
                'bg-card border border-border rounded-lg px-4 py-3 text-foreground',
                variant === 'page' &&
                    'flex flex-col items-center justify-center gap-6 h-screen px-6 border-0 rounded-none',
            )}
        >
            <div
                className={cn(
                    'flex flex-col gap-2',
                    variant === 'page' ? 'max-w-md w-full gap-4' : 'w-full',
                )}
            >
                <h1 className="text-sm font-semibold">
                    ContextMap 置き場がありません
                </h1>
                <p className="text-xs text-muted-foreground leading-relaxed">
                    「{projectName}」に{' '}
                    <span className="font-mono text-foreground">.zizhou/context</span>{' '}
                    を作成しますか？グラフは先に表示しています。
                </p>
                <p
                    data-testid="setup-target-path"
                    className="font-mono text-[10px] text-muted-foreground break-all"
                >
                    {targetPath}
                </p>
                {error && (
                    <p data-testid="setup-error" className="text-xs text-destructive">
                        {error}
                    </p>
                )}
                <div className="flex gap-2 mt-1">
                    <Button
                        data-testid="ensure-zizhou-context"
                        size="sm"
                        onClick={() => void onCreate()}
                        disabled={isCreating}
                    >
                        {isCreating ? '作成中…' : '作成する'}
                    </Button>
                </div>
            </div>
        </div>
    )
}
