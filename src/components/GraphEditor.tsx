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
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { nanoid } from 'nanoid'
import { exists, mkdir, readTextFile } from '@tauri-apps/plugin-fs'
import { useGraphStore } from '@/store/useGraphStore'
import { useProjectDetailStore } from '@/store/useProjectDetailStore'
import { useGraphFile } from '@/hooks/useGraphFile'
import { useGraphInit } from '@/hooks/useGraphInit'
import type { GraphNodeData, GraphFile, InitStatus } from '@/bom/graph'

// ============================================================
// Types
// ============================================================

type ExistsFn = (path: string) => Promise<boolean>
type MkdirFn = (path: string, options?: { recursive: boolean }) => Promise<void>
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
    onExists?: ExistsFn
    onReadTextFile?: ReadTextFileFn
    setHydrated?: (hydrated: boolean) => void
}

/**
 * GraphEditor
 *
 * 責務: ノードの手動配置・接続・選択を管理するグラフエディタ。
 *
 * - initStatus: 'checking'      → ローディングスピナーを表示
 * - initStatus: 'uninitialized' → Setup ビューを表示（「初期化」ボタン）
 * - initStatus: 'ready'         → React Flow エディタを表示
 *
 * 初期化・ロードロジックは useGraphInit に委譲する。
 *
 * props DI: Tauri fs 依存・store 依存を props で受け取る。
 * 省略時は Tauri 実装・Zustand store にフォールバックする。
 *
 * @see docs/bom/graph.ts
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
    onExists = exists,
    onReadTextFile = readTextFile,
    setHydrated: setHydratedProp,
}: GraphEditorProps = {}) {
    // --- store フォールバック (描画用) ---
    const storeNodes = useGraphStore((s) => s.nodes)
    const storeEdges = useGraphStore((s) => s.edges)
    const storeAddNode = useGraphStore((s) => s.addNode)
    const storeSetSelectedNodeId = useGraphStore((s) => s.setSelectedNodeId)
    const storeInitStatus = useProjectDetailStore((s) => s.initStatus)
    const { setHydrated: storeSetHydrated } = useGraphFile()

    const storeSetNodes = useGraphStore((s) => s.setNodes)
    const storeSetEdges = useGraphStore((s) => s.setEdges)

    // props で渡された nodes/edges はマウント時に store に注入する。
    // 以降は常に storeNodes/storeEdges を参照することで、
    // onNodesChange/onEdgesChange による store 更新が正しく反映される。
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

    // --- 初期化・ロードロジックを useGraphInit に委譲 ---
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
            position: { x: 100, y: 100 },
            data: { label: 'New Node' },
        }
        addNode(node)
    }, [addNode])

    // --- Select Node ---
    const handleNodeClick: NodeMouseHandler = useCallback((_event, node) => {
        setSelectedNodeId(node.id)
    }, [setSelectedNodeId])

    const onNodesChange = useCallback((changes: NodeChange[]) => {
        storeSetNodes(applyNodeChanges(changes, nodes) as Node<GraphNodeData>[])
    }, [nodes, storeSetNodes])

    const onEdgesChange = useCallback((changes: EdgeChange[]) => {
        storeSetEdges(applyEdgeChanges(changes, edges))
    }, [edges, storeSetEdges])

    // --- Render ---
    return (
        <div
            data-testid="graph-editor"
            style={{ flex: 1, position: 'relative', overflow: 'hidden' }}
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

            {initStatus === 'checking' && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span>Loading…</span>
                </div>
            )}

            {initStatus === 'ready' && (
                <>
                    {nodes.length === 0 && (
                        <div
                            data-testid="graph-editor-empty"
                            style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', opacity: 0.3 }}
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