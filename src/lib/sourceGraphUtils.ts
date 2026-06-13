import type { Node as RfNode } from '@xyflow/react'
import {
    computeAnalyzedDisplay,
    type SourceNodeData,
    type SourceNodeType as SourceNodeRfType,
    type TestNodeType,
} from '@/bom/source-graph'
import {
    computeContainerRect,
    toRelativePosition,
    type SourceContext,
} from '@/bom/source-context'

export type ContainerRects = Map<string, { x: number; y: number; width: number; height: number }>

/**
 * buildContainerRects
 *
 * contexts と nodesProp から各コンテナの矩形を算出する。
 *
 * @param contexts      SourceContext 一覧
 * @param nodes         SourceGraph のノード一覧
 * @returns             contextId → 矩形のマップ
 */
export function buildContainerRects(
    contexts: SourceContext[],
    nodes: RfNode<SourceNodeData, string>[],
): ContainerRects {
    const map: ContainerRects = new Map()
    for (const ctx of contexts) {
        const rect = computeContainerRect(ctx.nodeIds, nodes)
        if (rect) map.set(ctx.id, rect)
    }
    return map
}

export type EnrichNodeOptions = {
    staleFiles: ReadonlySet<string>
    selectedFilePath?: string | null
    contexts: SourceContext[]
    containerRects: ContainerRects
    onReanalyze: (filePath: string) => void
    onRunTest?: (filePath: string) => void
}

/**
 * enrichNode
 *
 * 1ノードを SourceNodeRfType または TestNodeType に変換する。
 * displayStatus の算出・parentId の設定・座標の相対化を行う。
 *
 * @param node    変換元ノード
 * @param options 変換に必要なコンテキスト
 * @returns       SourceNodeRfType | TestNodeType
 */
export function enrichNode(
    node: RfNode<SourceNodeData, string>,
    options: EnrichNodeOptions,
): SourceNodeRfType | TestNodeType {
    const { staleFiles, selectedFilePath, contexts, containerRects, onReanalyze, onRunTest } = options

    const displayStatus = computeAnalyzedDisplay(
        node.data.analyzed,
        node.data.filePath,
        staleFiles,
    )

    const ownerCtx = contexts.find((c) => c.nodeIds.includes(node.id))
    const containerRect = ownerCtx ? containerRects.get(ownerCtx.id) : undefined
    const position = containerRect
        ? toRelativePosition(node.position, containerRect)
        : node.position

    const common = {
        ...node,
        position,
        parentId: ownerCtx ? `context-container-${ownerCtx.id}` : undefined,
        extent: ownerCtx ? ('parent' as const) : undefined,
        selected: node.data.filePath
            ? node.data.filePath === selectedFilePath
            : false,
    }

    if (node.data.nodeType === 'test') {
        return {
            ...common,
            type: 'testNode' as const,
            data: {
                ...node.data,
                displayStatus,
                onReanalyze,
                onRunTest,
            },
        } as TestNodeType
    }

    return {
        ...common,
        type: 'sourceNode' as const,
        data: {
            ...node.data,
            displayStatus,
            onReanalyze,
        },
    } as SourceNodeRfType
}