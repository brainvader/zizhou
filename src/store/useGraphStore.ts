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

    addEdge: (connection) =>
        set((state) => ({ edges: rfAddEdge(connection, state.edges) })),

    loadGraph: (graph) =>
        set({
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