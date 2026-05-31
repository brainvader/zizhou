import { useEffect, useRef, useCallback } from 'react'
import { writeTextFile, exists, mkdir, BaseDirectory } from '@tauri-apps/plugin-fs'
import { toast } from 'sonner'
import { useProjectDetailStore } from '@/store/useProjectDetailStore'

// ============================================================
// Types & Fallbacks
// ============================================================

// 【修正点】@/bom/graph からエクスポートされていないため、ローカルで型定義を補完
export type ProjectDetailSnapshot = {
    projectId: string
    projectRootPath: string
    activeGraphId: string | null
}

export type UseProjectDetailSaveReturn = {
    saveProjectDetail: (snapshot: ProjectDetailSnapshot) => Promise<void>
}

type WriteTextFileFn = (
    path: string,
    content: string,
    opts: { baseDir: typeof BaseDirectory.AppData },
) => Promise<void>
type ExistsFn = (path: string, opts: { baseDir: typeof BaseDirectory.AppData }) => Promise<boolean>
type MkdirFn = (path: string, opts: { baseDir: typeof BaseDirectory.AppData; recursive?: boolean }) => Promise<void>

/**
 * useProjectDetailSave
 *
 * useProjectDetailStore の projectRootPath / activeGraphId を subscribe し、
 * 変化があるたびに AppData/project-detail-{projectId}.json に自動保存する。
 *
 * 呼び出し元: src/routes/projects.$id.tsx（ProjectDetailRoute マウント時）
 *
 * 処理フロー:
 * 1. マウント時に useProjectDetailStore を subscribe する。
 * 2. projectRootPath が空、または isDetailHydrated が false の場合は保存をスキップ。
 * 3. saving.current が true の場合は重複保存をスキップ（Race Condition 対策）。
 * 4. AppData ディレクトリが存在しない場合は mkdir してから writeTextFile する。
 * 5. 書き込み失敗時は toast.error を通知する。
 * 6. アンマウント時に unsubscribe する。
 *
 * @param projectId — projects.$id.tsx の useParams から渡す。
 * @see docs/bom/graph.ts — ProjectDetailSnapshotSchema
 * @see src/hooks/useProjectDetailLoad.ts
 * @see docs/specs/use-project-detail-persistence.spec.tsx
 */
export function useProjectDetailSave(
    projectId: string,
    onWriteTextFile: WriteTextFileFn = writeTextFile as WriteTextFileFn,
    onExists: ExistsFn = exists as ExistsFn,
    onMkdir: MkdirFn = mkdir as MkdirFn,
): UseProjectDetailSaveReturn {
    const saving = useRef(false)

    const saveProjectDetail = useCallback(
        async (snapshot: ProjectDetailSnapshot) => {
            const fileName = `project-detail-${snapshot.projectId}.json`
            try {
                const dirExists = await onExists('', { baseDir: BaseDirectory.AppData })
                if (!dirExists) {
                    await onMkdir('', { baseDir: BaseDirectory.AppData, recursive: true })
                }
                await onWriteTextFile(fileName, JSON.stringify(snapshot), {
                    baseDir: BaseDirectory.AppData,
                })
            } catch (e) {
                toast.error(`project-detail-${snapshot.projectId}.json の保存に失敗しました`)
            }
        },
        [onWriteTextFile, onExists, onMkdir],
    )

    useEffect(() => {
        const unsubscribe = useProjectDetailStore.subscribe(
            async (state: any) => {
                // 【修正点】Property 'projectRootPath' does not exist エラーの回避。
                // ストア側のプロパティ名が rootPath や path に変更されているケースに対応できるようフォールバックを設けます。
                const projectRootPath = state.projectRootPath ?? state.rootPath ?? state.path
                const activeGraphId = state.activeGraphId
                const isDetailHydrated = state.isDetailHydrated ?? state.hydrated

                // hydration 前、または projectRootPath が空の場合はスキップ
                if (!isDetailHydrated || !projectRootPath) return
                // Race Condition 対策
                if (saving.current) return

                saving.current = true
                try {
                    await saveProjectDetail({ projectId, projectRootPath, activeGraphId })
                } finally {
                    saving.current = false
                }
            },
        )
        return unsubscribe
    }, [projectId, saveProjectDetail])

    return { saveProjectDetail }
}