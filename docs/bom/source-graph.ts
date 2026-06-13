/**
 * docs/bom/source-graph.ts
 *
 * @context CTX-21: Source Graph
 * @context CTX-22: contexts prop 追加（Subflow Display）
 * @context CTX-22: TestNode 型追加（テストファイルノード）
 *
 * プロジェクトのファイル間依存関係グラフ（source graph）に関する型契約。
 * Rust 側の get_structure_graph / analyze_file / analyze_project / get_changed_files
 * との対応を定義する。
 *
 * このファイルはグラフ全体・エッジ・ビュー Props の型を定義するとともに、
 * 関連 BOM ファイルの re-export 窓口を担う。
 *
 * 直接定義:
 *   SourceEdge / SourceEdgeKind     — エッジ型
 *   SourceGraph                     — グラフデータ型
 *   SourceContextContainerData /
 *   SourceContextContainerNode /
 *   SourceContextContainerProps     — Subflow コンテナノード型
 *   SourceGraphViewProps            — SourceGraphView コンポーネント Props
 *   GetSourceGraphFn                — Props DI 関数型
 *
 * re-export:
 *   source-node.ts     — SourceNodeData / SourceNode / SourceNodeDisplayData /
 *                        SourceNodeType / SourceNodeProps
 *   test-node.ts       — TestNodeData / TestNode / TestNodeDisplayData /
 *                        TestNodeType / TestNodeProps
 *   source-analysis.ts — AnalyzedDisplay / computeAnalyzedDisplay /
 *                        AnalyzeFileFn / AnalyzeProjectFn / GetChangedFilesFn
 */

import type { Node as RfNode, Edge as RfEdge, NodeProps } from '@xyflow/react'
import type { SourceContext } from '@/bom/source-context'
import type { SourceNodeData } from '@/bom/source-node'
import type { AnalyzedDisplay } from '@/bom/source-analysis'

// re-export
export type { AnalyzedDisplay } from '@/bom/source-analysis'
export { computeAnalyzedDisplay } from '@/bom/source-analysis'
export type { AnalyzeFileFn, AnalyzeProjectFn, GetChangedFilesFn } from '@/bom/source-analysis'
export type {
    SourceNodeData,
    SourceNode,
    SourceNodeDisplayData,
    SourceNodeType,
    SourceNodeProps,
} from '@/bom/source-node'
export type {
    TestNodeData,
    TestNode,
    TestNodeDisplayData,
    TestNodeType,
    TestNodeProps,
} from '@/bom/test-node'

// ============================================================
// SourceEdge
// ============================================================

export type SourceEdgeKind = 'imports' | 'renders' | 'tested-by'

export type SourceEdge = RfEdge & {
    kind?: SourceEdgeKind
}

// ============================================================
// SourceGraph
// ============================================================

/**
 * get_structure_graph の戻り値に対応するフロント型。
 * テストノードも同じグラフに含まれる（nodeType で区別）。
 */
export type SourceGraph = {
    id: string
    nodes: RfNode<SourceNodeData, string>[]
    edges: SourceEdge[]
}

// ============================================================
// SourceContextContainer コンポーネント用型    [CTX-22]
// ============================================================

export type SourceContextContainerData = {
    label: string
    contextId: string
}

export type SourceContextContainerNode = RfNode<SourceContextContainerData, 'contextContainer'>
export type SourceContextContainerProps = NodeProps<SourceContextContainerNode>

// ============================================================
// SourceGraphView コンポーネント Props         [CTX-21 / CTX-22]
// ============================================================

export type SourceGraphViewProps = {
    /**
     * Rust get_structure_graph の戻り値をそのまま渡す。
     * SourceNode / TestNode 両方を含む。
     * SourceGraphView 内部で nodeType により振り分ける。
     */
    nodes: RfNode<SourceNodeData, string>[]
    edges: SourceEdge[]
    staleFiles: ReadonlySet<string>
    selectedFilePath?: string | null
    onNodeSelect?: (filePath: string) => void
    onReanalyze?: (filePath: string) => void
    onNodesChange?: (nodes: RfNode<SourceNodeData, string>[]) => void
    /** [CTX-22] Subflow 表示対象の SourceContext 一覧。省略時は Subflow なし。 */
    contexts?: SourceContext[]
    /**
     * [CTX-22] ▶ ボタン押下時コールバック。
     * CTX-23 実装前は省略可（ボタン非表示）。
     */
    onRunTest?: (filePath: string) => void
    /**
     * [CTX-13] キャンバス右クリック時コールバック。CatalogMenu の表示に使用する。
     */
    onPaneContextMenu?: (event: React.MouseEvent) => void
}

// ============================================================
// Props DI 関数型
// ============================================================

export type GetSourceGraphFn = (projectId: string) => Promise<SourceGraph>