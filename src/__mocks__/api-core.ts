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
 * save_graph:       インメモリの nodes/edges を graph_id でキーに保存する [CTX-15]
 * load_graph:       インメモリの nodes/edges を GraphFile 形式で返す [CTX-15]
 */
import { NODE_CATALOG } from '@/bom/graph'
import type { CatalogEntry } from '@/bom/graph'
import type { ExecuteResponse } from '@/bom/execute'

// ── インメモリストア ──────────────────────────────────────────────────────

type MockProject = { id: string; name: string; description?: string }
type MockGraph = { id: string; name: string; project_id: string }

type MockNode = {
    id: string
    label: string
    node_type?: string | null
    status?: string | null
    service?: string | null
    provider?: string | null
    input?: Record<string, unknown> | null
    description?: string | null
    position_x: number
    position_y: number
}

type MockEdge = {
    id: string
    source: string
    target: string
}

const _projects: MockProject[] = []
const _graphs: MockGraph[] = []

// graph_id → { nodes, edges } のインメモリグラフストア
const _graphData: Map<string, { nodes: MockNode[]; edges: MockEdge[] }> = new Map()

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

        // ── CTX-15: Graph Persist ────────────────────────────────────────

        case 'save_graph': {
            const graphId = args?.graphId as string
            const nodes = (args?.nodes as MockNode[]) ?? []
            const edges = (args?.edges as MockEdge[]) ?? []
            _graphData.set(graphId, { nodes, edges })
            return undefined as unknown as T
        }

        case 'load_graph': {
            const graphId = args?.graphId as string
            const stored = _graphData.get(graphId) ?? { nodes: [], edges: [] }

            // MockNode → GraphFile node 形式に変換
            const nodes = stored.nodes.map((n) => ({
                id: n.id,
                type: 'editableNode',
                position: { x: n.position_x, y: n.position_y },
                data: {
                    label: n.label,
                    ...(n.node_type != null ? { nodeType: n.node_type } : {}),
                    ...(n.status != null ? { status: n.status } : {}),
                    ...(n.service !== undefined ? { service: n.service } : {}),
                    ...(n.provider !== undefined ? { provider: n.provider } : {}),
                    ...(n.input != null ? { input: n.input } : {}),
                    ...(n.description != null ? { description: n.description } : {}),
                },
            }))

            const edges = stored.edges.map((e) => ({
                id: e.id,
                source: e.source,
                target: e.target,
            }))

            return { id: graphId, nodes, edges } as unknown as T
        }

        default:
            throw new Error(`[mock] invoke: unknown command "${command}"`)
    }
}