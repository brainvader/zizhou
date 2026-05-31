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
// CatalogField / CatalogProfile / CatalogEntry       [CTX-9]
// Node Catalog のエントリ型定義。
// SurrealDB の node テーブル（グローバルノードライブラリ）に対応する。
// 1エントリ = 1スキル = 1profile（CTX-9設計決定）。
// ============================================================

export const CatalogFieldSchema = z.object({
    type: z.enum(['string', 'number', 'boolean', 'enum']),
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
// NODE_CATALOG                                        [CTX-9]
// フロントエンドにハードコードされたカタログ定数。
// CTX-13 で useCatalogSearch の内部実装を SurrealDB クエリに差し替え済み。
// 将来: SurrealDB の node テーブル（グローバルノードライブラリ）に移行する。
// ============================================================

export const NODE_CATALOG: CatalogEntry[] = [
    // ── git ──────────────────────────────────────────────────
    {
        service: 'git', provider: 'local', label: 'Git Status',
        nodeType: 'git',
        profile: { subcommand: 'status', args: ['status'], fields: {} },
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
    {
        service: 'git', provider: 'local', label: 'Git Log',
        nodeType: 'git',
        profile: {
            subcommand: 'log',
            args: ['log', '--oneline', '-{input.count}'],
            fields: {
                count: { type: 'number', label: 'Lines', default: 10 },
            },
        },
    },
    {
        service: 'git', provider: 'local', label: 'Git Diff',
        nodeType: 'git',
        profile: { subcommand: 'diff', args: ['diff'], fields: {} },
    },
    // ── validate ─────────────────────────────────────────────
    {
        service: 'validate', provider: 'local', label: 'TypeScript Check',
        nodeType: 'validate',
        profile: { subcommand: 'tsc', args: ['tsc', '--noEmit'], fields: {} },
    },
    {
        service: 'validate', provider: 'local', label: 'ESLint',
        nodeType: 'validate',
        profile: {
            subcommand: 'eslint',
            args: ['eslint', '{input.target}'],
            fields: {
                target: { type: 'string', label: 'Target Path', default: 'src' },
            },
        },
    },
    // ── analyze ──────────────────────────────────────────────
    {
        service: 'analyze', provider: 'local', label: 'Test Run',
        nodeType: 'analyze',
        profile: { subcommand: 'vitest', args: ['vitest', 'run'], fields: {} },
    },
    {
        service: 'analyze', provider: 'local', label: 'Build',
        nodeType: 'analyze',
        profile: { subcommand: 'build', args: ['vite', 'build'], fields: {} },
    },
    // ── llm ──────────────────────────────────────────────────
    {
        service: 'llm', provider: 'claude', label: 'Claude: Summarize',
        nodeType: 'llm',
        profile: {
            subcommand: 'summarize',
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