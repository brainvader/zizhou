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
 * [CTX-13] CatalogMenu:
 *   - onPaneContextMenu をキャンバス右クリック時に呼ぶ
 *
 * [CTX-22b] Test as a Context (TaaC):
 *   - onGetRelatedNodes が渡されている場合は TaaC モードで動作する
 *   - selectedFilePath がテストファイル（isTestFile）のとき onGetRelatedNodes を呼ぶ
 *   - 取得した RelatedNodes を computeTaaCLayout で左中右に自動配置してグラフ表示する
 *   - テストファイル未選択時は taac-empty-state を表示する
 *   - テストファイル以外が selectedFilePath に渡されても onGetRelatedNodes は呼ばない
 *
 * 無限ループ回避:
 *   - useNodesState / useEdgesState を使わない（controlled mode）
 *   - staleFiles / contexts は useStableValue で内容比較により参照を安定させる
 *   - onReanalyze / onRunTest は useCallbackRef で安定した参照にする
 *
 * @context CTX-21, CTX-22, CTX-13, CTX-22b
 * @bom docs/bom/source-graph.ts
 * @bom docs/bom/source-context.ts
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
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
    type SourceGraphViewProps,
    type SourceNode as SourceNodeType,
    type SourceNodeType as SourceNodeRfType,
    type SourceContextContainerNode,
    type TestNodeType,
    type RelatedNodes,
    isTestFile,
    computeTaaCLayout,
} from '@/bom/source-graph'
import { useCallbackRef } from '@/hooks/useCallbackRef'
import { useStableValue } from '@/hooks/useStableValue'
import { isSameSet, isSameContexts } from '@/lib/compare'
import { buildContainerRects, enrichNode } from '@/lib/sourceGraphUtils'

// ============================================================
// nodeTypes はコンポーネント外で定義（再レンダリング時の remount 防止）
// ============================================================

const NODE_TYPES = {
    sourceNode: SourceNode,
    testNode: TestNode,
    contextContainer: SourceContextContainer,
} as const

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
    onPaneContextMenu,
    onGetRelatedNodes,
}: SourceGraphViewProps) {
    // ============================================================
    // コールバック安定化
    // ============================================================

    const stableOnReanalyze = useCallbackRef(onReanalyze)
    const stableOnNodeSelect = useCallbackRef(onNodeSelect)
    const stableOnNodesChangeProp = useCallbackRef(onNodesChangeProp)
    const stableOnRunTest = useCallbackRef(onRunTest)
    const stableOnPaneContextMenu = useCallbackRef(onPaneContextMenu)

    // ============================================================
    // staleFiles / contexts を内容比較で参照安定化
    // ============================================================

    const stableStaleFiles = useStableValue(staleFiles, isSameSet)
    const stableContexts = useStableValue(contexts, isSameContexts)

    // ============================================================
    // [CTX-22b] TaaC モード: RelatedNodes オンデマンド取得
    // ============================================================

    const isTaaCMode = onGetRelatedNodes != null

    const [relatedNodes, setRelatedNodes] = useState<RelatedNodes | null>(null)

    useEffect(() => {
        setRelatedNodes(null)
    }, [selectedFilePath])

    useEffect(() => {
        if (!onGetRelatedNodes) return
        if (!selectedFilePath || !isTestFile(selectedFilePath)) return

        let cancelled = false
        Promise.resolve(onGetRelatedNodes('', selectedFilePath)).then((data) => {
            if (!cancelled && data) setRelatedNodes(data)
        }).catch(() => { })

        return () => { cancelled = true }
    }, [onGetRelatedNodes, selectedFilePath])

    // ============================================================
    // [CTX-22] コンテナノード生成
    // ============================================================

    const containerRects = useMemo(
        () => buildContainerRects(stableContexts, nodesProp),
        [stableContexts, nodesProp],
    )

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
    // ============================================================

    const enrichedNodes = useMemo(
        (): (SourceNodeRfType | TestNodeType)[] =>
            nodesProp.map((node) =>
                enrichNode(node, {
                    staleFiles: stableStaleFiles,
                    selectedFilePath,
                    contexts: stableContexts,
                    containerRects,
                    onReanalyze: stableOnReanalyze,
                    onRunTest: stableOnRunTest,
                }),
            ),
        [nodesProp, stableStaleFiles, selectedFilePath, stableContexts, containerRects, stableOnReanalyze, stableOnRunTest],
    )

    const baseNodes = useMemo(
        (): AllNodeType[] => [...containerNodes, ...enrichedNodes],
        [containerNodes, enrichedNodes],
    )

    // ============================================================
    // [CTX-22b] TaaC モード: RelatedNodes → ReactFlow ノード変換
    // ============================================================

    const taaCNodes = useMemo((): (SourceNodeRfType | TestNodeType)[] => {
        if (!isTaaCMode || !relatedNodes) return []
        const positions = computeTaaCLayout(relatedNodes)
        const allNodes = [
            relatedNodes.center,
            ...relatedNodes.dependencies,
            ...relatedNodes.dependents,
        ]
        return allNodes.map((node) => {
            const key = node.data.filePath ?? node.id
            const pos = positions.get(key) ?? node.position
            return enrichNode({ ...node, position: pos }, {
                staleFiles: stableStaleFiles,
                selectedFilePath,
                contexts: stableContexts,
                containerRects,
                onReanalyze: stableOnReanalyze,
                onRunTest: stableOnRunTest,
            })
        })
    }, [isTaaCMode, relatedNodes, stableStaleFiles, selectedFilePath, stableContexts, containerRects, stableOnReanalyze, stableOnRunTest])

    const activeNodes = useMemo(
        (): AllNodeType[] => isTaaCMode ? taaCNodes : baseNodes,
        [isTaaCMode, taaCNodes, baseNodes],
    )

    // TaaC モード: テストファイル未選択 or 非テストファイル → 空
    const isTaaCEmpty = isTaaCMode && (!selectedFilePath || !isTestFile(selectedFilePath))
    const isEmpty = isTaaCEmpty || (!isTaaCMode && nodesProp.length === 0)

    // ============================================================
    // ドラッグ位置管理（controlled mode）
    // ============================================================

    const [localNodes, setLocalNodes] = useState<AllNodeType[]>(activeNodes)

    useEffect(() => {
        setLocalNodes(activeNodes)
    }, [activeNodes])

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
                            const { onRunTest: _t, ...cleanRest } = rest as typeof rest & { onRunTest?: unknown }
                            return { ...n, data: cleanRest } as SourceNodeType
                        })
                    stableOnNodesChangeProp(plain)
                    return prev
                })
            }
        },
        [stableOnNodesChangeProp],
    )

    const handleNodeClick: NodeMouseHandler<AllNodeType> = useCallback(
        (_event, node) => {
            if (node.type !== 'sourceNode' && node.type !== 'testNode') return
            const filePath = (node as SourceNodeRfType | TestNodeType).data.filePath
            if (filePath) stableOnNodeSelect(filePath)
        },
        [stableOnNodeSelect],
    )

    return (
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            {isEmpty && (
                <div
                    data-testid={isTaaCMode ? 'taac-empty-state' : 'source-graph-empty'}
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
                        {isTaaCMode
                            ? 'テストファイルを選択してください'
                            : 'ファイルをクリックして解析を開始してください'}
                    </span>
                </div>
            )}

            <ReactFlow
                nodes={localNodes}
                edges={edgesProp}
                onNodesChange={handleNodesChange}
                onNodeClick={handleNodeClick}
                onPaneContextMenu={(e) => e instanceof MouseEvent ? undefined : stableOnPaneContextMenu(e)}
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