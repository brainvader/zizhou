import { invoke } from '@tauri-apps/api/core'
import { toast } from 'sonner'
import { useProjectStore } from '@/store/useProjectStore'
import type { Project, UseProjectLoadReturn } from '@/bom/project'

type ListProjectsFn = () => Promise<Project[]>

/**
 * useProjectLoad
 * 起動時に一度だけ SurrealDB から projects を読み込み Zustand に hydrate する hook。
 * __root.tsx で呼び出す。
 *
 * - invoke('list_projects') が失敗した場合は [] にフォールバックし toast.error() で通知する。
 * - 完了後に useProjectStore.setHydrated(true) を呼ぶ（SSOT は Zustand）。
 *
 * @see docs/bom/project.ts UseProjectLoadReturn
 */
export const useProjectLoad = (
    onListProjects: ListProjectsFn = () => invoke('list_projects'),
): UseProjectLoadReturn => {
    const loadProjects = async (): Promise<void> => {
        try {
            const projects = await onListProjects()
            useProjectStore.getState().setProjects(projects)
        } catch {
            useProjectStore.getState().setProjects([])
            toast.error('プロジェクトの読み込みに失敗しました')
        } finally {
            useProjectStore.getState().setHydrated(true)
        }
    }

    return { loadProjects }
}