import { invoke } from '@tauri-apps/api/core'
import type { Node, Edge } from '@xyflow/react'
import {
    GraphFileSchema,
    type GraphFile,
    type GraphListItem,
    type GraphNodeData,
    type GraphStorage,
} from '@/bom/graph'

/**
 * defaultGraphStorage
 *
 * SurrealDB ↔ useGraphStore 間のストレージ層の既定実装。
 * Tauri コマンド invoke をラップする。
 *
 * Props DI 用に GraphStorage 型を export しており、テスト・Storybook では
 * Partial<GraphStorage> で部分上書き可能。
 *
 * バックエンド契約:
 *   - list_graphs(projectId)            → Vec<{ id, name, project_id, kind? }>
 *   - create_graph(projectId, name)     → { id, name, project_id }
 *   - save_graph(graphId, nodes, edges) → ()
 *   - load_graph(graphId)               → LoadGraphResponse (= GraphFile 形式)
 *   - get_structure_graph(projectId)    → LoadGraphResponse
 *
 * Tauri は top-level の snake_case を camelCase に自動変換するため、
 * invoke 側のキーは camelCase (projectId / graphId) で渡す。
 * ネストしたオブジェクト（save_graph の nodes[] 内部など）はそのまま
 * snake_case (position_x / node_type) で渡す必要がある。
 *
 */

// ============================================================
// 内部ヘルパー: ReactFlow Node<GraphNodeData> → save_graph 入力
// position をフラット化し、未指定フィールドは null で送る。
// ============================================================

type SaveNodeInput = {
    id: string
    label: string
    node_type: string | null
    status: string | null
    service: string | null
    provider: string | null
    input: Record<string, unknown> | null
    description: string | null
    position_x: number
    position_y: number
}

type SaveEdgeInput = {
    id: string
    source: string
    target: string
}

function toSaveNodeInput(node: Node<GraphNodeData>): SaveNodeInput {
    return {
        id: node.id,
        label: node.data.label,
        // Fixit: node_type は Rust 側の SaveNodeInput に残っているが現在未使用。
        // フロント側から意味のある値を送るか、Rust/SurrealDB 側から削除するかを決める。
        node_type: null,
        status: node.data.status ?? null,
        service: null,
        provider: null,
        input: null,
        description: node.data.description ?? null,
        position_x: node.position.x,
        position_y: node.position.y,
    }
}

function toSaveEdgeInput(edge: Edge): SaveEdgeInput {
    return {
        id: edge.id,
        source: edge.source,
        target: edge.target,
    }
}

// ============================================================
// list_graphs / create_graph のバックエンド返却型
// GraphListItem ({ id, name }) に正規化して返す。
// ============================================================

type RawGraph = {
    id: string
    name: string
    project_id?: string
    kind?: string
}

// ============================================================
// defaultGraphStorage
// ============================================================

export const defaultGraphStorage: GraphStorage = {
    async listGraphs(projectId: string): Promise<GraphListItem[]> {
        const raw = await invoke<RawGraph[]>('list_graphs', { projectId })
        return raw.map(({ id, name }) => ({ id, name }))
    },

    async createGraph(projectId: string, name: string): Promise<GraphListItem> {
        const raw = await invoke<RawGraph>('create_graph', { projectId, name })
        return { id: raw.id, name: raw.name }
    },

    async saveGraph(
        graphId: string,
        nodes: Node<GraphNodeData>[],
        edges: Edge[]
    ): Promise<void> {
        const saveNodes = nodes.map(toSaveNodeInput)
        const saveEdges = edges.map(toSaveEdgeInput)
        await invoke<void>('save_graph', {
            graphId,
            nodes: saveNodes,
            edges: saveEdges,
        })
    },

    async loadGraph(graphId: string): Promise<GraphFile> {
        const raw = await invoke<unknown>('load_graph', { graphId })
        return GraphFileSchema.parse(raw)
    },

    async getStructureGraph(projectId: string): Promise<GraphFile> {
        const raw = await invoke<unknown>('get_structure_graph', { projectId })
        return GraphFileSchema.parse(raw)
    },
}