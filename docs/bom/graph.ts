import { z } from 'zod'
import type { Node, Edge, Connection } from '@xyflow/react'

// ============================================================
// InitStatus
// graphs/ ディレクトリの存在確認状態。
// 'checking':      マウント時の確認中（Tauri fs の非同期処理待ち）
// 'uninitialized': graphs/ が存在しない → エディタ領域を Setup ビューに切り替える
// 'ready':         graphs/ が存在する   → エディタを表示する
// ============================================================

export const InitStatusSchema = z.enum(['checking', 'uninitialized', 'ready'])
export type InitStatus = z.infer<typeof InitStatusSchema>

// ============================================================
// NodeType
// ノードのカテゴリ。SurrealDB の node_catalog.category に対応（CTX-13）。
// ============================================================

export const NODE_TYPES = ['git', 'validate', 'analyze', 'llm', 'custom'] as const
export const NodeTypeSchema = z.enum(NODE_TYPES)
export type NodeType = z.infer<typeof NodeTypeSchema>

// カラーマップ。GraphNode のスタイリングに使用する。
export const NODE_TYPE_COLOR: Record<NodeType, string> = {
    git: '#27ae60', // 緑
    validate: '#2980b9', // 青
    analyze: '#f39c12', // 黄
    llm: '#8e44ad', // 紫
    custom: '#555e6b', // グレー
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
// CTX-13 で SurrealDB の node_catalog レコードに対応する。
// 1エントリ = 1スキル = 1profile（CTX-9設計決定）。
// ============================================================

export const CatalogFieldSchema = z.object({
    type: z.enum(['string', 'number', 'boolean', 'enum']),
    label: z.string(),
    required: z.boolean().optional(),
    default: z.unknown().optional(),
    values: z.array(z.string()).optional(),  // type='enum' の場合のみ
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
// CTX-13 で useCatalogSearch の内部実装を SurrealDB クエリに差し替える。
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
// GraphFile
// {projectRootPath}/graphs/{graphId}.json の保存形式（Zod schema）。
// ============================================================

export const GraphFileSchema = z.object({
    id: z.string(),
    nodes: z.array(
        z.object({
            id: z.string(),
            type: z.string().optional(),  // 'editableNode' 等。未設定時は loadGraph で補完する
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
// 永続化は useGraphFile hook に委譲する（subscribe ベース）。
// ============================================================

export type GraphStore = {
    // State
    nodes: Node<GraphNodeData>[]
    edges: Edge[]
    selectedNodeId: string | null
    // [CTX-5] 複数選択中のノード ID 配列。ReactFlow の onSelectionChange で更新する。
    selectedNodeIds: string[]

    // Actions
    setNodes: (nodes: Node<GraphNodeData>[]) => void
    setEdges: (edges: Edge[]) => void
    setSelectedNodeId: (id: string | null) => void
    // [CTX-5] selectedNodeIds を更新する。
    // Single Guard: ids.length === 1 のときのみ selectedNodeId も同時に適用する。
    setSelectedNodeIds: (ids: string[]) => void
    addNode: (node: Node<GraphNodeData>) => void
    // [CTX-9] CatalogEntry からノードを生成して nodes[] に追加する。
    addNodeFromCatalog: (entry: CatalogEntry, position: { x: number; y: number }) => void
    loadGraph: (graph: GraphFile) => void
    resetGraph: () => void
    // [CTX-4] 指定 id のノードの data のみを部分更新する。
    updateNodeData: (id: string, data: Partial<GraphNodeData>) => void
    // [CTX-6] ReactFlow の onConnect から呼ばれる。Connection を Edge に変換して edges[] に追加する。
    addEdge: (connection: Connection) => void
}

// ============================================================
// ProjectDetailStore
// project-detail 画面のグローバル状態。
// activeProjectId は TanStack Router の useParams から取得する。
// projectRootPath は:
//   1. useProjectDetailLoad が AppData/project-detail-{id}.json から復元する（直アクセス時）
//   2. projects.$id.tsx の useEffect が project?.rootPath から注入する（通常遷移時）
//
// isDetailHydrated:
//   [CTX-12] useProjectDetailLoad 完了後に true になる。
//   useProjectDetailSave が hydration 前の保存をスキップするために使用する（save-before-load 防止）。
// ============================================================

export const ProjectDetailStoreSchema = z.object({
    activeGraphId: z.string().nullable(),
    initStatus: InitStatusSchema,
    projectRootPath: z.string(),
    isDetailHydrated: z.boolean(), // [CTX-12]
})

export type ProjectDetailStore = z.infer<typeof ProjectDetailStoreSchema> & {
    setActiveGraphId: (id: string | null) => void
    setInitStatus: (status: InitStatus) => void
    setProjectRootPath: (path: string) => void
    setDetailHydrated: (value: boolean) => void // [CTX-12]
}

// ============================================================
// ProjectDetailSnapshot                              [CTX-12]
// AppData/project-detail-{projectId}.json の保存形式。
// projectId ごとに projectRootPath / activeGraphId を保持する。
// ============================================================

export const ProjectDetailSnapshotSchema = z.object({
    projectId: z.string(),
    projectRootPath: z.string(),
    activeGraphId: z.string().nullable(),
})

export type ProjectDetailSnapshot = z.infer<typeof ProjectDetailSnapshotSchema>

// ============================================================
// UseProjectDetailLoadReturn                         [CTX-12]
// ============================================================

export type UseProjectDetailLoadReturn = {
    loadProjectDetail: (projectId: string) => Promise<void>
}

// ============================================================
// UseProjectDetailSaveReturn                         [CTX-12]
// ============================================================

export type UseProjectDetailSaveReturn = {
    saveProjectDetail: (snapshot: ProjectDetailSnapshot) => Promise<void>
}

// ============================================================
// FileTreeNode
// ctx-file-tree で表示するツリーノードの型。
// ============================================================

export const FileTreeNodeSchema: z.ZodType<FileTreeNode> = z.lazy(() =>
    z.object({
        name: z.string(),
        path: z.string(),
        isDir: z.boolean(),
        children: z.array(FileTreeNodeSchema).optional(),
    })
)

export type FileTreeNode = {
    name: string
    path: string
    isDir: boolean
    children?: FileTreeNode[]
}

// ============================================================
// graphFilePath / graphsDir
// ============================================================

export const graphFilePath = (projectRootPath: string, graphId: string): string =>
    `${projectRootPath}/graphs/${graphId}.json`

export const graphsDir = (projectRootPath: string): string =>
    `${projectRootPath}/graphs`