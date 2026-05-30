/**
 * @tauri-apps/api/core のテスト用モック。
 * VITE_PLAYWRIGHT=true のとき vite.config.ts の alias で差し替えられる。
 *
 * catalog_get_all: NODE_CATALOG を返す（SurrealDB の初期データと同等）
 * catalog_search:  query で label / service を filter して返す
 * execute_node:    即時 success:true を返す（E2E では実際の CLI を呼ばない）[CTX-14]
 */
import { NODE_CATALOG } from '@/bom/graph'
import type { CatalogEntry } from '@/bom/graph'
import type { ExecuteResponse } from '@/bom/execute'

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

        // [CTX-14] E2E 用モック: 即時成功を返す
        case 'execute_node': {
            const response: ExecuteResponse = {
                success: true,
                output: { stdout: '[mock] executed successfully', stderr: '' },
                error: null,
            }
            return response as unknown as T
        }

        default:
            throw new Error(`[mock] invoke: unknown command "${command}"`)
    }
}