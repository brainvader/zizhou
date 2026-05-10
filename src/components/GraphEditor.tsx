import { useEffect, useCallback } from 'react'
import {
    ReactFlow,
    Background,
    Controls,
    type Node,
    type Edge,
    type NodeMouseHandler,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { nanoid } from 'nanoid'
import { exists, mkdir, readTextFile } from '@tauri-apps/plugin-fs'
import { useGraphStore } from '@/store/useGraphStore'
import { useProjectDetailStore } from '@/store/useProjectDetailStore'
import { useGraphFile } from '@/hooks/useGraphFile'
import { graphsDir, graphFilePath, GraphFileSchema } from '@/bom/graph'
import type { GraphNodeData, GraphFile, InitStatus } from '@/bom/graph'

// ============================================================
// Types
// ============================================================

type ExistsFn = (path: string) => Promise<boolean>
type MkdirFn = (path: string, options?: { recursive: boolean }) => Promise<void>
type ReadTextFileFn = (path: string) => Promise<string>

export type GraphEditorProps = {
    // store 系（省略時は Zustand からフォールバック）
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
    // Tauri fs 系（省略時は Tauri 実装にフォールバック）
    onExists?: ExistsFn
    onMkdir?: MkdirFn
    onReadTextFile?: ReadTextFileFn
    // 自動保存（省略時は useGraphFile を使用）
    setHydrated?: (hydrated: boolean) => void
}

/**
 * GraphEditor
 *
 * 責務: ノードの手動配置・接続・選択を管理するグラフエディタ。
 *
 * - マウント時に {projectRootPath}/graphs/ の存在を確認し initStatus を更新する
 * - initStatus: 'checking'      → ローディングスピナーを表示
 * - initStatus: 'uninitialized' → Setup ビューを表示（「初期化」ボタン）
 * - initStatus: 'ready'         → React Flow エディタを表示
 *
 * props DI: Tauri fs 依存・store 依存を props で受け取る。
 * 省略時は Tauri 実装・Zustand store にフォールバックする。
 *
 * @see docs/bom/graph.ts
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
    onMkdir = mkdir,
    onReadTextFile = readTextFile,
    setHydrated: setHydratedProp,
}: GraphEditorProps = {}) {
    // --- store フォールバック ---
    const storeNodes = useGraphStore((s) => s.nodes)
    const storeEdges = useGraphStore((s) => s.edges)
    const storeAddNode = useGraphStore((s) => s.addNode)
    const storeLoadGraph = useGraphStore((s) => s.loadGraph)
    const storeResetGraph = useGraphStore((s) => s.resetGraph)
    const storeSetSelectedNodeId = useGraphStore((s) => s.setSelectedNodeId)
    const storeInitStatus = useProjectDetailStore((s) => s.initStatus)
    const storeProjectRootPath = useProjectDetailStore((s) => s.projectRootPath)
    const storeActiveGraphId = useProjectDetailStore((s) => s.activeGraphId)
    const storeSetInitStatus = useProjectDetailStore((s) => s.setInitStatus)
    const { setHydrated: storeSetHydrated } = useGraphFile()

    const initStatus = initStatusProp ?? storeInitStatus
    const projectRootPath = projectRootPathProp ?? storeProjectRootPath
    const activeGraphId = activeGraphIdProp ?? storeActiveGraphId
    const nodes = nodesProp ?? storeNodes
    const edges = edgesProp ?? storeEdges
    const setInitStatus = onSetInitStatus ?? storeSetInitStatus
    const addNode = onAddNode ?? storeAddNode
    const loadGraph = onLoadGraph ?? storeLoadGraph
    const resetGraph = onResetGraph ?? storeResetGraph
    const setSelectedNodeId = onSetSelectedNodeId ?? storeSetSelectedNodeId
    const setHydrated = setHydratedProp ?? storeSetHydrated

    // --- Init Check ---
    const checkGraphsDir = useCallback(async () => {
        if (!projectRootPath) return
        const dir = graphsDir(projectRootPath)
        const found = await onExists(dir)
        setInitStatus(found ? 'ready' : 'uninitialized')
    }, [projectRootPath, setInitStatus, onExists])

    useEffect(() => {
        checkGraphsDir()
    }, [checkGraphsDir])

    // --- Load Graph ---
    useEffect(() => {
        if (initStatus !== 'ready' || !activeGraphId || !projectRootPath) {
            setHydrated(false)
            return
        }

        const loadAndHydrate = async () => {
            setHydrated(false)
            try {
                const filePath = graphFilePath(projectRootPath, activeGraphId)
                const fileExists = await onExists(filePath)
                if (fileExists) {
                    const text = await onReadTextFile(filePath)
                    const result = GraphFileSchema.safeParse(JSON.parse(text))
                    if (result.success) {
                        loadGraph(result.data)
                    } else {
                        resetGraph()
                    }
                } else {
                    resetGraph()
                }
            } catch {
                resetGraph()
            } finally {
                setHydrated(true)
            }
        }

        loadAndHydrate()
    }, [activeGraphId, initStatus, projectRootPath, loadGraph, resetGraph, setHydrated, onExists, onReadTextFile])

    // --- Init Dir ---
    const handleInit = useCallback(async () => {
        const dir = graphsDir(projectRootPath)
        await onMkdir(dir, { recursive: true })
        setInitStatus('ready')
    }, [projectRootPath, setInitStatus, onMkdir])

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

    const onNodesChange = useCallback((changes: any) => { void changes }, [])
    const onEdgesChange = useCallback((changes: any) => { void changes }, [])

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

            {initStatus === 'uninitialized' && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
                    <p>graphs/ ディレクトリが見つかりません</p>
                    <button data-testid="btn-init" onClick={handleInit}>
                        初期化
                    </button>
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
                    >
                        <Background />
                        <Controls />
                    </ReactFlow>
                </>
            )}
        </div>
    )
}