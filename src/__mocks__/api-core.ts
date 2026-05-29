/**
 * @tauri-apps/api/core のテスト用モック。
 * VITE_PLAYWRIGHT=true のとき vite.config.ts の alias で差し替えられる。
 *
 * catalog_get_all: NODE_CATALOG を返す（SurrealDB の初期データと同等）
 * catalog_search:  query で label / service を filter して返す
 */
import { NODE_CATALOG } from '@/bom/graph'
import type { CatalogEntry } from '@/bom/graph'

export async function invoke<T>(
    command: string,
    args?: Record<string, unknown>
): Promise<T> {
    switch (command) {
        case 'catalog_get_all':
            return NODE_CATALOG as unknown as T

        case 'catalog_search': {
            const query = ((args?.query as string) ?? '').toLowerCase()
            const results: CatalogEntry[] = NODE_CATALOG.filter(
                (e) =>
                    e.label.toLowerCase().includes(query) ||
                    e.service.toLowerCase().includes(query)
            )
            return results as unknown as T
        }

        default:
            throw new Error(`[mock] invoke: unknown command "${command}"`)
    }
}