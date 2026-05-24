import { useCallback } from 'react'
import { readTextFile, exists, BaseDirectory } from '@tauri-apps/plugin-fs'
import { toast } from 'sonner'
import { useProjectDetailStore } from '@/store/useProjectDetailStore'
import { ProjectDetailSnapshotSchema } from '@/bom/graph'
import type { UseProjectDetailLoadReturn } from '@/bom/graph'

type ReadTextFileFn = (path: string, opts: { baseDir: typeof BaseDirectory.AppData }) => Promise<string>
type ExistsFn = (path: string, opts: { baseDir: typeof BaseDirectory.AppData }) => Promise<boolean>

/**
 * useProjectDetailLoad
 *
 * AppData/project-detail-{projectId}.json を読み込み、
 * useProjectDetailStore に projectRootPath / activeGraphId を注入する。
 *
 * 呼び出し元: src/routes/projects.$id.tsx の useEffect（マウント時に1回）
 *
 * 処理フロー:
 *   1. project-detail-{id}.json が存在する場合、JSON をパースして Zod でバリデーション。
 *      成功なら store に projectRootPath / activeGraphId を注入する。
 *   2. ファイルが存在しない場合、store を変更せずに完了する（初回アクセスは正常ケース）。
 *   3. JSON が不正 / Zod 失敗の場合、store を変更せずに toast.error を通知する。
 *   4. 完了後（成否問わず）setDetailHydrated(true) を呼ぶ。
 *
 * @see docs/bom/graph.ts — ProjectDetailSnapshotSchema
 * @see src/hooks/useProjectDetailSave.ts
 * @see docs/specs/use-project-detail-persistence.spec.tsx
 */
export function useProjectDetailLoad(
    onReadTextFile: ReadTextFileFn = readTextFile as ReadTextFileFn,
    onExists: ExistsFn = exists as ExistsFn,
): UseProjectDetailLoadReturn {
    const setProjectRootPath = useProjectDetailStore.getState().setProjectRootPath
    const setActiveGraphId = useProjectDetailStore.getState().setActiveGraphId
    const setDetailHydrated = useProjectDetailStore.getState().setDetailHydrated

    const loadProjectDetail = useCallback(
        async (projectId: string) => {
            const fileName = `project-detail-${projectId}.json`
            try {
                const fileExists = await onExists(fileName, { baseDir: BaseDirectory.AppData })
                if (!fileExists) {
                    // 初回アクセス: ファイルなしは正常。store は変更しない。
                    return
                }

                const raw = await onReadTextFile(fileName, { baseDir: BaseDirectory.AppData })
                const parsed = JSON.parse(raw)
                const result = ProjectDetailSnapshotSchema.safeParse(parsed)

                if (!result.success) {
                    toast.error(`project-detail-${projectId}.json の読み込みに失敗しました`)
                    return
                }

                setProjectRootPath(result.data.projectRootPath)
                setActiveGraphId(result.data.activeGraphId)
            } catch (e) {
                toast.error(`project-detail-${projectId}.json の読み込みに失敗しました`)
            } finally {
                setDetailHydrated(true)
            }
        },
        [onReadTextFile, onExists, setProjectRootPath, setActiveGraphId, setDetailHydrated],
    )

    return { loadProjectDetail }
}