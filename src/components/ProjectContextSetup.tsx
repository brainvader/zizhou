import { Button } from '@/components/ui/button'
import { zizhouContextPath } from '@/bom/zizhou-context'

export type ProjectContextSetupProps = {
    projectName: string
    rootPath: string
    /** 「作成する」クリック。親が ensure して遷移する */
    onCreate: () => void | Promise<void>
    /** 「戻る」クリック */
    onBack?: () => void
    isCreating?: boolean
    error?: string | null
}

/**
 * ProjectContextSetup
 * .zizhou/context が無いとき、作成を促すゲート UI。
 *
 * @see docs/context/ContextMap.projects.html
 * @see src/lib/ensureZizhouContext.ts
 */
export function ProjectContextSetup({
    projectName,
    rootPath,
    onCreate,
    onBack,
    isCreating = false,
    error = null,
}: ProjectContextSetupProps) {
    const targetPath = zizhouContextPath(rootPath)

    return (
        <div
            data-testid="project-context-setup"
            className="flex flex-col items-center justify-center gap-6 h-screen bg-background text-foreground px-6"
        >
            <div className="max-w-md w-full flex flex-col gap-4">
                <h1 className="text-lg font-semibold">ContextMap 置き場がありません</h1>
                <p className="text-sm text-muted-foreground leading-relaxed">
                    「{projectName}」に ContextMap 用の{' '}
                    <span className="font-mono text-foreground">.zizhou/context</span>{' '}
                    を作成しますか？
                </p>
                <p
                    data-testid="setup-target-path"
                    className="font-mono text-[11px] text-muted-foreground break-all"
                >
                    {targetPath}
                </p>
                {error && (
                    <p
                        data-testid="setup-error"
                        className="text-sm text-destructive"
                    >
                        {error}
                    </p>
                )}
                <div className="flex gap-3 mt-2">
                    <Button
                        data-testid="ensure-zizhou-context"
                        onClick={() => void onCreate()}
                        disabled={isCreating}
                    >
                        {isCreating ? '作成中…' : '作成する'}
                    </Button>
                    {onBack && (
                        <Button
                            data-testid="setup-back"
                            variant="outline"
                            onClick={onBack}
                            disabled={isCreating}
                        >
                            戻る
                        </Button>
                    )}
                </div>
            </div>
        </div>
    )
}
