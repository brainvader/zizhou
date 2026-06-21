import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

/**
 * CTX-4: SETTINGS DIALOG
 *
 * @description
 * Topbar の Settings アイコンボタンからトリガーされる設定ダイアログ。
 * 現時点では「閉じる」ボタンと overlay クリックによるクローズのみ実装。
 * 設定項目は今後 onOpenChange を通じて親から制御する形で拡張する。
 *
 * @example
 * const [open, setOpen] = useState(false)
 * <SettingsDialog open={open} onOpenChange={setOpen} />
 *
 * @see docs/specs/settings-dialog.spec.tsx
 * @see docs/specs/settings-dialog.e2e.spec.ts
 */

export type SettingsDialogProps = {
    /** ダイアログの開閉状態 */
    open: boolean
    /** 開閉状態の変更コールバック（shadcn Dialog の制御インターフェース準拠） */
    onOpenChange: (open: boolean) => void
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Settings</DialogTitle>
                    <DialogDescription className="sr-only">
                        アプリケーションの設定を変更します
                    </DialogDescription>
                </DialogHeader>

                <div className="flex justify-end pt-1">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                    >
                        閉じる
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}