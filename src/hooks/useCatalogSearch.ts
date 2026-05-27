import { useMemo } from 'react'
import { NODE_CATALOG } from '@/bom/graph'
import type { CatalogEntry } from '@/bom/graph'

/**
 * useCatalogSearch
 *
 * NODE_CATALOG を query で filter する。
 * CTX-13 で SurrealDB クエリに差し替える際はこのフックの内部実装のみ変更する。
 *
 * - query が空のとき全件返す
 * - query は label / service をまとめて検索（大文字小文字無視）
 *
 * @context CTX-9
 * @see docs/bom/graph.ts (NODE_CATALOG, CatalogEntry)
 */
export function useCatalogSearch(query: string): CatalogEntry[] {
    return useMemo(() => {
        const q = query.trim().toLowerCase()
        if (!q) return NODE_CATALOG
        return NODE_CATALOG.filter(
            (entry) =>
                entry.label.toLowerCase().includes(q) ||
                entry.service.toLowerCase().includes(q)
        )
    }, [query])
}