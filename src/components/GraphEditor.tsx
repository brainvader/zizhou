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
 *
 * [CTX-6] Edge Connect:
 * - onConnect で addEdge() を呼び store に反映する
 *
 * [CTX-7] Context Menu:
 * - contextMenu: { type, id, x, y } | null を useState で管理する（ローカル状態）
 * - onNodeContextMenu / onEdgeContextMenu でセットする
 * - onPaneClick で null にクリアする
 * - editingNodeId を useState で管理する（ローカル状態。Zustand には持たない）
 * - NODE_TYPES を useMemo 化し editingNodeId を EditableNode に prop で注入する
 * - Delete Node/Edge は onNodesChange/onEdgesChange(remove) 経由で処理する（ReactFlow の想定フロー）
 *
 * [CTX-8] Set Node Type:
 * - onSetNodeType は store.updateNodeData() に直結している
 * - 現状は E2E（Playwright）で結合確認する
 *
 * [CTX-9] Catalog Menu:
 * - キャンバス空白右クリックで CatalogMenu を表示する
 * - onPaneContextMenu で catalogMenu state をセットする
 * - CatalogMenu でエントリ選択 → addNodeFromCatalog() でノードを追加する
 * - 追加位置は右クリック座標を ReactFlow の flowToScreenPosition で変換する
 *
 * @context CTX-2/5/6/7/8/9
 * @see docs/bom/graph.ts
 * @see src/components/nodes/EditableNode.tsx
 * @see src/components/ContextMenu.tsx
 * @see src/components/CatalogMenu.tsx
 * @see src/hooks/useGraphInit.ts
 * @see src/hooks/useGraphFile.ts
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
    ReactFlow,
    ReactFlowProvider,
    Background,
    Controls,
    applyNodeChanges,
    applyEdgeChanges,
    useReactFlow,
    type Node,
    type Edge,
    type Connection,
    type NodeChange,
    type EdgeChange,
    type OnSelectionChangeParams,
    type NodeMouseHandler,
    type EdgeMouseHandler,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { nanoid } from 'nanoid'
import { exists, readTextFile } from '@tauri-apps/plugin-fs'
import { useGraphStore } from '@/store/useGraphStore'
import { useProjectDetailStore } from '@/store/useProjectDetailStore'
import { useGraphFile } from '@/hooks/useGraphFile'
import { useGraphInit } from '@/hooks/useGraphInit'
import { EditableNode } from '@/components/nodes/EditableNode'
import { ContextMenu } from '@/components/ContextMenu'
import { CatalogMenu } from '@/components/CatalogMenu'
import type { GraphNodeData, GraphFile, InitStatus, NodeType, CatalogEntry } from '@/bom/graph'

type ExistsFn = (path: string) => Promise<boolean>
type ReadTextFileFn = (path: string) => Promise<string>

// [CTX-7] ノード・エッジ用コンテキストメニューのローカル状態型
type ContextMenuState = {
    type: 'node' | 'edge'
    id: string
    x: number
    y: number
} | null

// [CTX-9] カタログメニューのローカル状態型
type CatalogMenuState = {
    x: number
    y: number
    flowX: number  // ReactFlow座標系でのX（ノード配置に使う）
    flowY: number  // ReactFlow座標系でのY
} | null

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
    // [CTX-6] props DI: 省略時は store.addEdge() を使用する
    onAddEdge?: (connection: Connection) => void
    onExists?: ExistsFn
    onReadTextFile?: ReadTextFileFn
    setHydrated?: (hydrated: boolean) => void
}

// [CTX-9] ReactFlow の useReactFlow を使うため内部コンポーネントに分離する
function GraphEditorInner({
    initStatus: initStatusProp,
    projectRootPath: projectRootPathProp,
    activeGraphId: activeGraphIdProp,
    nodes: nodesProp,
    edges: edgesProp,
    onSetInitStatus,
    onAddNode,
    onLoadGraph,
    onResetGraph,
    onSetSelectedNodeIds,
    onAddEdge,
    onExists = exists,
    onReadTextFile = readTextFile,
    setHydrated: setHydratedProp,
}: GraphEditorProps) {
    const { screenToFlowPosition } = useReactFlow()

    // --- store フォールバック ---
    const storeNodes = useGraphStore((s) => s.nodes)
    const storeEdges = useGraphStore((s) => s.edges)
    const storeAddNode = useGraphStore((s) => s.addNode)
    const storeAddEdge = useGraphStore((s) => s.addEdge)
    const storeAddNodeFromCatalog = useGraphStore((s) => s.addNodeFromCatalog)
    const storeSetSelectedNodeIds = useGraphStore((s) => s.setSelectedNodeIds)
    const storeInitStatus = useProjectDetailStore((s) => s.initStatus)
    const { setHydrated: storeSetHydrated } = useGraphFile()

    const storeSetNodes = useGraphStore((s) => s.setNodes)
    const storeSetEdges = useGraphStore((s) => s.setEdges)
    const storeUpdateNodeData = useGraphStore((s) => s.updateNodeData)

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
    const addEdge = onAddEdge ?? storeAddEdge
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

    // --- [CTX-7] ローカル状態 ---
    const [contextMenu, setContextMenu] = useState<ContextMenuState>(null)
    const [editingNodeId, setEditingNodeId] = useState<string | null>(null)

    // --- [CTX-9] カタログメニュー状態 ---
    const [catalogMenu, setCatalogMenu] = useState<CatalogMenuState>(null)

    // --- [CTX-7] NODE_TYPES: editingNodeId を EditableNode に注入するため useMemo 化 ---
    const nodeTypes = useMemo(() => {
        const node = (props: React.ComponentProps<typeof EditableNode>) => (
            <EditableNode
                {...props}
                isEditing={editingNodeId === props.id}
                onStartEditing={() => setEditingNodeId(props.id)}
                onStopEditing={() => setEditingNodeId(null)}
            />
        )
        return {
            editableNode: node,
            default: node,  // type 未指定ノードも EditableNode で描画する
        }
    }, [editingNodeId])

    // --- Add Node（手動ボタン） ---
    const handleAddNode = useCallback(() => {
        const node: Node<GraphNodeData> = {
            id: nanoid(),
            type: 'editableNode',
            position: {
                x: 80 + Math.random() * 400,
                y: 80 + Math.random() * 300,
            },
            data: { label: 'New Node' },
        }
        addNode(node)
    }, [addNode])

    // --- Select Node (single click) ---
    const handleNodeClick = useCallback(
        (_: React.MouseEvent, node: Node) => {
            setSelectedNodeIds([node.id])
        },
        [setSelectedNodeIds]
    )

    // --- [CTX-5] Selection Change (multi select) ---
    const handleSelectionChange = useCallback(
        ({ nodes: selectedNodes }: OnSelectionChangeParams) => {
            const ids = selectedNodes.map((n) => n.id)
            setSelectedNodeIds(ids)
        },
        [setSelectedNodeIds]
    )

    // --- [CTX-6] Connect ---
    const handleConnect = useCallback(
        (connection: Connection) => {
            addEdge(connection)
        },
        [addEdge]
    )

    // --- Nodes / Edges Change ---
    const onNodesChange = useCallback((changes: NodeChange[]) => {
        storeSetNodes(applyNodeChanges(changes, nodes) as Node<GraphNodeData>[])
    }, [nodes, storeSetNodes])

    const onEdgesChange = useCallback((changes: EdgeChange[]) => {
        storeSetEdges(applyEdgeChanges(changes, edges))
    }, [edges, storeSetEdges])

    // --- [CTX-7] Context Menu ハンドラ ---
    const handleNodeContextMenu: NodeMouseHandler = useCallback((e, node) => {
        e.preventDefault()
        setCatalogMenu(null)
        setContextMenu({ type: 'node', id: node.id, x: e.clientX, y: e.clientY })
    }, [])

    const handleEdgeContextMenu: EdgeMouseHandler = useCallback((e, edge) => {
        e.preventDefault()
        setCatalogMenu(null)
        setContextMenu({ type: 'edge', id: edge.id, x: e.clientX, y: e.clientY })
    }, [])

    // --- [CTX-9] Pane 右クリック → カタログメニュー ---
    const handlePaneContextMenu = useCallback((e: MouseEvent | React.MouseEvent) => {
        // onPaneContextMenu は MouseEvent | React.MouseEvent のユニオン型
        e.preventDefault()
        setContextMenu(null)
        const flowPos = screenToFlowPosition({ x: e.clientX, y: e.clientY })
        setCatalogMenu({
            x: e.clientX,
            y: e.clientY,
            flowX: flowPos.x,
            flowY: flowPos.y,
        })
    }, [screenToFlowPosition])

    // --- Pane クリック（左クリック）: 両メニューを閉じる ---
    const handlePaneClick = useCallback(() => {
        setContextMenu(null)
        setCatalogMenu(null)
    }, [])

    // --- [CTX-7] メニューアクション ---
    const handleDeleteFromMenu = useCallback(() => {
        if (!contextMenu) return
        if (contextMenu.type === 'node') {
            onNodesChange([{ type: 'remove', id: contextMenu.id }])
        } else {
            onEdgesChange([{ type: 'remove', id: contextMenu.id }])
        }
        setContextMenu(null)
    }, [contextMenu, onNodesChange, onEdgesChange])

    const handleEditLabelFromMenu = useCallback(() => {
        if (!contextMenu) return
        setEditingNodeId(contextMenu.id)
        setContextMenu(null)
    }, [contextMenu])

    // --- [CTX-8] Set Node Type ---
    const handleSetNodeType = useCallback((type: NodeType) => {
        if (!contextMenu) return
        storeUpdateNodeData(contextMenu.id, { nodeType: type })
    }, [contextMenu, storeUpdateNodeData])

    // --- [CTX-9] カタログからノード追加 ---
    const handleSelectCatalogEntry = useCallback((entry: CatalogEntry) => {
        if (!catalogMenu) return
        storeAddNodeFromCatalog(entry, { x: catalogMenu.flowX, y: catalogMenu.flowY })
        setCatalogMenu(null)
    }, [catalogMenu, storeAddNodeFromCatalog])

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
                        onConnect={handleConnect}
                        onNodeContextMenu={handleNodeContextMenu}
                        onEdgeContextMenu={handleEdgeContextMenu}
                        onPaneContextMenu={handlePaneContextMenu}
                        onPaneClick={handlePaneClick}
                        nodeTypes={nodeTypes}
                        deleteKeyCode="Delete"
                        multiSelectionKeyCode="Shift"
                    >
                        <Background />
                        <Controls />
                    </ReactFlow>

                    {/* [CTX-7] Node / Edge Context Menu */}
                    {contextMenu && (
                        <ContextMenu
                            type={contextMenu.type}
                            x={contextMenu.x}
                            y={contextMenu.y}
                            onDelete={handleDeleteFromMenu}
                            onEditLabel={handleEditLabelFromMenu}
                            onClose={() => setContextMenu(null)}
                            onSetNodeType={handleSetNodeType}
                        />
                    )}

                    {/* [CTX-9] Catalog Menu */}
                    {catalogMenu && (
                        <CatalogMenu
                            x={catalogMenu.x}
                            y={catalogMenu.y}
                            onClose={() => setCatalogMenu(null)}
                            onSelectEntry={handleSelectCatalogEntry}
                        />
                    )}
                </>
            )}
        </div>
    )
}

// useReactFlow() は ReactFlowProvider の子孫でしか使えない。
// GraphEditorInner が ReactFlow の外側で useReactFlow() を呼ぶため
// ReactFlowProvider で明示的にラップする。
export function GraphEditor(props: GraphEditorProps = {}) {
    return (
        <ReactFlowProvider>
            <GraphEditorInner {...props} />
        </ReactFlowProvider>
    )
}