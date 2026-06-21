import { useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { toast } from 'sonner'
import { useProjectDetailStore } from '@/store/useProjectDetailStore'
import type { GraphListItem } from '@/bom/graph'

/**
 * useGraphList
 *
 * マウント時に list_graphs を呼び、activeGraphId を store に注入する。
 * 完了後に setDetailHydrated(true) を呼ぶ。
 *
 * @param projectId プロジェクト ID
 * @context CTX-12
 */
export function useGraphList(projectId: string): void {
    const setDetailHydrated = useProjectDetailStore((s) => s.setDetailHydrated)

    useEffect(() => {
        const { activeGraphId, setActiveGraphId } = useProjectDetailStore.getState()
        invoke<GraphListItem[]>('list_graphs', { projectId })
            .then((graphs) => {
                if (graphs.length > 0 && !activeGraphId) {
                    setActiveGraphId(graphs[0].id)
                }
            })
            .catch(() => toast.error('プロジェクト詳細の読み込みに失敗しました'))
            .finally(() => setDetailHydrated(true))
    }, [projectId, setDetailHydrated])
}