/**
 * SourceGraphView
 *
 * プロジェクトのファイル間依存関係グラフを ReactFlow で描画するコンポーネント。
 * GraphEditor（workflow グラフ用）の代わりに projects.$id.tsx の中央ペインに配置する。
 *
 * [CTX-21] 責務:
 *   - SourceNode カスタムノードで各ファイルを表示する
 *   - staleFiles に基づき computeAnalyzedDisplay で displayStatus を算出してノードに注入
 *   - selectedFilePath に一致するノードを selected=true にする（File→Node 同期）
 *   - ノードクリック時に onNodeSelect(filePath) を呼ぶ（Node→File 同期）
 *   - ↺ボタン押下時に onReanalyze(filePath) を呼ぶ
 *   - ノード位置変更時に onNodesChange(nodes) を呼ぶ（Position Persist）
 *
 * 設計方針:
 *   - ReactFlowProvider で自己ラップ（GraphEditor と同様）
 *   - Zustand store を持たない（外から nodes/edges を受け取るだけ）
 *   - useNodesState で ReactFlow 内部の位置変更を管理し、
 *     ドラッグ完了後（'position' change の dragging=false）に親へ通知する
 *   - Props DI: 外部依存なし（全て props 経由）
 *
 * @context CTX-21
 * @bom docs/bom/source-graph.ts
 * @see src/components/nodes/SourceNode.tsx
 * @see src/routes/projects.$id.tsx
 * @see docs/specs/SourceGraphView.stories.tsx
 */

import { useCallback, useEffect, useMemo, useRef } from 'react'
import {
    ReactFlow,
    ReactFlowProvider,
    Background,
    Controls,
    useNodesState,
    useEdgesState,
    type NodeChange,
    type NodeMouseHandler,
    applyNodeChanges,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { SourceNode } from '@/components/nodes/SourceNode'
import {
    computeAnalyzedDisplay,
    type SourceGraphViewProps,
    type SourceNode as SourceNodeType,
    type SourceNodeType as SourceNodeRfType,
} from '@/bom/source-graph'

// ============================================================
// nodeTypes はコンポーネント外で定義（再レンダリング時の remount 防止）
// ============================================================

const NODE_TYPES = {
    sourceNode: SourceNode,
} as const

// ============================================================
// SourceGraphViewInner — ReactFlowProvider の内側
// ============================================================

function SourceGraphViewInner({
    nodes: nodesProp,
    edges: edgesProp,
    staleFiles,
    selectedFilePath,
    onNodeSelect,
    onReanalyze,
    onNodesChange: onNodesChangeProp,
}: SourceGraphViewProps) {
    const onReanalyzeRef = useRef(onReanalyze)
    useEffect(() => { onReanalyzeRef.current = onReanalyze }, [onReanalyze])

    const enrichedNodes = useMemo((): SourceNodeRfType[] => {
        return nodesProp.map((node) => {
            const displayStatus = computeAnalyzedDisplay(
                node.data.analyzed,
                node.data.filePath,
                staleFiles,
            )
            return {
                ...node,
                selected: node.data.filePath
                    ? node.data.filePath === selectedFilePath
                    : false,
                data: {
                    ...node.data,
                    displayStatus,
                    onReanalyze: (filePath: string) => onReanalyzeRef.current?.(filePath),
                },
            } as SourceNodeRfType
        })
    }, [nodesProp, staleFiles, selectedFilePath])

    const [nodes, setNodes, onNodesChangeInternal] = useNodesState<SourceNodeRfType>(enrichedNodes)
    const [edges, , onEdgesChange] = useEdgesState(edgesProp)

    useEffect(() => {
        setNodes(enrichedNodes)
    }, [enrichedNodes, setNodes])

    const onNodesChangePropRef = useRef(onNodesChangeProp)
    useEffect(() => { onNodesChangePropRef.current = onNodesChangeProp }, [onNodesChangeProp])

    const handleNodesChange = useCallback(
        (changes: NodeChange<SourceNodeRfType>[]) => {
            onNodesChangeInternal(changes)

            const hasDragEnd = changes.some(
                (c) => c.type === 'position' && c.dragging === false,
            )
            if (hasDragEnd && onNodesChangePropRef.current) {
                setNodes((prev) => {
                    const next = applyNodeChanges(changes, prev)
                    const plain = next.map((n) => {
                        const { displayStatus: _d, onReanalyze: _r, ...rest } = n.data
                        return { ...n, data: rest } as SourceNodeType
                    })
                    onNodesChangePropRef.current?.(plain)
                    return next
                })
            }
        },
        [onNodesChangeInternal, setNodes],
    )

    const onNodeSelectRef = useRef(onNodeSelect)
    useEffect(() => { onNodeSelectRef.current = onNodeSelect }, [onNodeSelect])

    const handleNodeClick: NodeMouseHandler<SourceNodeRfType> = useCallback((_event, node) => {
        const filePath = node.data.filePath
        if (filePath) onNodeSelectRef.current?.(filePath)
    }, [])

    const isEmpty = nodesProp.length === 0

    return (
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            {isEmpty && (
                <div
                    data-testid="source-graph-empty"
                    style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        pointerEvents: 'none',
                        opacity: 0.3,
                        zIndex: 1,
                    }}
                >
                    <span style={{ fontSize: 13, fontFamily: 'var(--font-mono, monospace)' }}>
                        ファイルをクリックして解析を開始してください
                    </span>
                </div>
            )}

            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={handleNodesChange}
                onEdgesChange={onEdgesChange}
                onNodeClick={handleNodeClick}
                nodeTypes={NODE_TYPES}
                fitView
                fitViewOptions={{ padding: 0.2 }}
                deleteKeyCode={null}
            >
                <Background />
                <Controls />
            </ReactFlow>
        </div>
    )
}

// ============================================================
// SourceGraphView — ReactFlowProvider でラップして export
// ============================================================

export function SourceGraphView(props: SourceGraphViewProps) {
    return (
        <ReactFlowProvider>
            <SourceGraphViewInner {...props} />
        </ReactFlowProvider>
    )
}