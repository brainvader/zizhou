import { useCallback } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { useGraphStore } from '@/store/useGraphStore'
import { useProjectDetailStore } from '@/store/useProjectDetailStore'
import { useProjectStore } from '@/store/useProjectStore'
import { buildLlmExport } from '@/bom/llm-export'
import type { LlmExportPayload } from '@/bom/llm-export'
import type { CatalogEntry } from '@/bom/graph'

export type UseGraphExportOptions = {
    projectId: string
    /** props DI: 省略時は invoke('catalog_get_all') を使用する */
    onGetAll?: () => Promise<CatalogEntry[]>
}

export type UseGraphExportReturn = {
    exportGraph: () => Promise<LlmExportPayload>
}

/**
 * useGraphExport
 *
 * 現在のグラフ（nodes/edges）とカタログを LlmExportPayload に変換して返す。
 * クリップボードへのコピーやファイル保存は呼び出し側（ExportModal）が担う。
 *
 * - nodes/edges は useGraphStore から取得する
 * - catalog は invoke('catalog_get_all') または props DI の onGetAll で取得する
 * - activeGraphId / projectName は各 store から取得する
 *
 * @context CTX-10
 * @see docs/bom/llm-export.ts
 * @see docs/specs/graph-export-import.spec.ts
 */
export function useGraphExport({
    projectId,
    onGetAll = () => invoke<CatalogEntry[]>('catalog_get_all'),
}: UseGraphExportOptions): UseGraphExportReturn {
    const nodes = useGraphStore((s) => s.nodes)
    const edges = useGraphStore((s) => s.edges)
    const activeGraphId = useProjectDetailStore((s) => s.activeGraphId)
    const project = useProjectStore((s) => s.projects.find((p) => p.id === projectId))

    const exportGraph = useCallback(async (): Promise<LlmExportPayload> => {
        const catalog = await onGetAll()
        return buildLlmExport({
            projectId,
            projectName: project?.name ?? projectId,
            graphId: activeGraphId ?? '',
            nodes,
            edges,
            catalog,
        })
    }, [projectId, project?.name, activeGraphId, nodes, edges, onGetAll])

    return { exportGraph }
}