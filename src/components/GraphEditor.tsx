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
import { exists, mkdir } from '@tauri-apps/plugin-fs'
import { useGraphStore } from '@/store/useGraphStore'
import { useProjectDetailStore } from '@/store/useProjectDetailStore'
import { graphsDir } from '@/bom/graph'
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
 */
export function GraphEditor() {
    const nodes = useGraphStore((s) => s.nodes)
    const edges = useGraphStore((s) => s.edges)
    const setNodes = useGraphStore((s) => s.setNodes)
    const setEdges = useGraphStore((s) => s.setEdges)
    const addNode = useGraphStore((s) => s.addNode)
    const setSelectedNodeId = useGraphStore((s) => s.setSelectedNodeId)

    const initStatus = useProjectDetailStore((s) => s.initStatus)
    const projectRootPath = useProjectDetailStore((s) => s.projectRootPath)
    const setInitStatus = useProjectDetailStore((s) => s.setInitStatus)

    // --- Init Check ---
    const checkGraphsDir = useCallback(async () => {
        if (!projectRootPath) return
        const dir = graphsDir(projectRootPath)
        const found = await exists(dir)
        setInitStatus(found ? 'ready' : 'uninitialized')
    }, [projectRootPath, setInitStatus])

    useEffect(() => {
        checkGraphsDir()
    }, [checkGraphsDir])

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
    const onNodesChange = useCallback(
        (changes: Parameters<typeof setNodes>[0] extends Node[] ? any : any) => {
            void changes
        },
        []
    )
    const onEdgesChange = useCallback(
        (changes: any) => {
            void changes
        },
        []
    )

    // --- Render ---
    return (
        <div
            id="graph-editor"
            style={{ flex: 1, position: 'relative', overflow: 'hidden' }}
        >
            {/* ツールバー — 常に表示。ready 以外は disabled */}
            <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 10 }}>
                <button
                    onClick={handleAddNode}
                    disabled={initStatus !== 'ready'}
                >
                    ＋ ノード追加
                </button>
            </div>

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
                    <span>Loading...</span>
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
                    <button onClick={handleInit}>初期化</button>
                </div>
            )}

            {/* Render: ready */}
            {initStatus === 'ready' && (
                <>
                    {/* Empty State */}
                    {nodes.length === 0 && (
                        <div
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