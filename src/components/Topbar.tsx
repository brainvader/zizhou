import { Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'

type TopbarProps = {
    /** Settings アイコンボタンクリック時のコールバック */
    onSettingsClick?: () => void
}

/**
 * Topbar
 * アプリ識別（地蔵ロゴ）とグローバルアクション（Settings）を提供するヘッダー。
 *
 * @see docs/bom/project.ts
 * @see docs/specs/topbar.spec.tsx
 * @see docs/specs/topbar.e2e.spec.ts
 */
export const Topbar = ({ onSettingsClick }: TopbarProps) => {
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
                    <span className="font-mono text-[8px] text-[#8a9099] tracking-[0.15em]">
                        Protocol v7.00
                    </span>
                </div>
            </div>

            {/* スペーサー */}
            <div className="flex-1" />

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