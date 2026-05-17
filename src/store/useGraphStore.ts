import { create } from 'zustand'
import type { Node, Edge } from '@xyflow/react'
import type { GraphNodeData, GraphStore } from '@/bom/graph'

export const useGraphStore = create<GraphStore>((set) => ({
    // State
    nodes: [],
    edges: [],
    selectedNodeId: null,

    // Actions
    setNodes: (nodes: Node<GraphNodeData>[]) => set({ nodes }),
    setEdges: (edges: Edge[]) => set({ edges }),
    setSelectedNodeId: (id: string | null) => set({ selectedNodeId: id }),
    addNode: (node: Node<GraphNodeData>) =>
        set((state) => ({ nodes: [...state.nodes, node] })),
    loadGraph: (graph) =>
        set({
            nodes: graph.nodes as Node<GraphNodeData>[],
            edges: graph.edges as Edge[],
            selectedNodeId: null,
        }),
    resetGraph: () => set({ nodes: [], edges: [], selectedNodeId: null }),

    // [CTX-4] 指定 id のノードの data を部分更新する。
    // Partial<GraphNodeData> のスプレッドマージのため、
    // label のみ更新しても description は保持される。
    updateNodeData: (id, data) =>
        set((state) => ({
            nodes: state.nodes.map((n) =>
                n.id === id ? { ...n, data: { ...n.data, ...data } } : n
            ),
        })),
}))