/**
 * SourceGraphView
 *
 * プロジェクトのファイル間依存関係グラフを ReactFlow で描画するコンポーネント。
 *
 * [CTX-21] 責務:
 *   - SourceNode カスタムノードで各ファイルを表示する
 *   - staleFiles に基づき computeAnalyzedDisplay で displayStatus を算出してノードに注入
 *   - selectedFilePath に一致するノードを selected=true にする（File→Node 同期）
 *   - ノードクリック時に onNodeSelect(filePath) を呼ぶ（Node→File 同期）
 *   - ↺ボタン押下時に onReanalyze(filePath) を呼ぶ
 *   - ノード位置変更時に onNodesChange(nodes) を呼ぶ（Position Persist）
 *
 * [CTX-22] Subflow Display:
 *   - contexts prop を受け取り SourceContext ごとにコンテナノードを生成する
 *   - computeContainerRect でコンテナの位置・サイズを算出する
 *   - toRelativePosition で子ノードの座標を親相対に変換する
 *
 * [CTX-22] TestNode:
 *   - nodeType === 'test' のノードを TestNode コンポーネントで描画する
 *   - onRunTest を TestNodeDisplayData に注入する（CTX-23 で接続）
 *
 * 無限ループ回避:
 *   - useNodesState / useEdgesState を使わない（controlled mode）
 *   - staleFiles / contexts は内容比較で参照を安定させる
 *   - onReanalyze / onRunTest は useCallback + useRef で安定した参照にする
 *
 * @context CTX-21, CTX-22
 * @bom docs/bom/source-graph.ts
 * @bom docs/bom/source-context.ts
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
    ReactFlow,
    ReactFlowProvider,
    Background,
    Controls,
    applyNodeChanges,
    type NodeChange,
    type NodeMouseHandler,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { SourceNode } from '@/components/nodes/SourceNode'
import { TestNode } from '@/components/nodes/TestNode'
import { SourceContextContainer } from '@/components/nodes/SourceContextContainer'
import {
    computeAnalyzedDisplay,
    type SourceGraphViewProps,
    type SourceNode as SourceNodeType,
    type SourceNodeType as SourceNodeRfType,
    type TestNodeType,
    type SourceContextContainerNode,
} from '@/bom/source-graph'
import {
    computeContainerRect,
    toRelativePosition,
    type SourceContext,
} from '@/bom/source-context'

// ============================================================
// nodeTypes はコンポーネント外で定義（再レンダリング時の remount 防止）
// ============================================================

const NODE_TYPES = {
    sourceNode: SourceNode,
    testNode: TestNode,
    contextContainer: SourceContextContainer,
} as const

// ============================================================
// 内容比較ユーティリティ
// ============================================================

function isSameSet(a: ReadonlySet<string>, b: ReadonlySet<string>): boolean {
    if (a.size !== b.size) return false
    for (const item of a) {
        if (!b.has(item)) return false
    }
    return true
}

function isSameContexts(a: SourceContext[], b: SourceContext[]): boolean {
    if (a.length !== b.length) return false
    return a.every((ca, i) => {
        const cb = b[i]
        return (
            ca.id === cb.id &&
            ca.name === cb.name &&
            ca.nodeIds.length === cb.nodeIds.length &&
            ca.nodeIds.every((id, j) => id === cb.nodeIds[j])
        )
    })
}

// ============================================================
// AllNodeType — ReactFlow に渡すノードの Union 型
// ============================================================

type AllNodeType = SourceNodeRfType | TestNodeType | SourceContextContainerNode

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
    contexts = [],
    onRunTest,
}: SourceGraphViewProps) {
    // ============================================================
    // コールバックを ref 経由で安定化
    // ============================================================

    const onReanalyzeRef = useRef(onReanalyze)
    useEffect(() => { onReanalyzeRef.current = onReanalyze }, [onReanalyze])

    const onNodeSelectRef = useRef(onNodeSelect)
    useEffect(() => { onNodeSelectRef.current = onNodeSelect }, [onNodeSelect])

    const onNodesChangePropRef = useRef(onNodesChangeProp)
    useEffect(() => { onNodesChangePropRef.current = onNodesChangeProp }, [onNodesChangeProp])

    const onRunTestRef = useRef(onRunTest)
    useEffect(() => { onRunTestRef.current = onRunTest }, [onRunTest])

    const stableOnReanalyze = useCallback(
        (filePath: string) => onReanalyzeRef.current?.(filePath),
        [],
    )

    const stableOnRunTest = useCallback(
        (filePath: string) => onRunTestRef.current?.(filePath),
        [],
    )

    // ============================================================
    // staleFiles / contexts を内容比較で参照安定化
    // ============================================================

    const staleFilesRef = useRef(staleFiles)
    const stableStaleFiles = useMemo(() => {
        if (isSameSet(staleFilesRef.current, staleFiles)) return staleFilesRef.current
        staleFilesRef.current = staleFiles
        return staleFiles
    }, [staleFiles])

    const contextsRef = useRef(contexts)
    const stableContexts = useMemo(() => {
        if (isSameContexts(contextsRef.current, contexts)) return contextsRef.current
        contextsRef.current = contexts
        return contexts
    }, [contexts])

    // ============================================================
    // [CTX-22] コンテナノード生成
    // ============================================================

    const containerRects = useMemo(() => {
        const map = new Map<string, { x: number; y: number; width: number; height: number }>()
        for (const ctx of stableContexts) {
            const rect = computeContainerRect(ctx.nodeIds, nodesProp)
            if (rect) map.set(ctx.id, rect)
        }
        return map
    }, [stableContexts, nodesProp])

    const containerNodes = useMemo((): SourceContextContainerNode[] => {
        return stableContexts.flatMap((ctx) => {
            const rect = containerRects.get(ctx.id)
            if (!rect) return []
            return [{
                id: `context-container-${ctx.id}`,
                type: 'contextContainer' as const,
                position: { x: rect.x, y: rect.y },
                style: { width: rect.width, height: rect.height },
                data: { label: ctx.name, contextId: ctx.id },
                selectable: false,
                draggable: false,
                deletable: false,
                zIndex: -1,
            }]
        })
    }, [stableContexts, containerRects])

    // ============================================================
    // enrichedNodes
    // nodeType === 'test' → TestNodeType、それ以外 → SourceNodeRfType
    // ============================================================

    const enrichedNodes = useMemo((): (SourceNodeRfType | TestNodeType)[] => {
        return nodesProp.map((node) => {
            const displayStatus = computeAnalyzedDisplay(
                node.data.analyzed,
                node.data.filePath,
                stableStaleFiles,
            )
            const ownerCtx = stableContexts.find((c) => c.nodeIds.includes(node.id))
            const containerRect = ownerCtx ? containerRects.get(ownerCtx.id) : undefined
            const position = containerRect
                ? toRelativePosition(node.position, containerRect)
                : node.position

            const isTest = node.data.nodeType === 'test'

            const common = {
                ...node,
                position,
                parentId: ownerCtx ? `context-container-${ownerCtx.id}` : undefined,
                extent: ownerCtx ? ('parent' as const) : undefined,
                selected: node.data.filePath
                    ? node.data.filePath === selectedFilePath
                    : false,
            }

            if (isTest) {
                return {
                    ...common,
                    type: 'testNode' as const,
                    data: {
                        ...node.data,
                        displayStatus,
                        onReanalyze: stableOnReanalyze,
                        onRunTest: onRunTestRef.current ? stableOnRunTest : undefined,
                    },
                } as TestNodeType
            }

            return {
                ...common,
                type: 'sourceNode' as const,
                data: {
                    ...node.data,
                    displayStatus,
                    onReanalyze: stableOnReanalyze,
                },
            } as SourceNodeRfType
        })
    }, [nodesProp, stableStaleFiles, selectedFilePath, stableContexts, containerRects, stableOnReanalyze, stableOnRunTest])

    const baseNodes = useMemo(
        (): AllNodeType[] => [...containerNodes, ...enrichedNodes],
        [containerNodes, enrichedNodes],
    )

    // ============================================================
    // ドラッグ位置管理（controlled mode）
    // ============================================================

    const [localNodes, setLocalNodes] = useState<AllNodeType[]>(baseNodes)

    useEffect(() => {
        setLocalNodes(baseNodes)
    }, [baseNodes])

    const handleNodesChange = useCallback(
        (changes: NodeChange<AllNodeType>[]) => {
            setLocalNodes((prev) => applyNodeChanges(changes, prev) as AllNodeType[])

            const hasDragEnd = changes.some(
                (c) => c.type === 'position' && c.dragging === false,
            )
            if (hasDragEnd) {
                setLocalNodes((prev) => {
                    const plain = prev
                        .filter((n) => n.type === 'sourceNode' || n.type === 'testNode')
                        .map((n) => {
                            const nodeData = (n as SourceNodeRfType | TestNodeType).data
                            const { displayStatus: _d, onReanalyze: _r, ...rest } = nodeData
                            // onRunTest は TestNodeDisplayData にのみ存在するため個別に除去
                            const { onRunTest: _t, ...cleanRest } = rest as typeof rest & { onRunTest?: unknown }
                            return { ...n, data: cleanRest } as SourceNodeType
                        })
                    onNodesChangePropRef.current?.(plain)
                    return prev
                })
            }
        },
        [],
    )

    const handleNodeClick: NodeMouseHandler<AllNodeType> = useCallback(
        (_event, node) => {
            if (node.type !== 'sourceNode' && node.type !== 'testNode') return
            const filePath = (node as SourceNodeRfType | TestNodeType).data.filePath
            if (filePath) onNodeSelectRef.current?.(filePath)
        },
        [],
    )

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
                nodes={localNodes}
                edges={edgesProp}
                onNodesChange={handleNodesChange}
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