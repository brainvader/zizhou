import { useCallback } from 'react'
import { open } from '@tauri-apps/plugin-dialog'
import { FolderOpen } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

type OpenDirectoryFn = () => Promise<string | null>

export type RootPathInputProps = {
    value: string
    onChange: (value: string) => void
    error?: string | null
    /** フォルダ選択ダイアログを開く関数（省略時は Tauri plugin-dialog にフォールバック） */
    onOpenDirectory?: OpenDirectoryFn
}

/**
 * RootPathInput
 *
 * rootPath フィールド用の入力コンポーネント。
 * テキスト入力に加え、フォルダアイコンボタンで OS のフォルダ選択ダイアログを開ける。
 *
 * props DI: onOpenDirectory を props で受け取る。
 * 省略時は Tauri plugin-dialog の open() にフォールバックする。
 *
 * @see docs/bom/project.ts
 */
export const RootPathInput = ({
    value,
    onChange,
    error,
    onOpenDirectory,
}: RootPathInputProps) => {
    const openDirectory: OpenDirectoryFn = onOpenDirectory ?? (async () => {
        const selected = await open({ directory: true, multiple: false })
        return typeof selected === 'string' ? selected : null
    })

    const handleOpenDirectory = useCallback(async () => {
        const selected = await openDirectory()
        if (selected !== null) {
            onChange(selected)
        }
    }, [openDirectory, onChange])

    return (
        <div className="flex flex-col gap-1.5">
            <Label htmlFor="project-root-path" className="font-mono text-xs tracking-wide">
                root path *
            </Label>
            <div className="flex gap-2">
                <Input
                    id="project-root-path"
                    placeholder="/Users/user/projects/my-app"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className={error ? 'border-destructive' : ''}
                />
                <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleOpenDirectory}
                    aria-label="フォルダを選択"
                >
                    <FolderOpen size={16} />
                </Button>
            </div>
            {error && (
                <span className="font-mono text-xs text-destructive">{error}</span>
            )}
        </div>
    )
}