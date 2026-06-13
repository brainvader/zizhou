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
 * 命名規則:
 *   SourceGraph             — グラフデータ型（Rust get_structure_graph の戻り値に対応）
 *   SourceNode              — ReactFlow Node 型（通常ソースファイル）
 *   SourceNodeData          — ReactFlow Node.data 型
 *   SourceNodeDisplayData   — 描画用 Node.data 型（displayStatus / onReanalyze を追加）
 *   TestNode                — ReactFlow Node 型（テストファイル専用）
 *   TestNodeData            — テストノードの Node.data 型
 *   TestNodeDisplayData     — テストノード描画用 Node.data 型
 *   SourceEdge              — ReactFlow Edge 型
 *   SourceContextContainer  — Subflow コンテナノードコンポーネント
 *   SourceGraphView         — グラフ描画コンポーネント（src/components/SourceGraphView.tsx）
 *   SourceNode (comp)       — ノード描画コンポーネント（src/components/nodes/SourceNode.tsx）
 *   TestNode (comp)         — テストノード描画コンポーネント（src/components/nodes/TestNode.tsx）
 */

import type { Node as RfNode, Edge as RfEdge, NodeProps } from '@xyflow/react'
import type { SourceContext } from '@/bom/source-context'

// ============================================================
// SourceNode データモデル
// ============================================================

/**
 * source グラフのノードデータ。
 * ReactFlow Node.data に乗る。
 * data.filePath / data.analyzed は Rust 側で camelCase 化されて渡される。
 */
export type SourceNodeData = {
    label: string
    nodeType?: string
    /** rootPath 相対 / forward slash */
    filePath?: string
    /** DB 保存値: 'pending' | 'fresh'（'stale' はフロント描画時に動的判定） */
    analyzed?: 'pending' | 'fresh'
}

export type SourceNode = RfNode<SourceNodeData, 'sourceNode'>

// ============================================================
// TestNode データモデル                               [CTX-22]
// ============================================================

/**
 * テストファイルノードのデータ。
 * *.test.ts / *.spec.ts に対応するノード。
 * SourceNodeData を継承し、テスト固有のフィールドを追加する。
 */
export type TestNodeData = SourceNodeData & {
    /**
     * このテストファイルに含まれる describe（test_suite）の数。
     * analyze_tests 後に設定される。未解析時は undefined。
     */
    suiteCount?: number
}

export type TestNode = RfNode<TestNodeData, 'testNode'>

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
// Stale 判定
// ============================================================

/**
 * 描画時の表示用ステータス。
 * 'stale' は DB に保存されず、changedFiles ∩ node.filePath の結果から動的に算出する。
 */
export type AnalyzedDisplay = 'pending' | 'fresh' | 'stale'

/**
 * node.analyzed と changedFiles から表示用ステータスを決定する。
 *
 *   analyzed='fresh' かつ filePath ∈ changedFiles → 'stale'
 *   analyzed='fresh' かつ filePath ∉ changedFiles → 'fresh'
 *   analyzed='pending' / undefined                → 'pending'
 */
export const computeAnalyzedDisplay = (
    analyzed: SourceNodeData['analyzed'] | undefined,
    filePath: string | undefined,
    changedFiles: ReadonlySet<string>,
): AnalyzedDisplay => {
    if (analyzed === 'fresh') {
        return filePath && changedFiles.has(filePath) ? 'stale' : 'fresh'
    }
    return 'pending'
}

// ============================================================
// SourceNode コンポーネント用型                [CTX-21]
// ============================================================

/**
 * SourceNode カスタムノードの data 型。
 * SourceGraphView が computeAnalyzedDisplay で算出した displayStatus を注入して渡す。
 * onReanalyze も SourceGraphView から注入する（Props DI）。
 */
export type SourceNodeDisplayData = SourceNodeData & {
    displayStatus: AnalyzedDisplay
    onReanalyze?: (filePath: string) => void
}

export type SourceNodeType = RfNode<SourceNodeDisplayData, 'sourceNode'>
export type SourceNodeProps = NodeProps<SourceNodeType>

// ============================================================
// TestNode コンポーネント用型                  [CTX-22]
// ============================================================

/**
 * TestNode カスタムノードの data 型。
 * SourceGraphView が displayStatus / onReanalyze / onRunTest を注入して渡す。
 * onRunTest は CTX-23 で実装する TestRunner に接続する。
 */
export type TestNodeDisplayData = TestNodeData & {
    displayStatus: AnalyzedDisplay
    onReanalyze?: (filePath: string) => void
    /**
     * ▶ ボタン押下時コールバック。
     * CTX-23 実装前は undefined で ▶ ボタンを非表示にする。
     */
    onRunTest?: (filePath: string) => void
}

export type TestNodeType = RfNode<TestNodeDisplayData, 'testNode'>
export type TestNodeProps = NodeProps<TestNodeType>

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
}

// ============================================================
// Props DI 関数型
// ============================================================

export type GetSourceGraphFn = (projectId: string) => Promise<SourceGraph>
export type AnalyzeFileFn = (projectId: string, filePath: string) => Promise<void>
export type AnalyzeProjectFn = (projectId: string) => Promise<void>
export type GetChangedFilesFn = (rootPath: string) => Promise<string[]>