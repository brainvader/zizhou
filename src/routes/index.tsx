import { useState } from 'react'
import { ProjectGrid } from '@/components/ProjectGrid'
import { Topbar } from '@/components/Topbar'
import { SettingsDialog } from '@/components/SettingsDialog'

/**
 * IndexRoute
 * "/" ルートのページコンポーネント。
 *
 * [A] loadProjects は __root.tsx の useProjectLoad に委譲済み。
 * [B] isSettingsOpen で CTX-4 SettingsDialog の開閉を制御する。
 *
 * @see src/routes/__root.tsx
 * @see src/router.tsx
 */
export const IndexRoute = () => {
    const [isSettingsOpen, setIsSettingsOpen] = useState(false)

    return (
        <>
            <Topbar onSettingsClick={() => setIsSettingsOpen(true)} />
            <ProjectGrid />
            <SettingsDialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />
        </>
    )
}