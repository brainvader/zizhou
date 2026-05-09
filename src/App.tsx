import { useEffect, useState } from 'react'
import { useProjectFile } from '@/hooks/useProjectFile'
import { ProjectGrid } from '@/components/ProjectGrid'
import { Topbar } from '@/components/Topbar'
import { SettingsDialog } from '@/components/SettingsDialog'
import "./App.css";

/**
 * App
 * [A] 起動時に loadProjects を一度だけ呼び、projects.json を Zustand に Hydrate する。
 * [B] isSettingsOpen で CTX-4 SettingsDialog の開閉を制御する。
 * @see docs/bom/project.ts useProjectFile hook の責務
 */
function App() {
  const { loadProjects, isHydrated } = useProjectFile()
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  useEffect(() => {
    loadProjects()
  }, [loadProjects])

  return (
    <>
      <Topbar onSettingsClick={() => setIsSettingsOpen(true)} />
      <ProjectGrid isHydrated={isHydrated} />
      <SettingsDialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />
    </>
  )
}

export default App