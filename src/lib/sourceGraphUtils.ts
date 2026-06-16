import type { Node as RfNode } from '@xyflow/react'
import {
    computeAnalyzedDisplay,
    type SourceNodeData,
    type SourceNodeType as SourceNodeRfType,
    type TestNodeType,
} from '@/bom/source-graph'

export type EnrichNodeOptions = {
    staleFiles: ReadonlySet<string>
    selectedFilePath?: string | null
    onReanalyze: (filePath: string) => void
    onRunTest?: (filePath: string) => void
}

/**
 * enrichNode
 *
 * 1ノードを SourceNodeRfType または TestNodeType に変換する。
 * displayStatus の算出・selected 状態の設定を行う。
 *
 * @param node    変換元ノード
 * @param options 変換に必要なコンテキスト
 * @returns       SourceNodeRfType | TestNodeType
 */
export function enrichNode(
    node: RfNode<SourceNodeData, string>,
    options: EnrichNodeOptions,
): SourceNodeRfType | TestNodeType {
    const { staleFiles, selectedFilePath, onReanalyze, onRunTest } = options

    const displayStatus = computeAnalyzedDisplay(
        node.data.analyzed,
        node.data.filePath,
        staleFiles,
    )

    const common = {
        ...node,
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