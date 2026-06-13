import { z } from 'zod'
import type { Node, Edge, Connection } from '@xyflow/react'

// ============================================================
// NodeType
// ノードのカテゴリ。SurrealDB の node_catalog.category に対応（CTX-13）。
// ============================================================

export const NODE_TYPES = ['git', 'validate', 'analyze', 'llm', 'custom'] as const
export const NodeTypeSchema = z.enum(NODE_TYPES)
export type NodeType = z.infer<typeof NodeTypeSchema>

export const NODE_TYPE_COLOR: Record<NodeType, string> = {
    git: '#27ae60',
    validate: '#2980b9',
    analyze: '#f39c12',
    llm: '#8e44ad',
    custom: '#555e6b',
}

// ============================================================
// NodeStatus
// ノードの進行状態。人間が LLM チャットと進捗を共有するためのフラグ。
// ============================================================

export const NODE_STATUSES = ['todo', 'doing', 'done'] as const
export const NodeStatusSchema = z.enum(NODE_STATUSES)
export type NodeStatus = z.infer<typeof NodeStatusSchema>

// ============================================================
// GraphNodeData
// ReactFlow の Node<T> の T 部分。ノード固有のデータ。
// ============================================================

export const GraphNodeDataSchema = z.object({
    label: z.string().min(1, 'label は必須です').max(100),
    description: z.string().max(500).optional(),
    // [CTX-8] 未設定時は 'custom' 扱いとする。後方互換のため optional。
    nodeType: NodeTypeSchema.optional(),
    // [CTX-8] 未設定時は 'todo' 扱いとする。後方互換のため optional。
    status: NodeStatusSchema.optional(),
    // [CTX-9] カタログ紐付き情報。非紐付きノードは null。後方互換のため optional。
    service: z.string().nullable().optional(),
    provider: z.string().nullable().optional(),
    // [CTX-9] ノード実行時の入力値。{ subcommand: '...' } を含む。
    input: z.record(z.string(), z.unknown()).optional(),
})

export type GraphNodeData = z.infer<typeof GraphNodeDataSchema>

// ============================================================
// CatalogField / CatalogProfile / CatalogEntry            [CTX-9]
// ノードカタログのエントリ型。SurrealDB の node_catalog テーブルに対応。
// ============================================================

export const CatalogFieldSchema = z.object({
    type: z.string(),
    label: z.string(),
    required: z.boolean().optional(),
    default: z.unknown().optional(),
    values: z.array(z.string()).optional(),
})
export type CatalogField = z.infer<typeof CatalogFieldSchema>

export const CatalogProfileSchema = z.object({
    subcommand: z.string(),
    args: z.array(z.string()),
    fields: z.record(z.string(), CatalogFieldSchema),
})
export type CatalogProfile = z.infer<typeof CatalogProfileSchema>

export const CatalogEntrySchema = z.object({
    service: z.string(),
    provider: z.string(),
    label: z.string(),
    nodeType: NodeTypeSchema,
    profile: CatalogProfileSchema,
})
export type CatalogEntry = z.infer<typeof CatalogEntrySchema>

// ============================================================
// NODE_CATALOG
// フロントエンドのハードコードカタログ（CTX-9 確定済み）。
// CTX-13 では SurrealDB 側にも INSERT する。
// ============================================================

export const NODE_CATALOG: CatalogEntry[] = [
    // ── git ─────────────────────────────────────────────────
    {
        service: 'git', provider: 'local', label: 'Git Status',
        nodeType: 'git',
        profile: {
            subcommand: 'status',
            args: ['status'],
            fields: {},
        },
    },
    {
        service: 'git', provider: 'local', label: 'Git Diff',
        nodeType: 'git',
        profile: {
            subcommand: 'diff',
            args: ['diff'],
            fields: {},
        },
    },
    {
        service: 'git', provider: 'local', label: 'Git Log',
        nodeType: 'git',
        profile: {
            subcommand: 'log',
            args: ['log', '--oneline', '-20'],
            fields: {},
        },
    },
    {
        service: 'git', provider: 'local', label: 'Git Commit',
        nodeType: 'git',
        profile: {
            subcommand: 'commit',
            args: ['commit', '-m', '{input.message}'],
            fields: {
                message: { type: 'string', label: 'Commit Message', required: true },
            },
        },
    },
    // ── validate ────────────────────────────────────────────
    {
        service: 'validate', provider: 'local', label: 'TypeScript Check',
        nodeType: 'validate',
        profile: {
            subcommand: 'tsc',
            args: ['tsc', '--noEmit'],
            fields: {},
        },
    },
    {
        service: 'validate', provider: 'local', label: 'Lint Check',
        nodeType: 'validate',
        profile: {
            subcommand: 'lint',
            args: ['eslint', '.'],
            fields: {},
        },
    },
    // ── analyze ─────────────────────────────────────────────
    {
        service: 'analyze', provider: 'local', label: 'Test Run',
        nodeType: 'analyze',
        profile: {
            subcommand: 'test',
            args: ['vitest', 'run'],
            fields: {},
        },
    },
    // ── llm ─────────────────────────────────────────────────
    {
        service: 'llm', provider: 'ollama', label: 'Ollama: Prompt',
        nodeType: 'llm',
        profile: {
            subcommand: 'prompt',
            args: [],
            fields: {
                prompt: { type: 'string', label: 'Prompt', required: true },
            },
        },
    },
    {
        service: 'llm', provider: 'claude', label: 'Claude: Review',
        nodeType: 'llm',
        profile: {
            subcommand: 'review',
            args: [],
            fields: {
                prompt: { type: 'string', label: 'Review Prompt', required: true },
            },
        },
    },
    // ── custom ───────────────────────────────────────────────
    {
        service: 'custom', provider: 'local', label: 'Shell Command',
        nodeType: 'custom',
        profile: {
            subcommand: 'shell',
            args: ['{input.command}'],
            fields: {
                command: { type: 'string', label: 'Command', required: true },
            },
        },
    },
]

// ============================================================
// GraphRecord
// SurrealDB の graph テーブルのレコード型。
// project -[has_graph]-> graph の関係で管理される。
// ============================================================

export const GraphRecordSchema = z.object({
    id: z.string(),       // SurrealDB Thing 型: "graph:xxxxx"
    name: z.string().min(1).max(100),
    projectId: z.string(),
})

export type GraphRecord = z.infer<typeof GraphRecordSchema>

// ============================================================
// GraphFile
// GraphEditor が扱うインメモリのグラフ表現。
// SurrealDB の node / edge テーブルから組み立てる。
// ============================================================

export const GraphFileSchema = z.object({
    id: z.string(),
    nodes: z.array(
        z.object({
            id: z.string(),
            type: z.string().optional(),
            position: z.object({ x: z.number(), y: z.number() }),
            data: GraphNodeDataSchema,
        })
    ),
    edges: z.array(
        z.object({
            id: z.string(),
            source: z.string(),
            target: z.string(),
        })
    ),
})

export type GraphFile = z.infer<typeof GraphFileSchema>

// ============================================================
// GraphNodeRecord                                    [CTX-15]
// SurrealDB の node テーブルのレコード型。
// graph -[has_node]-> node の関係で管理される。
// position_x / position_y はフラットに持つ（SurrealDB スキーマに対応）。
// ============================================================

export const GraphNodeRecordSchema = z.object({
    id: z.string(),
    graph_id: z.string(),
    label: z.string(),
    node_type: z.string().optional(),
    status: NodeStatusSchema.optional(),
    service: z.string().nullable().optional(),
    provider: z.string().nullable().optional(),
    input: z.record(z.string(), z.unknown()).optional(),
    description: z.string().optional(),
    position_x: z.number(),
    position_y: z.number(),
})

export type GraphNodeRecord = z.infer<typeof GraphNodeRecordSchema>

// ============================================================
// GraphEdgeRecord                                    [CTX-15]
// SurrealDB の edge テーブルのレコード型。
// graph -[has_edge]-> edge の関係で管理される。
// ============================================================

export const GraphEdgeRecordSchema = z.object({
    id: z.string(),
    graph_id: z.string(),
    source: z.string(),
    target: z.string(),
})

export type GraphEdgeRecord = z.infer<typeof GraphEdgeRecordSchema>

// ============================================================
// GraphStore
// Zustand store の型定義。
// nodes[], edges[], selectedNodeId の SSOT。
// 永続化は SurrealDB embedded (Rust IPC) に委譲する。
// ============================================================

export type GraphStore = {
    // State
    nodes: Node<GraphNodeData>[]
    edges: Edge[]
    selectedNodeId: string | null
    selectedNodeIds: string[]

    // Actions
    setNodes: (nodes: Node<GraphNodeData>[]) => void
    setEdges: (edges: Edge[]) => void
    setSelectedNodeId: (id: string | null) => void
    setSelectedNodeIds: (ids: string[]) => void
    addNode: (node: Node<GraphNodeData>) => void
    addNodeFromCatalog: (entry: CatalogEntry, position: { x: number; y: number }) => void
    loadGraph: (graph: GraphFile) => void
    resetGraph: () => void
    updateNodeData: (id: string, data: Partial<GraphNodeData>) => void
    addEdge: (connection: Connection) => void
}

// ============================================================
// ProjectDetailStore
// project-detail 画面のグローバル状態。
// activeProjectId は TanStack Router の useParams から取得する。
// activeGraphId は SurrealDB から取得したグラフ一覧から選択する。
// isDetailHydrated: invoke('list_graphs') 完了後に true になる。
// ============================================================

export type ProjectDetailStore = {
    activeGraphId: string | null
    isDetailHydrated: boolean

    setActiveGraphId: (id: string | null) => void
    setDetailHydrated: (value: boolean) => void
}

// ============================================================
// UseGraphLoadOptions / UseGraphLoadReturn           [CTX-15 → CTX-21 改訂]
// useGraphLoad hook の型定義。
// onLoadGraph を storage?: Pick<GraphStorage, 'loadGraph'> に統合した。
// ============================================================

export type UseGraphLoadOptions = {
    /** props DI: 省略時は defaultGraphStorage を使用する */
    storage?: Pick<GraphStorage, 'loadGraph'>
    onLoadGraphFn?: (graph: GraphFile) => void
    onResetGraph?: () => void
    setHydrated?: (value: boolean) => void
    activeGraphId?: string | null
}

export type UseGraphLoadReturn = void

// ============================================================
// UseGraphSaveOptions / UseGraphSaveReturn           [CTX-15 → CTX-21 改訂]
// useGraphSave hook の型定義。
// onSaveGraph を storage?: Pick<GraphStorage, 'saveGraph'> に統合した。
// ============================================================

export type UseGraphSaveOptions = {
    /** props DI: 省略時は defaultGraphStorage を使用する */
    storage?: Pick<GraphStorage, 'saveGraph'>
    setHydrated?: (value: boolean) => void
}

export type UseGraphSaveReturn = {
    setHydrated: (value: boolean) => void
    saveGraph: (nodes: Node<GraphNodeData>[], edges: Edge[]) => Promise<void>
}

// ============================================================
// UseCatalogSearchOptions                            [CTX-13]
// ============================================================
export type UseCatalogSearchOptions = {
    onGetAll?: () => Promise<CatalogEntry[]>
    onSearch?: (query: string) => Promise<CatalogEntry[]>
}

// ============================================================
// UseCatalogSearchReturn                             [CTX-13]
// ============================================================
export type UseCatalogSearchReturn = {
    results: CatalogEntry[]
    loading: boolean
    error: string | null
}

// ============================================================
// GraphListItem                                      [CTX-1]
// invoke('list_graphs') のレスポンス型。
// SSOT: docs/bom/graph.ts（useProjectDetailLoad.ts から移動）
// ============================================================

export type GraphListItem = {
    id: string
    name: string
}

// ============================================================
// FileTreeProps                                      [CTX-1]
// FileTree コンポーネントの props 型定義。
// Tauri fs 依存を廃止し、invoke('list_graphs') ベースに移行。
// ============================================================

export type FileTreeProps = {
    /** 対象プロジェクト ID */
    projectId?: string
    /** 現在選択中のグラフ ID（省略時は store から取得） */
    activeGraphId?: string | null
    /** グラフ選択時のナビゲーションハンドラ（省略時は useRouter にフォールバック） */
    onNavigate?: (graphId: string) => void
    /** props DI: 省略時は invoke('list_graphs') を使用 */
    onListGraphs?: (projectId: string) => Promise<GraphListItem[]>
}

// ============================================================
// GraphStorage                                       [CTX-21]
// SurrealDB ↔ useGraphStore 間のストレージ層。
// Tauri コマンドをラップし、Props DI で差し替え可能にする。
//
// マイクロサービス方針:
//   GraphStorage   — graph / node / edge の CRUD（このファイル）
//   AnalyzeService — tree-sitter 解析の起動（将来）
//   VcsService     — Git 等の VCS 操作（将来）
//
// 実装: src/services/GraphStorage.ts の defaultGraphStorage
// ============================================================

export type GraphStorage = {
    /** プロジェクト配下のグラフ一覧を返す */
    listGraphs: (projectId: string) => Promise<GraphListItem[]>

    /** グラフを作成する（kind は workflow 既定） */
    createGraph: (projectId: string, name: string) => Promise<GraphListItem>

    /** ワークフローグラフのノード・エッジを全置換保存する（CTX-15 由来） */
    saveGraph: (
        graphId: string,
        nodes: Node<GraphNodeData>[],
        edges: Edge[]
    ) => Promise<void>

    /** グラフのノード・エッジを取得して GraphFile 形式で返す */
    loadGraph: (graphId: string) => Promise<GraphFile>

    /** プロジェクトの structure グラフを取得する（なければバックエンド側で自動作成） */
    getStructureGraph: (projectId: string) => Promise<GraphFile>
}

// ============================================================
// UseGraphLoadOptions / UseGraphSaveOptions の DI 整理       [CTX-21]
// 既存の onLoadGraph / onSaveGraph props は storage 経由に統合する。
// storage は Pick<GraphStorage, '...'> で部分注入可能。
// ============================================================