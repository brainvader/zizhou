/**
 * @tauri-apps/api/core のテスト用モック。
 * VITE_PLAYWRIGHT=true のとき vite.config.ts の alias で差し替えられる。
 *
 * catalog_get_all:       NODE_CATALOG を返す（SurrealDB の初期データと同等）
 * catalog_search:        query で label / service を filter して返す
 * execute_node:          即時 success:true を返す（E2E では実際の CLI を呼ばない）[CTX-14]
 * list_projects:         インメモリの projects[] を返す
 * create_project:        インメモリに project を追加して返す
 * list_graphs:           インメモリの graphs[] を返す
 * create_graph:          インメモリに graph を追加して返す
 * save_graph:            インメモリの nodes/edges を graph_id でキーに保存する [CTX-15]
 * load_graph:            インメモリの nodes/edges を GraphFile 形式で返す [CTX-15]
 * list_fs_tree:          固定フィクスチャのファイルツリーを返す [CTX-19]
 * get_structure_graph:   structure グラフを返す（なければ作成）[CTX-20]
 * get_changed_files:     変更ファイル一覧を返す [CTX-20]
 * analyze_file:          structure グラフにノードを追加する [CTX-20]
 * analyze_project:       全ソースファイル分のノードを追加する [CTX-20]
 */
import { NODE_CATALOG } from '@/bom/graph'
import type { CatalogEntry } from '@/bom/graph'
import type { ExecuteResponse } from '@/bom/execute'

// ── インメモリストア ──────────────────────────────────────────────────────

type MockProject = { id: string; name: string; description?: string; rootPath: string }
type MockGraph = { id: string; name: string; project_id: string; kind?: string }

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
    // [CTX-20]
    file_path?: string | null
    analyzed?: string | null
}

type MockEdge = {
    id: string
    source: string
    target: string
    // [CTX-20]
    kind?: string | null
}

const _projects: MockProject[] = []
const _graphs: MockGraph[] = []

// graph_id → { nodes, edges } のインメモリグラフストア
const _graphData: Map<string, { nodes: MockNode[]; edges: MockEdge[] }> = new Map()

let _idCounter = 1

// ── [CTX-20] 変更ファイルフィクスチャ ─────────────────────────────────────
// E2E テストで stale 判定を検証するための固定値。
// projects.$id.tsx が invoke('get_changed_files') で取得する。

const _changedFiles: string[] = ['src/main.tsx']

// ── ヘルパー ──────────────────────────────────────────────────────────────

function toGraphFileNodes(nodes: MockNode[]) {
    return nodes.map((n) => ({
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
            // [CTX-20]
            ...(n.file_path != null ? { filePath: n.file_path } : {}),
            ...(n.analyzed != null ? { analyzed: n.analyzed } : {}),
        },
    }))
}

function toGraphFileEdges(edges: MockEdge[]) {
    return edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        // [CTX-20]
        ...(e.kind != null ? { kind: e.kind } : {}),
    }))
}

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
            const rootPath = (args?.rootPath as string) ?? ''
            const project: MockProject = {
                id: `project:mock-${_idCounter++}`,
                name,
                rootPath,
                ...(description ? { description } : {}),
            }
            _projects.push(project)
            return project as unknown as T
        }

        case 'list_graphs': {
            const projectId = args?.projectId as string
            const results = _graphs.filter((g) => g.project_id === projectId)
            return results.map((g) => ({
                id: g.id,
                name: g.name,
                project_id: g.project_id,
                ...(g.kind ? { kind: g.kind } : {}),
            })) as unknown as T
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
            return {
                id: graphId,
                nodes: toGraphFileNodes(stored.nodes),
                edges: toGraphFileEdges(stored.edges),
            } as unknown as T
        }

        // ── CTX-20: Structure Graph ──────────────────────────────────────

        case 'get_structure_graph': {
            const projectId = args?.projectId as string
            // 既存の structure グラフを探す。なければ作成。
            let graph = _graphs.find(
                (g) => g.project_id === projectId && g.kind === 'structure'
            )
            if (!graph) {
                graph = {
                    id: `graph:mock-${_idCounter++}`,
                    name: 'Structure',
                    project_id: projectId,
                    kind: 'structure',
                }
                _graphs.push(graph)
            }
            const stored = _graphData.get(graph.id) ?? { nodes: [], edges: [] }
            return {
                id: graph.id,
                nodes: toGraphFileNodes(stored.nodes),
                edges: toGraphFileEdges(stored.edges),
            } as unknown as T
        }

        case 'get_changed_files': {
            return [..._changedFiles] as unknown as T
        }

        case 'analyze_file': {
            const projectId = args?.projectId as string
            const filePath = args?.filePath as string
            // structure グラフを取得 or 作成
            let graph = _graphs.find(
                (g) => g.project_id === projectId && g.kind === 'structure'
            )
            if (!graph) {
                graph = {
                    id: `graph:mock-${_idCounter++}`,
                    name: 'Structure',
                    project_id: projectId,
                    kind: 'structure',
                }
                _graphs.push(graph)
            }
            const data = _graphData.get(graph.id) ?? { nodes: [], edges: [] }
            // 既存ノードを探す
            const existing = data.nodes.find((n) => n.file_path === filePath)
            if (existing) {
                existing.analyzed = 'fresh'
            } else {
                const fileName = filePath.split('/').pop() ?? filePath
                const n = data.nodes.length
                data.nodes.push({
                    id: `node:mock-${_idCounter++}`,
                    label: fileName,
                    node_type: 'file',
                    position_x: (n % 6) * 220,
                    position_y: Math.floor(n / 6) * 140,
                    file_path: filePath,
                    analyzed: 'fresh',
                })
            }
            _graphData.set(graph.id, data)
            return undefined as unknown as T
        }

        case 'analyze_project': {
            const projectId = args?.projectId as string
            // 固定ファイルリストで一括解析をシミュレート
            const sourceFiles = ['src/main.tsx', 'src/components/App.tsx', 'src/hooks/useStore.ts']
            for (const fp of sourceFiles) {
                await invoke('analyze_file', { projectId, filePath: fp })
            }
            return undefined as unknown as T
        }

        default:
            throw new Error(`[mock] invoke: unknown command "${command}"`)
    }
}