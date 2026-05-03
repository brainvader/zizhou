import { useEffect } from 'react'
import { useProjectFile } from '@/hooks/useProjectFile'
import { ProjectGrid } from '@/components/ProjectGrid'
import "./App.css";

/**
 * App
 * [A] 起動時に loadProjects を一度だけ呼び、projects.json を Zustand に Hydrate する。
 * @see docs/bom/project.ts useProjectFile hook の責務
 */
function App() {
  const { loadProjects, isHydrated } = useProjectFile()

  useEffect(() => {
    loadProjects()
  }, [loadProjects])

  return <ProjectGrid isHydrated={isHydrated} />
}

export default App