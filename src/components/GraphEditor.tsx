import { useCallback, useEffect } from 'react'
import {
    ReactFlow,
    Background,
    Controls,
    applyNodeChanges,
    applyEdgeChanges,
    type Node,
    type Edge,
    type NodeChange,
    type EdgeChange,
    type NodeMouseHandler,
    type OnSelectionChangeParams,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { nanoid } from 'nanoid'
import { exists, readTextFile } from '@tauri-apps/plugin-fs'
import { useGraphStore } from '@/store/useGraphStore'
import { useProjectDetailStore } from '@/store/useProjectDetailStore'
import { useGraphFile } from '@/hooks/useGraphFile'
import { useGraphInit } from '@/hooks/useGraphInit'
import { EditableNode } from '@/components/nodes/EditableNode'
import type { GraphNodeData, GraphFile, InitStatus } from '@/bom/graph'

const NODE_TYPES = { editableNode: EditableNode }

type ExistsFn = (path: string) => Promise<boolean>
type ReadTextFileFn = (path: string) => Promise<string>

export type GraphEditorProps = {
    initStatus?: InitStatus
    projectRootPath?: string
    activeGraphId?: string | null
    nodes?: Node<GraphNodeData>[]
    edges?: Edge[]
    onSetInitStatus?: (status: InitStatus) => void
    onAddNode?: (node: Node<GraphNodeData>) => void
    onLoadGraph?: (graph: GraphFile) => void
    onResetGraph?: () => void
    onSetSelectedNodeId?: (id: string | null) => void
    // [CTX-5] props DI: 省略時は store.setSelectedNodeIds() を使用する
    onSetSelectedNodeIds?: (ids: string[]) => void
    onExists?: ExistsFn
    onReadTextFile?: ReadTextFileFn
    setHydrated?: (hydrated: boolean) => void
}

/**
 * GraphEditor
 *
 * 責務: ノードの手動配置・接続・選択・インライン編集を管理するグラフエディタ。
 *
 * - initStatus: 'checking' → ローディングスピナーを表示
 * - initStatus: 'ready'    → React Flow エディタを表示
 *
 * [CTX-5] 複数選択:
 * - onSelectionChange で selectedNodeIds[] を store に反映する
 * - Single Guard は store.setSelectedNodeIds() 内に実装済み
 * - 複数選択中の移動・削除は ReactFlow 標準動作に委ねる
 *
 * @see docs/bom/graph.ts
 * @see src/components/nodes/EditableNode.tsx
 * @see src/hooks/useGraphInit.ts
 * @see src/hooks/useGraphFile.ts
 */
export function GraphEditor({
    initStatus: initStatusProp,
    projectRootPath: projectRootPathProp,
    activeGraphId: activeGraphIdProp,
    nodes: nodesProp,
    edges: edgesProp,
    onSetInitStatus,
    onAddNode,
    onLoadGraph,
    onResetGraph,
    onSetSelectedNodeId,
    onSetSelectedNodeIds,
    onExists = exists,
    onReadTextFile = readTextFile,
    setHydrated: setHydratedProp,
}: GraphEditorProps = {}) {
    // --- store フォールバック ---
    const storeNodes = useGraphStore((s) => s.nodes)
    const storeEdges = useGraphStore((s) => s.edges)
    const storeAddNode = useGraphStore((s) => s.addNode)
    const storeSetSelectedNodeId = useGraphStore((s) => s.setSelectedNodeId)
    const storeSetSelectedNodeIds = useGraphStore((s) => s.setSelectedNodeIds)
    const storeInitStatus = useProjectDetailStore((s) => s.initStatus)
    const { setHydrated: storeSetHydrated } = useGraphFile()

    const storeSetNodes = useGraphStore((s) => s.setNodes)
    const storeSetEdges = useGraphStore((s) => s.setEdges)

    useEffect(() => {
        if (nodesProp !== undefined) storeSetNodes(nodesProp)
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (edgesProp !== undefined) storeSetEdges(edgesProp)
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    const initStatus = initStatusProp ?? storeInitStatus
    const nodes = storeNodes
    const edges = storeEdges
    const addNode = onAddNode ?? storeAddNode
    const setSelectedNodeId = onSetSelectedNodeId ?? storeSetSelectedNodeId
    const setSelectedNodeIds = onSetSelectedNodeIds ?? storeSetSelectedNodeIds

    useGraphInit({
        projectRootPath: projectRootPathProp,
        activeGraphId: activeGraphIdProp,
        initStatus: initStatusProp,
        onSetInitStatus,
        onLoadGraph,
        onResetGraph,
        onExists,
        onReadTextFile,
        setHydrated: setHydratedProp ?? storeSetHydrated,
    })

    // --- Add Node ---
    const handleAddNode = useCallback(() => {
        const node: Node<GraphNodeData> = {
            id: nanoid(),
            type: 'editableNode',
            position: { x: 100, y: 100 },
            data: { label: 'New Node' },
        }
        addNode(node)
    }, [addNode])

    // --- Select Node (single click) ---
    const handleNodeClick: NodeMouseHandler = useCallback((_event, node) => {
        setSelectedNodeId(node.id)
    }, [setSelectedNodeId])

    // --- [CTX-5] Selection Change (multi select) ---
    // onSelectionChange は単一選択・複数選択・選択解除すべてで発火する。
    // Single Guard は setSelectedNodeIds 内に実装済み。
    const handleSelectionChange = useCallback(
        ({ nodes: selectedNodes }: OnSelectionChangeParams) => {
            const ids = selectedNodes.map((n) => n.id)
            setSelectedNodeIds(ids)
        },
        [setSelectedNodeIds]
    )

    // --- Nodes / Edges Change ---
    const onNodesChange = useCallback((changes: NodeChange[]) => {
        storeSetNodes(applyNodeChanges(changes, nodes) as Node<GraphNodeData>[])
    }, [nodes, storeSetNodes])

    const onEdgesChange = useCallback((changes: EdgeChange[]) => {
        storeSetEdges(applyEdgeChanges(changes, edges))
    }, [edges, storeSetEdges])

    return (
        <div
            data-testid="graph-editor"
            style={{ flex: 1, position: 'relative', overflow: 'hidden', minHeight: 0, height: '100%' }}
        >
            {initStatus === 'ready' && (
                <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 10 }}>
                    <button
                        data-testid="btn-add-node"
                        onClick={handleAddNode}
                    >
                        ＋ ノード追加
                    </button>
                </div>
            )}

            {initStatus === 'ready' && (
                <>
                    {nodes.length === 0 && (
                        <div
                            data-testid="graph-editor-empty"
                            style={{
                                position: 'absolute',
                                inset: 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                pointerEvents: 'none',
                                opacity: 0.3,
                            }}
                        >
                            <span>ノードを追加してください</span>
                        </div>
                    )}
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onNodeClick={handleNodeClick}
                        onSelectionChange={handleSelectionChange}
                        nodeTypes={NODE_TYPES}
                        deleteKeyCode="Delete"
                    >
                        <Background />
                        <Controls />
                    </ReactFlow>
                </>
            )}
        </div>
    )
}