import { create } from 'zustand'
import type { ProjectDetailStore } from '@/bom/graph'

export const useProjectDetailStore = create<ProjectDetailStore>((set) => ({
    // State
    activeGraphId: null,
    initStatus: 'checking',
    projectRootPath: '',

    // Actions
    setActiveGraphId: (id) => set({ activeGraphId: id }),
    setInitStatus: (status) => set({ initStatus: status }),
    setProjectRootPath: (path) => set({ projectRootPath: path }),
}))