/**
 * @tauri-apps/api/core のテスト用モック。
 * VITE_PLAYWRIGHT=true のとき vite.config.ts の alias で差し替えられる。
 *
 * catalog_get_all:  NODE_CATALOG を返す（SurrealDB の初期データと同等）
 * catalog_search:   query で label / service を filter して返す
 * execute_node:     即時 success:true を返す（E2E では実際の CLI を呼ばない）[CTX-14]
 * list_projects:    インメモリの projects[] を返す
 * create_project:   インメモリに project を追加して返す
 * list_graphs:      インメモリの graphs[] を返す
 * create_graph:     インメモリに graph を追加して返す
 */
import { NODE_CATALOG } from '@/bom/graph'
import type { CatalogEntry } from '@/bom/graph'
import type { ExecuteResponse } from '@/bom/execute'

// ── インメモリストア ──────────────────────────────────────────────────────

type MockProject = { id: string; name: string; description?: string }
type MockGraph = { id: string; name: string; project_id: string }

const _projects: MockProject[] = []
const _graphs: MockGraph[] = []
let _idCounter = 1

// ── invoke モック ─────────────────────────────────────────────────────────

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

        case 'execute_node': {
            const response: ExecuteResponse = {
                success: true,
                output: { stdout: '[mock] executed successfully', stderr: '' },
                error: null,
            }
            return response as unknown as T
        }

        case 'list_projects':
            return [..._projects] as unknown as T

        case 'create_project': {
            const name = args?.name as string
            const description = args?.description as string | undefined
            const project: MockProject = {
                id: `project:mock-${_idCounter++}`,
                name,
                ...(description ? { description } : {}),
            }
            _projects.push(project)
            return project as unknown as T
        }

        case 'list_graphs': {
            const projectId = args?.projectId as string
            const results = _graphs.filter((g) => g.project_id === projectId)
            return results as unknown as T
        }

        case 'create_graph': {
            const name = args?.name as string
            const projectId = args?.projectId as string
            const graph: MockGraph = {
                id: `graph:mock-${_idCounter++}`,
                name,
                project_id: projectId,
            }
            _graphs.push(graph)
            return graph as unknown as T
        }

        default:
            throw new Error(`[mock] invoke: unknown command "${command}"`)
    }
}