import { z } from 'zod'
import type { Node, Edge } from '@xyflow/react'

// ============================================================
// Utilities
// ============================================================

/**
 * グラフファイルの保存ディレクトリを返す。
 * @example graphsDir('/Users/user/projects/zizou-core') => '/Users/user/projects/zizou-core/graphs'
 */
export const graphsDir = (projectRootPath: string): string =>
    `${projectRootPath}/graphs`

/**
 * グラフファイルのパスを返す。
 * @example graphFilePath('/Users/user/projects/zizou-core', 'graph-01') => '/Users/user/projects/zizou-core/graphs/graph-01.json'
 */
export const graphFilePath = (projectRootPath: string, graphId: string): string =>
    `${graphsDir(projectRootPath)}/${graphId}.json`

// ============================================================
// GraphNodeData
// React Flow カスタムノードのデータペイロード。
// Node<GraphNodeData> として React Flow に渡す。
// ============================================================

export const GraphNodeDataSchema = z.object({
    label: z.string().min(1, 'label は必須です').max(100),
    description: z.string().max(500).optional(),
})

export type GraphNodeData = z.infer<typeof GraphNodeDataSchema>

// ============================================================
// GraphFile
// {projectRootPath}/graphs/{graphId}.json の保存形式。
// nodes[].data は GraphNodeData に準拠する。
// edges は React Flow の Edge 型をそのまま使用する。
// ============================================================

export const GraphFileSchema = z.object({
    id: z.string(),  // nanoid() で生成
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
// 永続化は useGraphFile hook に委譲する（subscribe ベース）。
// ============================================================

export type GraphStore = {
    // State
    nodes: Node<GraphNodeData>[]
    edges: Edge[]
    selectedNodeId: string | null

    // Actions
    setNodes: (nodes: Node<GraphNodeData>[]) => void
    setEdges: (edges: Edge[]) => void
    setSelectedNodeId: (id: string | null) => void
    addNode: (node: Node<GraphNodeData>) => void
    loadGraph: (graph: GraphFile) => void
    resetGraph: () => void
}

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
// ProjectDetailStore
// project-detail 画面のグローバル状態。
// activeProjectId は TanStack Router の useParams から取得する。
// projectRootPath は useProjectStore から引く（Project.rootPath）。
// ============================================================

export const ProjectDetailStoreSchema = z.object({
    activeGraphId: z.string().nullable(),
    initStatus: InitStatusSchema,
    projectRootPath: z.string(),
})

export type ProjectDetailStore = z.infer<typeof ProjectDetailStoreSchema> & {
    setActiveGraphId: (id: string | null) => void
    setInitStatus: (status: InitStatus) => void
    setProjectRootPath: (path: string) => void
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