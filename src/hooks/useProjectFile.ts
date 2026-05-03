import { useEffect } from 'react'
import { readTextFile, writeTextFile, exists, BaseDirectory } from '@tauri-apps/plugin-fs'
import { toast } from 'sonner'
import { useProjectStore } from '@/store/useProjectStore'
import type { UseProjectFileReturn } from '@/bom/project'

/** projects.json のパスオプション（AppData に保存） */
const FILE_OPTIONS = { baseDir: BaseDirectory.AppData } as const
const FILE_NAME = 'projects.json'

/**
 * useProjectFile
 * Tauri fs を使った projects.json の永続化 hook。
 *
 * [A] loadProjects: 起動時に一度だけ呼ぶ。
 *     projects.json が存在しない場合は [] で初期化する。
 *     不正 JSON の場合は [] にフォールバックし toast.error() で通知する。
 *
 * [永続化] useEffect 内の subscribe で projects[] の変化を監視し、
 *     saveProjects を自動呼び出しする。
 *     エラーは toast.error() で通知する（Store にエラー状態は持たない）。
 *
 * @see docs/bom/project.ts UseProjectFileReturn
 */
export const useProjectFile = (): UseProjectFileReturn => {
    useEffect(() => {
        const unsubscribe = useProjectStore.subscribe((state) => {
            saveProjects(state.projects)
        })
        return () => unsubscribe()
    }, [])

    const loadProjects = async (): Promise<void> => {
        try {
            const fileExists = await exists(FILE_NAME, FILE_OPTIONS)
            if (!fileExists) {
                useProjectStore.getState().setProjects([])
                return
            }
            const text = await readTextFile(FILE_NAME, FILE_OPTIONS)
            const projects = JSON.parse(text)
            useProjectStore.getState().setProjects(projects)
        } catch {
            useProjectStore.getState().setProjects([])
            toast.error('projects.json の読み込みに失敗しました')
        }
    }

    const saveProjects = async (projects: ReturnType<typeof useProjectStore.getState>['projects']): Promise<void> => {
        try {
            await writeTextFile(FILE_NAME, JSON.stringify(projects, null, 2), FILE_OPTIONS)
        } catch {
            toast.error('projects.json の保存に失敗しました')
        }
    }

    return { loadProjects, saveProjects }
}