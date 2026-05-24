import { useEffect, useRef, useCallback } from 'react'
import { writeTextFile, exists, mkdir, BaseDirectory } from '@tauri-apps/plugin-fs'
import { toast } from 'sonner'
import { useProjectStore } from '@/store/useProjectStore'
import type { UseProjectSaveReturn } from '@/bom/project'

const FILE_OPTIONS = { baseDir: BaseDirectory.AppData } as const
const FILE_NAME = 'projects.json'

/**
 * useProjectSave
 * projects[] の変化を subscribe で監視し projects.json に自動保存する hook。
 * IndexRoute で呼び出す。
 *
 * - useProjectStore.isHydrated が true になるまで保存をスキップする。
 * - saving.current が true の間は重複保存をスキップする（Race Condition 対策）。
 * - エラーは toast.error() で通知する（Store にエラー状態は持たない）。
 *
 * @see docs/bom/project.ts UseProjectSaveReturn
 */
export const useProjectSave = (): UseProjectSaveReturn => {
    const saving = useRef(false)

    const saveProjects = useCallback(async (
        projects: ReturnType<typeof useProjectStore.getState>['projects']
    ): Promise<void> => {
        if (saving.current) return
        saving.current = true
        try {
            const dirExists = await exists('', { baseDir: BaseDirectory.AppData })
            if (!dirExists) {
                await mkdir('', { baseDir: BaseDirectory.AppData, recursive: true })
            }
            await writeTextFile(FILE_NAME, JSON.stringify(projects, null, 2), FILE_OPTIONS)
        } catch {
            toast.error('projects.json の保存に失敗しました')
        } finally {
            saving.current = false
        }
    }, [])

    useEffect(() => {
        const unsubscribe = useProjectStore.subscribe((state) => {
            if (!state.isHydrated) return
            saveProjects(state.projects)
        })
        return () => unsubscribe()
    }, [saveProjects])

    return { saveProjects }
}