import { create } from 'zustand'
import { addEdge as rfAddEdge } from '@xyflow/react'
import type { Node, Edge } from '@xyflow/react'
import type { GraphNodeData, GraphStore } from '@/bom/graph'

export const useGraphStore = create<GraphStore>((set) => ({
    // State
    nodes: [],
    edges: [],
    selectedNodeId: null,
    selectedNodeIds: [],

    // Actions
    setNodes: (nodes: Node<GraphNodeData>[]) => set({ nodes }),
    setEdges: (edges: Edge[]) => set({ edges }),
    setSelectedNodeId: (id: string | null) => set({ selectedNodeId: id }),

    // [CTX-5] Single Guard:
    // ids.length === 1 → selectedNodeId も更新する
    // ids.length === 0 → selectedNodeId を null にクリアする
    // ids.length > 1   → selectedNodeId は変更しない（NodeProperty は Visibility Guard で非表示）
    setSelectedNodeIds: (ids: string[]) =>
        set((state) => ({
            selectedNodeIds: ids,
            selectedNodeId:
                ids.length === 1
                    ? ids[0]
                    : ids.length === 0
                        ? null
                        : state.selectedNodeId,
        })),

    addNode: (node: Node<GraphNodeData>) =>
        set((state) => ({ nodes: [...state.nodes, node] })),

    // [CTX-6] rfAddEdge は重複エッジを自動排除して新しい Edge[] を返す。
    addEdge: (connection) =>
        set((state) => ({ edges: rfAddEdge(connection, state.edges) })),

    loadGraph: (graph) =>
        set({
            // type が未設定のノードは 'editableNode' に補完する（後方互換）
            nodes: graph.nodes.map((n) => ({
                ...n,
                type: n.type ?? 'editableNode',
            })) as Node<GraphNodeData>[],
            edges: graph.edges as Edge[],
            selectedNodeId: null,
            selectedNodeIds: [],
        }),

    resetGraph: () =>
        set({ nodes: [], edges: [], selectedNodeId: null, selectedNodeIds: [] }),

    updateNodeData: (id, data) =>
        set((state) => ({
            nodes: state.nodes.map((n) =>
                n.id === id ? { ...n, data: { ...n.data, ...data } } : n
            ),
        })),
}))