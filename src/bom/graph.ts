import { z } from 'zod'
import type { Node, Edge, Connection } from '@xyflow/react'

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
    // [CTX-8] 未設定時は 'todo' 扱いとする。後方互換のため optional。
    status: NodeStatusSchema.optional(),
})

export type GraphNodeData = z.infer<typeof GraphNodeDataSchema>

// ============================================================
// GraphRecord
// SurrealDB の graph テーブルのレコード型。
// project -[has_graph]-> graph の関係で管理される。
// ============================================================

export const GraphRecordSchema = z.object({
    id: z.string(),
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
// ============================================================

export const GraphNodeRecordSchema = z.object({
    id: z.string(),
    graph_id: z.string(),
    label: z.string(),
    status: NodeStatusSchema.optional(),
    description: z.string().optional(),
    position_x: z.number(),
    position_y: z.number(),
})

export type GraphNodeRecord = z.infer<typeof GraphNodeRecordSchema>

// ============================================================
// GraphEdgeRecord                                    [CTX-15]
// SurrealDB の edge テーブルのレコード型。
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
    loadGraph: (graph: GraphFile) => void
    resetGraph: () => void
    updateNodeData: (id: string, data: Partial<GraphNodeData>) => void
    addEdge: (connection: Connection) => void
}

// ============================================================
// ProjectDetailStore
// ============================================================

export type ProjectDetailStore = {
    activeGraphId: string | null
    isDetailHydrated: boolean

    setActiveGraphId: (id: string | null) => void
    setDetailHydrated: (value: boolean) => void
}

// ============================================================
// UseGraphLoadOptions / UseGraphLoadReturn           [CTX-15]
// ============================================================

export type UseGraphLoadOptions = {
    storage?: Pick<GraphStorage, 'loadGraph'>
    onLoadGraphFn?: (graph: GraphFile) => void
    onResetGraph?: () => void
    setHydrated?: (value: boolean) => void
    activeGraphId?: string | null
}

export type UseGraphLoadReturn = void

// ============================================================
// UseGraphSaveOptions / UseGraphSaveReturn           [CTX-15]
// ============================================================

export type UseGraphSaveOptions = {
    storage?: Pick<GraphStorage, 'saveGraph'>
    setHydrated?: (value: boolean) => void
}

export type UseGraphSaveReturn = {
    setHydrated: (value: boolean) => void
    saveGraph: (nodes: Node<GraphNodeData>[], edges: Edge[]) => Promise<void>
}

// ============================================================
// GraphListItem                                      [CTX-1]
// ============================================================

export type GraphListItem = {
    id: string
    name: string
}

// ============================================================
// GraphStorage                                       [CTX-21]
// ============================================================

export type GraphStorage = {
    listGraphs: (projectId: string) => Promise<GraphListItem[]>
    createGraph: (projectId: string, name: string) => Promise<GraphListItem>
    saveGraph: (
        graphId: string,
        nodes: Node<GraphNodeData>[],
        edges: Edge[]
    ) => Promise<void>
    loadGraph: (graphId: string) => Promise<GraphFile>
    getStructureGraph: (projectId: string) => Promise<GraphFile>
}