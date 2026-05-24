import { useState } from 'react'
import { useProjectSave } from '@/hooks/useProjectSave'
import { ProjectGrid } from '@/components/ProjectGrid'
import { Topbar } from '@/components/Topbar'
import { SettingsDialog } from '@/components/SettingsDialog'

/**
 * IndexRoute
 * "/" ルートのページコンポーネント。
 *
 * [A] useProjectSave で projects[] の変化を subscribe し自動保存する。
 *     loadProjects は __root.tsx の useProjectLoad に委譲済み。
 * [B] isSettingsOpen で CTX-4 SettingsDialog の開閉を制御する。
 *
 * @see src/hooks/useProjectSave.ts
 * @see src/routes/__root.tsx
 * @see src/router.tsx
 */
export const IndexRoute = () => {
    useProjectSave()
    const [isSettingsOpen, setIsSettingsOpen] = useState(false)

    return (
        <>
            <Topbar onSettingsClick={() => setIsSettingsOpen(true)} />
            <ProjectGrid />
            <SettingsDialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />
        </>
    )
}