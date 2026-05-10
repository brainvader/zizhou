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
import type { GraphNodeData } from '@/bom/graph'

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
 * [Persist]
 * useGraphFile() の setHydrated を使い、loadGraph/resetGraph 完了後に
 * subscribe ベースの自動保存を有効にする。
 * activeGraphId が変化するたびにグラフをロードし直し、
 * ロード完了後に setHydrated(true) を呼ぶことで「ロード中の誤保存」を防ぐ。
 *
 * @see docs/bom/graph.ts
 * @see src/hooks/useGraphFile.ts
 */
export function GraphEditor() {
    const nodes = useGraphStore((s) => s.nodes)
    const edges = useGraphStore((s) => s.edges)
    const addNode = useGraphStore((s) => s.addNode)
    const loadGraph = useGraphStore((s) => s.loadGraph)
    const resetGraph = useGraphStore((s) => s.resetGraph)
    const setSelectedNodeId = useGraphStore((s) => s.setSelectedNodeId)

    const initStatus = useProjectDetailStore((s) => s.initStatus)
    const projectRootPath = useProjectDetailStore((s) => s.projectRootPath)
    const activeGraphId = useProjectDetailStore((s) => s.activeGraphId)
    const setInitStatus = useProjectDetailStore((s) => s.setInitStatus)

    // Persist hook — subscribe ベースの自動保存
    const { setHydrated } = useGraphFile()

    // --- Init Check ---
    // マウント時に graphs/ の存在を確認し initStatus を更新する
    const checkGraphsDir = useCallback(async () => {
        if (!projectRootPath) return
        const dir = graphsDir(projectRootPath)
        const found = await exists(dir)
        setInitStatus(found ? 'ready' : 'uninitialized')
    }, [projectRootPath, setInitStatus])

    useEffect(() => {
        checkGraphsDir()
    }, [checkGraphsDir])

    // --- Load Graph ---
    // activeGraphId または initStatus が変化したらグラフをロードし hydrated を有効にする
    useEffect(() => {
        if (initStatus !== 'ready' || !activeGraphId || !projectRootPath) {
            // ready でない間は保存をブロック
            setHydrated(false)
            return
        }

        const loadAndHydrate = async () => {
            setHydrated(false) // ロード中は保存をブロック
            try {
                const filePath = graphFilePath(projectRootPath, activeGraphId)
                const fileExists = await exists(filePath)
                if (fileExists) {
                    const text = await readTextFile(filePath)
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
                setHydrated(true) // ロード完了 → 以降の変化は保存する
            }
        }

        loadAndHydrate()
    }, [activeGraphId, initStatus, projectRootPath, loadGraph, resetGraph, setHydrated])

    // --- Init Dir ---
    const handleInit = useCallback(async () => {
        const dir = graphsDir(projectRootPath)
        await mkdir(dir, { recursive: true })
        setInitStatus('ready')
    }, [projectRootPath, setInitStatus])

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

    // --- onNodesChange / onEdgesChange (React Flow 標準) ---
    const onNodesChange = useCallback((changes: any) => { void changes }, [])
    const onEdgesChange = useCallback((changes: any) => { void changes }, [])

    // --- Render ---
    return (
        <div
            data-testid="graph-editor"
            style={{ flex: 1, position: 'relative', overflow: 'hidden' }}
        >
            {/* ツールバー — ready 時のみ表示 */}
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

            {/* Render: checking */}
            {initStatus === 'checking' && (
                <div
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

            {/* Render: uninitialized */}
            {initStatus === 'uninitialized' && (
                <div
                    style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 16,
                    }}
                >
                    <p>graphs/ ディレクトリが見つかりません</p>
                    <button
                        data-testid="btn-init"
                        onClick={handleInit}
                    >
                        初期化
                    </button>
                </div>
            )}

            {/* Render: ready */}
            {initStatus === 'ready' && (
                <>
                    {/* Empty State */}
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

                    {/* React Flow */}
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