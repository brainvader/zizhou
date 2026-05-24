import { useCallback } from 'react'
import { readTextFile, exists, BaseDirectory } from '@tauri-apps/plugin-fs'
import { toast } from 'sonner'
import { useProjectStore } from '@/store/useProjectStore'
import { ProjectSchema } from '@/bom/project'
import type { UseProjectLoadReturn } from '@/bom/project'

const FILE_OPTIONS = { baseDir: BaseDirectory.AppData } as const
const FILE_NAME = 'projects.json'

/**
 * useProjectLoad
 * 起動時に一度だけ projects.json を読み込み Zustand に hydrate する hook。
 * __root.tsx で呼び出す。
 *
 * - projects.json が存在しない場合は [] で初期化する。
 * - JSON パース失敗・Zod バリデーション失敗・fs エラーはすべて [] にフォールバックし toast.error() で通知する。
 * - 完了後に useProjectStore.setHydrated(true) を呼ぶ（SSOT は Zustand）。
 *
 * @see docs/bom/project.ts UseProjectLoadReturn
 */
export const useProjectLoad = (): UseProjectLoadReturn => {
    const loadProjects = useCallback(async (): Promise<void> => {
        try {
            const fileExists = await exists(FILE_NAME, FILE_OPTIONS)
            if (!fileExists) {
                useProjectStore.getState().setProjects([])
                return
            }
            const text = await readTextFile(FILE_NAME, FILE_OPTIONS)
            const result = ProjectSchema.array().safeParse(JSON.parse(text))
            if (!result.success) {
                useProjectStore.getState().setProjects([])
                toast.error('projects.json の読み込みに失敗しました')
                return
            }
            useProjectStore.getState().setProjects(result.data)
        } catch {
            useProjectStore.getState().setProjects([])
            toast.error('projects.json の読み込みに失敗しました')
        } finally {
            useProjectStore.getState().setHydrated(true)
        }
    }, [])

    return { loadProjects }
}