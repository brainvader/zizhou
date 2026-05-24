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
// ノードのカテゴリ。将来 SurrealDB の node_catalog.category に対応（CTX-9）。
// 当面フロントエンドに固定値で保持する。
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
})

export type GraphNodeData = z.infer<typeof GraphNodeDataSchema>

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
    // [CTX-5] selectedNodeIds を更新する。Single Guard も同時に適用する。
    // Single Guard: ids.length === 1 のときのみ selectedNodeId も更新する。
    setSelectedNodeIds: (ids: string[]) => void
    addNode: (node: Node<GraphNodeData>) => void
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
    // [CTX-12]
    isDetailHydrated: z.boolean(),
})

export type ProjectDetailStore = z.infer<typeof ProjectDetailStoreSchema> & {
    setActiveGraphId: (id: string | null) => void
    setInitStatus: (status: InitStatus) => void
    setProjectRootPath: (path: string) => void
    // [CTX-12]
    setDetailHydrated: (value: boolean) => void
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
// useProjectDetailLoad hook の戻り値型。
// projects.$id.tsx の useEffect で loadProjectDetail(projectId) を呼ぶ。
// ============================================================

export type UseProjectDetailLoadReturn = {
    /** AppData/project-detail-{projectId}.json を読み込み store に hydrate する */
    loadProjectDetail: (projectId: string) => Promise<void>
}

// ============================================================
// UseProjectDetailSaveReturn                         [CTX-12]
// useProjectDetailSave hook の戻り値型。
// projects.$id.tsx（ProjectDetailRoute）でマウント時に呼ぶ。
// subscribe ベースで自動保存する。
// ============================================================

export type UseProjectDetailSaveReturn = {
    /** 手動保存用（E2E・テスト用途）。通常は subscribe で自動呼び出し */
    saveProjectDetail: (snapshot: ProjectDetailSnapshot) => Promise<void>
}

// ============================================================
// FileTreeNode
// ctx-file-tree で表示するツリーノードの型。
// Tauri fs の readDir 結果をこの型にマッピングする。
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
// graphFilePath
// {projectRootPath}/graphs/{graphId}.json のフルパスを生成するユーティリティ。
// ============================================================

export const graphFilePath = (projectRootPath: string, graphId: string): string =>
    `${projectRootPath}/graphs/${graphId}.json`

// ============================================================
// graphsDir
// {projectRootPath}/graphs/ ディレクトリパスを生成するユーティリティ。
// ============================================================

export const graphsDir = (projectRootPath: string): string =>
    `${projectRootPath}/graphs`