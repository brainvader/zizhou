import { create } from 'zustand'
import type { ProjectDetailStore } from '@/bom/graph'

/**
 * useProjectDetailStore
 *
 * project-detail 画面のグローバル状態。
 * activeProjectId は TanStack Router の useParams から取得する。
 * projectRootPath / activeGraphId は:
 *   1. useProjectDetailLoad が AppData/project-detail-{id}.json から復元する（直アクセス時）
 *   2. projects.$id.tsx の useEffect が project?.rootPath / URL ?graph= から注入する（通常遷移時）
 *
 * isDetailHydrated:
 *   useProjectDetailLoad 完了後に true になる。
 *   useProjectDetailSave が hydration 前の保存をスキップするために使用する（save-before-load 防止）。
 *
 * @see src/hooks/useProjectDetailLoad.ts
 * @see src/hooks/useProjectDetailSave.ts
 * @see docs/bom/graph.ts
 */
export const useProjectDetailStore = create<ProjectDetailStore>((set) => ({
    // State
    activeGraphId: null,
    initStatus: 'checking',
    projectRootPath: '',
    isDetailHydrated: false,

    // Actions
    setActiveGraphId: (id) => set({ activeGraphId: id }),
    setInitStatus: (status) => set({ initStatus: status }),
    setProjectRootPath: (path) => set({ projectRootPath: path }),
    setDetailHydrated: (value) => set({ isDetailHydrated: value }),
}))