import { create } from 'zustand'
import type { ProjectStore } from '@/bom/project'

/**
 * useProjectStore
 * Zustand global-store。projects[] の SSOT。
 * routing は TanStack Router に委譲するため持たない。
 * 永続化は useProjectFile hook に委譲する。
 * @see docs/bom/project.ts ProjectStore
 */
export const useProjectStore = create<ProjectStore>((set) => ({
    projects: [],
    isHydrated: false,

    addProject: (project) =>
        set((state) => ({ projects: [...state.projects, project] })),

    setProjects: (projects) => set({ projects }),

    setHydrated: (value) => set({ isHydrated: value }),
}))