import { invoke } from '@tauri-apps/api/core'
import { toast } from 'sonner'
import { useProjectDetailStore } from '@/store/useProjectDetailStore'

// ============================================================
// 精密な型定義 (SSOT: Single Source of Truth)
// ============================================================

export type UseProjectDetailLoadReturn = {
    loadProjectDetail: (projectId: string) => Promise<void>
}

export type GraphListItem = {
    id: string
    name: string
}

type ListGraphsFn = (projectId: string) => Promise<GraphListItem[]>

// 【改善点】useProjectDetailStore が満たすべき型アノテーションを明示的に定義
export type ProjectDetailStoreType = {
    activeGraphId: string | null
    setActiveGraphId: (id: string | null) => void
    setDetailHydrated: (value: boolean) => void
}

/**
 * useProjectDetailLoad
 *
 * @context CTX-12: useProjectDetailLoad / useProjectDetailSave
 * @bom     docs/bom/graph.ts
 */
export const useProjectDetailLoad = (
    onListGraphs: ListGraphsFn = (projectId: string) => invoke('list_graphs', { projectId }),
): UseProjectDetailLoadReturn => {

    const loadProjectDetail = async (projectId: string): Promise<void> => {
        // 【改善点】getState() に対して型安全なジェネリクスまたはキャストを適用
        const store = useProjectDetailStore.getState() as ProjectDetailStoreType

        try {
            const graphs = await onListGraphs(projectId)

            if (graphs && graphs.length > 0) {
                const currentActiveGraphId = store.activeGraphId

                // 既にグラフが選択されていない場合のみ、最初のグラフをアクティブにする
                if (!currentActiveGraphId) {
                    store.setActiveGraphId(graphs[0].id)
                }
            }
        } catch (error) {
            toast.error('プロジェクト詳細の読み込みに失敗しました')
        } finally {
            // 型安全にメソッドを呼び出し（オプショナルチェイニング `?.` や any は不要）
            store.setDetailHydrated(true)
        }
    }

    return { loadProjectDetail }
}