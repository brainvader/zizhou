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
 *
 * [CTX-6] Edge Connect:
 * - onConnect で addEdge() を呼び store に反映する
 *
 * [CTX-7] Context Menu:
 * - contextMenu: { type, id, x, y } | null を useState で管理する（ローカル状態）
 * - editingNodeId を useState で管理する（ローカル状態。Zustand には持たない）
 *
 * [CTX-9] Catalog Menu:
 * - キャンバス空白右クリックで CatalogMenu を表示する
 *
 * [CTX-10] Export / Import:
 * - キャンバス左上にツールバーボタン（Export / Import）を固定配置する
 *
 * [CTX-15] Graph Persist (SurrealDB):
 * - useGraphInit → useGraphLoad に置き換え（invoke('load_graph') ベース）
 * - useGraphFile → useGraphSave に置き換え（subscribe + invoke('save_graph')）
 * - props DI: onLoadGraph / onSaveGraph で差し替え可能
 *
 * @context CTX-2/5/6/7/8/9/10/14/15
 * @see docs/bom/graph.ts
 * @see src/hooks/useGraphLoad.ts
 * @see src/hooks/useGraphSave.ts
 * @see src/hooks/useNodeExecute.ts
 * @see src/hooks/useGraphExport.ts
 * @see src/hooks/useGraphImport.ts
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
import { writeTextFile } from '@tauri-apps/plugin-fs'
import { save } from '@tauri-apps/plugin-dialog'
import { toast } from 'sonner'
import { useGraphStore } from '@/store/useGraphStore'
import { useProjectDetailStore } from '@/store/useProjectDetailStore'
import { useProjectStore } from '@/store/useProjectStore'
import { useGraphLoad } from '@/hooks/useGraphLoad'
import { useGraphSave } from '@/hooks/useGraphSave'
import { useNodeExecute } from '@/hooks/useNodeExecute'
import { useGraphExport } from '@/hooks/useGraphExport'
import { useGraphImport } from '@/hooks/useGraphImport'
import { EditableNode } from '@/components/nodes/EditableNode'
import { ContextMenu } from '@/components/ContextMenu'
import { CatalogMenu } from '@/components/CatalogMenu'
import { ExportModal } from '@/components/ExportModal'
import { ImportModal } from '@/components/ImportModal'
import type { GraphNodeData, GraphFile } from '@/bom/graph'
import type { LlmExportPayload, LlmImportPayload } from '@/bom/llm-export'

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
    flowX: number
    flowY: number
} | null

export type GraphEditorProps = {
    initStatus?: 'checking' | 'ready'
    activeGraphId?: string | null
    nodes?: Node<GraphNodeData>[]
    edges?: Edge[]
    onAddNode?: (node: Node<GraphNodeData>) => void
    onLoadGraph?: (graph: GraphFile) => void
    onResetGraph?: () => void
    onSetSelectedNodeId?: (id: string | null) => void
    // [CTX-5] props DI: 省略時は store.setSelectedNodeIds() を使用する
    onSetSelectedNodeIds?: (ids: string[]) => void
    // [CTX-6] props DI: 省略時は store.addEdge() を使用する
    onAddEdge?: (connection: Connection) => void
    // [CTX-15] props DI: テスト・Storybook で invoke を差し替える
    onInvokeLoadGraph?: (graphId: string) => Promise<GraphFile>
    onInvokeSaveGraph?: (graphId: string, nodes: Node<GraphNodeData>[], edges: Edge[]) => Promise<void>
    setHydrated?: (hydrated: boolean) => void
    // [CTX-10] Export/Import 用プロジェクトID。省略時は ''
    projectId?: string
}

// [CTX-9] ReactFlow の useReactFlow を使うため内部コンポーネントに分離する
function GraphEditorInner({
    initStatus: initStatusProp,
    activeGraphId: activeGraphIdProp,
    nodes: nodesProp,
    edges: edgesProp,
    onAddNode,
    onLoadGraph,
    onResetGraph,
    onSetSelectedNodeIds,
    onAddEdge,
    onInvokeLoadGraph,
    onInvokeSaveGraph,
    setHydrated: setHydratedProp,
    projectId: projectIdProp = '',
}: GraphEditorProps) {
    const { screenToFlowPosition } = useReactFlow()

    // --- store フォールバック ---
    const storeNodes = useGraphStore((s) => s.nodes)
    const storeEdges = useGraphStore((s) => s.edges)
    const storeAddNode = useGraphStore((s) => s.addNode)
    const storeAddEdge = useGraphStore((s) => s.addEdge)
    const storeAddNodeFromCatalog = useGraphStore((s) => s.addNodeFromCatalog)
    const storeSetSelectedNodeIds = useGraphStore((s) => s.setSelectedNodeIds)
    const storeSetNodes = useGraphStore((s) => s.setNodes)
    const storeSetEdges = useGraphStore((s) => s.setEdges)
    const storeUpdateNodeData = useGraphStore((s) => s.updateNodeData)

    const isDetailHydrated = useProjectDetailStore((s) => s.isDetailHydrated)
    // [CTX-16] activeProject の rootPath を cwd として使用する
    const activeProject = useProjectStore((s) => s.projects.find((p) => p.id === projectIdProp))
    const rootPath = activeProject?.rootPath ?? ''

    // [CTX-15] useGraphSave（useGraphFile の置き換え）
    const { setHydrated: saveSetHydrated } = useGraphSave({
        onSaveGraph: onInvokeSaveGraph,
        setHydrated: setHydratedProp,
    })

    // [CTX-15] useGraphLoad（useGraphInit の置き換え）
    useGraphLoad({
        onLoadGraph: onInvokeLoadGraph,
        onLoadGraphFn: onLoadGraph,
        onResetGraph,
        setHydrated: saveSetHydrated,
        activeGraphId: activeGraphIdProp,
    })

    useEffect(() => {
        if (nodesProp !== undefined) storeSetNodes(nodesProp)
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (edgesProp !== undefined) storeSetEdges(edgesProp)
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    const isReady = initStatusProp !== undefined ? initStatusProp === 'ready' : isDetailHydrated
    const nodes = storeNodes
    const edges = storeEdges
    const addNode = onAddNode ?? storeAddNode
    const addEdge = onAddEdge ?? storeAddEdge
    const setSelectedNodeIds = onSetSelectedNodeIds ?? storeSetSelectedNodeIds

    // --- [CTX-7] ローカル状態 ---
    const [contextMenu, setContextMenu] = useState<ContextMenuState>(null)
    const [editingNodeId, setEditingNodeId] = useState<string | null>(null)

    // --- [CTX-9] カタログメニュー状態 ---
    const [catalogMenu, setCatalogMenu] = useState<CatalogMenuState>(null)

    // --- [CTX-14] ノード実行 ---
    const { runningNodeId, execute } = useNodeExecute()

    // --- [CTX-10] Export / Import ---
    const [exportPayload, setExportPayload] = useState<LlmExportPayload | null>(null)
    const [showImport, setShowImport] = useState(false)

    const { exportGraph } = useGraphExport({ projectId: projectIdProp })
    const { importGraph } = useGraphImport()

    const handleExport = useCallback(async () => {
        try {
            const payload = await exportGraph()
            setExportPayload(payload)
        } catch {
            toast.error('エクスポートに失敗しました')
        }
    }, [exportGraph])

    const handleExportCopy = useCallback(async () => {
        if (!exportPayload) return
        try {
            await navigator.clipboard.writeText(JSON.stringify(exportPayload, null, 2))
            toast.success('クリップボードにコピーしました')
            setExportPayload(null)
        } catch {
            toast.error('コピーに失敗しました')
        }
    }, [exportPayload])

    const handleExportSave = useCallback(async () => {
        if (!exportPayload) return
        try {
            const filePath = await save({
                filters: [{ name: 'JSON', extensions: ['json'] }],
                defaultPath: `graph-export-${Date.now()}.json`,
            })
            if (filePath) {
                await writeTextFile(filePath, JSON.stringify(exportPayload, null, 2))
                toast.success('ファイルに保存しました')
                setExportPayload(null)
            }
        } catch {
            toast.error('保存に失敗しました')
        }
    }, [exportPayload])

    const handleImport = useCallback(async (payload: LlmImportPayload) => {
        await importGraph(payload)
        setShowImport(false)
        toast.success('グラフをインポートしました')
    }, [importGraph])

    // --- [CTX-7/14] NODE_TYPES: editingNodeId / onRun を EditableNode に注入するため useMemo 化 ---
    // [CTX-16] rootPath を ref で保持して useMemo の依存から外す（React Flow node remount 防止）
    const rootPathRef = useRef(rootPath)
    useEffect(() => { rootPathRef.current = rootPath }, [rootPath])

    const nodeTypes = useMemo(() => {
        const node = (props: React.ComponentProps<typeof EditableNode>) => {
            const nodeData = props.data
            const handleRun = () => {
                if (!nodeData.service || !nodeData.provider) return
                execute(props.id, {
                    service: nodeData.service,
                    provider: nodeData.provider,
                    cwd: rootPathRef.current,
                    input: nodeData.input ?? {},
                })
            }
            return (
                <EditableNode
                    {...props}
                    isEditing={editingNodeId === props.id}
                    onStartEditing={() => setEditingNodeId(props.id)}
                    onStopEditing={() => setEditingNodeId(null)}
                    onRun={nodeData.service ? handleRun : undefined}
                    isRunning={runningNodeId === props.id}
                />
            )
        }
        return {
            editableNode: node,
            default: node,
        }
    }, [editingNodeId, runningNodeId, execute])

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

    const handlePaneContextMenu = useCallback((e: MouseEvent | React.MouseEvent) => {
        e.preventDefault()
        setContextMenu(null)
        const flowPos = screenToFlowPosition({ x: e.clientX, y: e.clientY })
        setCatalogMenu({ x: e.clientX, y: e.clientY, flowX: flowPos.x, flowY: flowPos.y })
    }, [screenToFlowPosition])

    const handlePaneClick = useCallback(() => {
        setContextMenu(null)
        setCatalogMenu(null)
    }, [])

    // --- [CTX-7] Context Menu アクション ---
    const handleDeleteFromMenu = useCallback(() => {
        if (!contextMenu) return
        if (contextMenu.type === 'node') {
            storeSetNodes(nodes.filter((n) => n.id !== contextMenu.id))
        } else {
            storeSetEdges(edges.filter((e) => e.id !== contextMenu.id))
        }
        setContextMenu(null)
    }, [contextMenu, nodes, edges, storeSetNodes, storeSetEdges])

    const handleEditLabelFromMenu = useCallback(() => {
        if (!contextMenu || contextMenu.type !== 'node') return
        setEditingNodeId(contextMenu.id)
        setContextMenu(null)
    }, [contextMenu])

    const handleSetNodeType = useCallback((nodeType: string) => {
        if (!contextMenu || contextMenu.type !== 'node') return
        storeUpdateNodeData(contextMenu.id, { nodeType: nodeType as GraphNodeData['nodeType'] })
        setContextMenu(null)
    }, [contextMenu, storeUpdateNodeData])

    // --- [CTX-9] Catalog Menu アクション ---
    const handleSelectCatalogEntry = useCallback((entry: import('@/bom/graph').CatalogEntry) => {
        if (!catalogMenu) return
        storeAddNodeFromCatalog(entry, { x: catalogMenu.flowX, y: catalogMenu.flowY })
        setCatalogMenu(null)
    }, [catalogMenu, storeAddNodeFromCatalog])

    return (
        <div
            data-testid="graph-editor"
            style={{ position: 'relative', width: '100%', height: '100%' }}
        >
            {!isReady && (
                <div
                    data-testid="graph-editor-loading"
                    style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <span>Loading…</span>
                </div>
            )}

            {isReady && (
                <div
                    data-testid="graph-toolbar"
                    style={{ position: 'absolute', top: 8, left: 8, zIndex: 10, display: 'flex', gap: 4 }}
                >
                    <button
                        data-testid="btn-add-node"
                        onClick={handleAddNode}
                    >
                        ＋ ノード追加
                    </button>
                    <button
                        data-testid="btn-export"
                        onClick={handleExport}
                    >
                        Export
                    </button>
                    <button
                        data-testid="btn-import"
                        onClick={() => setShowImport(true)}
                    >
                        Import
                    </button>
                </div>
            )}

            {isReady && (
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

                    {/* [CTX-10] Export Modal */}
                    {exportPayload && (
                        <ExportModal
                            payload={exportPayload}
                            onCopy={handleExportCopy}
                            onSave={handleExportSave}
                            onClose={() => setExportPayload(null)}
                        />
                    )}

                    {/* [CTX-10] Import Modal */}
                    {showImport && (
                        <ImportModal
                            onImport={handleImport}
                            onClose={() => setShowImport(false)}
                        />
                    )}
                </>
            )}
        </div>
    )
}

// useReactFlow() は ReactFlowProvider の子孫でしか使えない。
export function GraphEditor(props: GraphEditorProps = {}) {
    return (
        <ReactFlowProvider>
            <GraphEditorInner {...props} />
        </ReactFlowProvider>
    )
}