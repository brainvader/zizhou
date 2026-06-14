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
 * list_contexts:         インメモリの contexts[] を返す [CTX-22]
 * create_context:        インメモリに context を追加して返す [CTX-22]
 * update_context:        インメモリの context を更新して返す [CTX-22]
 * delete_context:        インメモリから context を削除する [CTX-22]
 * analyze_tests:         テストファイルを structure グラフに node_type='test' で登録する [CTX-22]
 * list_test_suites:      インメモリの test_suites[] を返す [CTX-22]
 * list_test_cases:       インメモリの test_cases[] を返す [CTX-22]
 * get_related_nodes:    選択ファイルの center / dependencies / dependents を返す [CTX-22b]
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

// [CTX-22]
type MockContext = {
    id: string
    name: string
    project_id: string
    node_ids: string[]
}

// [CTX-22] Test Analysis
type MockTestSuite = {
    id: string
    test_file_id: string
    parent_suite_id: string | null
    name: string
    node_ids: string[]
}

type MockTestCase = {
    id: string
    suite_id: string
    name: string
    order: number
}

const _projects: MockProject[] = []
const _graphs: MockGraph[] = []
const _contexts: MockContext[] = []       // [CTX-22]
const _testSuites: MockTestSuite[] = []   // [CTX-22]
const _testCases: MockTestCase[] = []     // [CTX-22]

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

        // ── CTX-22: SourceContext ────────────────────────────────────────

        case 'list_contexts': {
            const projectId = args?.projectId as string
            return _contexts
                .filter((c) => c.project_id === projectId)
                .map((c) => ({
                    id: c.id,
                    name: c.name,
                    projectId: c.project_id,
                    nodeIds: c.node_ids,
                })) as unknown as T
        }

        case 'create_context': {
            const projectId = args?.projectId as string
            const name = args?.name as string
            const nodeIds = (args?.nodeIds as string[]) ?? []
            const context: MockContext = {
                id: `source_context:mock-${_idCounter++}`,
                name,
                project_id: projectId,
                node_ids: nodeIds,
            }
            _contexts.push(context)
            return {
                id: context.id,
                name: context.name,
                projectId: context.project_id,
                nodeIds: context.node_ids,
            } as unknown as T
        }

        case 'update_context': {
            const contextId = args?.contextId as string
            const name = args?.name as string
            const nodeIds = (args?.nodeIds as string[]) ?? []
            const ctx = _contexts.find((c) => c.id === contextId)
            if (!ctx) throw new Error(`[mock] context not found: ${contextId}`)
            ctx.name = name
            ctx.node_ids = nodeIds
            return {
                id: ctx.id,
                name: ctx.name,
                projectId: ctx.project_id,
                nodeIds: ctx.node_ids,
            } as unknown as T
        }

        case 'delete_context': {
            const contextId = args?.contextId as string
            const idx = _contexts.findIndex((c) => c.id === contextId)
            if (idx >= 0) _contexts.splice(idx, 1)
            return undefined as unknown as T
        }

        // ── CTX-22: Test Analysis ────────────────────────────────────────

        case 'analyze_tests': {
            const projectId = args?.projectId as string
            // 固定テストファイルリストでシミュレート
            const testFiles = [
                'src/components/App.test.tsx',
                'src/hooks/useStore.test.ts',
            ]
            // テストファイルごとの固定フィクスチャ
            // node_ids は対応するソースファイルパスで解決する
            const suiteFixtures: Record<string, { name: string; sourceFilePaths: string[] }> = {
                'src/components/App.test.tsx': {
                    name: 'App component tests',
                    sourceFilePaths: ['src/components/App.tsx'],
                },
                'src/hooks/useStore.test.ts': {
                    name: 'useStore hook tests',
                    sourceFilePaths: ['src/hooks/useStore.ts'],
                },
            }

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

            for (const fp of testFiles) {
                // structure グラフにテストノードを登録（node_type = 'test'）
                const existing = data.nodes.find((n) => n.file_path === fp)
                if (existing) {
                    existing.node_type = 'test'
                    existing.analyzed = 'fresh'
                } else {
                    const fileName = fp.split('/').pop() ?? fp
                    const n = data.nodes.length
                    data.nodes.push({
                        id: `node:mock-${_idCounter++}`,
                        label: fileName,
                        node_type: 'test',
                        position_x: (n % 6) * 220,
                        position_y: Math.floor(n / 6) * 140 + 300,
                        file_path: fp,
                        analyzed: 'fresh',
                    })
                }

                // test_suite を登録（既存の場合は node_ids を再解決）
                const testFileId = `test_file:mock-${projectId}-${fp.replace(/\//g, '-')}`
                const fixture = suiteFixtures[fp]
                const nodeIds = fixture
                    ? data.nodes
                        .filter((n) => fixture.sourceFilePaths.includes(n.file_path ?? ''))
                        .map((n) => n.id)
                    : []

                const suiteExists = _testSuites.find((s) => s.test_file_id === testFileId)
                if (suiteExists) {
                    // analyze_project 後に再呼び出された場合に node_ids を更新する
                    suiteExists.node_ids = nodeIds
                } else {
                    _testSuites.push({
                        id: `test_suite:mock-${_idCounter++}`,
                        test_file_id: testFileId,
                        parent_suite_id: null,
                        name: fixture?.name ?? fp,
                        node_ids: nodeIds,
                    })
                }
            }
            _graphData.set(graph.id, data)
            return undefined as unknown as T
        }

        case 'list_test_suites': {
            const projectId = args?.projectId as string
            // project に紐づく test_file_id を含む suite を返す
            return _testSuites
                .filter((s) => s.test_file_id.includes(projectId))
                .map((s) => ({
                    id: s.id,
                    testFileId: s.test_file_id,
                    parentSuiteId: s.parent_suite_id,
                    name: s.name,
                    nodeIds: s.node_ids,
                })) as unknown as T
        }

        case 'list_test_cases': {
            const suiteId = args?.suiteId as string
            return _testCases
                .filter((c) => c.suite_id === suiteId)
                .map((c) => ({
                    id: c.id,
                    suiteId: c.suite_id,
                    name: c.name,
                    order: c.order,
                })) as unknown as T
        }

        // ── CTX-22b: TaaC ────────────────────────────────────────────────

        case 'get_related_nodes': {
            const projectId = args?.projectId as string
            const filePath = args?.filePath as string

            // structure グラフを取得
            const graph = _graphs.find(
                (g) => g.project_id === projectId && g.kind === 'structure'
            )
            const data = graph ? (_graphData.get(graph.id) ?? { nodes: [], edges: [] }) : { nodes: [], edges: [] }

            // center ノードを取得
            const centerNode = data.nodes.find((n) => n.file_path === filePath)
            if (!centerNode) {
                throw new Error(`[mock] get_related_nodes: node not found for file_path: ${filePath}`)
            }

            const toRfNode = (n: MockNode) => ({
                id: n.id,
                type: n.node_type === 'test' ? 'testNode' : 'sourceNode',
                position: { x: n.position_x, y: n.position_y },
                data: {
                    label: n.label,
                    ...(n.node_type != null ? { nodeType: n.node_type } : {}),
                    ...(n.file_path != null ? { filePath: n.file_path } : {}),
                    ...(n.analyzed != null ? { analyzed: n.analyzed } : {}),
                },
            })

            // dependencies: centerNode が source のエッジの target ノード
            const depNodeIds = data.edges
                .filter((e) => e.source === centerNode.id && e.kind === 'imports')
                .map((e) => e.target)
            const dependencies = data.nodes
                .filter((n) => depNodeIds.includes(n.id))
                .map(toRfNode)

            // dependents: centerNode が target のエッジの source ノード
            const dntNodeIds = data.edges
                .filter((e) => e.target === centerNode.id && e.kind === 'imports')
                .map((e) => e.source)
            const dependents = data.nodes
                .filter((n) => dntNodeIds.includes(n.id))
                .map(toRfNode)

            return {
                center: toRfNode(centerNode),
                dependencies,
                dependents,
            } as unknown as T
        }

        default:
            throw new Error(`[mock] invoke: unknown command "${command}"`)
    }
}