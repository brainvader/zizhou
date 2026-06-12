/**
 * docs/bom/source-graph.ts
 *
 * @context CTX-21: Source Graph
 * @context CTX-22: contexts prop 追加（Subflow Display）
 *
 * プロジェクトのファイル間依存関係グラフ（source graph）に関する型契約。
 * Rust 側の get_structure_graph / analyze_file / analyze_project / get_changed_files
 * との対応を定義する。
 *
 * 命名規則:
 *   SourceGraph             — グラフデータ型（Rust get_structure_graph の戻り値に対応）
 *   SourceNode              — ReactFlow Node 型
 *   SourceNodeData          — ReactFlow Node.data 型
 *   SourceNodeDisplayData   — 描画用 Node.data 型（displayStatus / onReanalyze を追加）
 *   SourceEdge              — ReactFlow Edge 型
 *   SourceContextContainer  — Subflow コンテナノードコンポーネント（src/components/nodes/SourceContextContainer.tsx）
 *   SourceGraphView         — グラフ描画コンポーネント（src/components/SourceGraphView.tsx）
 *   SourceNode (comp)       — ノード描画コンポーネント（src/components/nodes/SourceNode.tsx）
 */

import type { Node as RfNode, Edge as RfEdge, NodeProps } from '@xyflow/react'
import type { SourceContext } from '@/bom/source-context'

// ============================================================
// データモデル
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

/**
 * source グラフのエッジ。
 */
export type SourceEdgeKind = 'imports' | 'renders'

export type SourceEdge = RfEdge & {
    kind?: SourceEdgeKind
}

/**
 * get_structure_graph の戻り値に対応するフロント型。
 */
export type SourceGraph = {
    id: string
    nodes: SourceNode[]
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
    /** 描画用ステータス */
    displayStatus: AnalyzedDisplay
    /** ↺ボタン押下時コールバック */
    onReanalyze?: (filePath: string) => void
}

export type SourceNodeType = RfNode<SourceNodeDisplayData, 'sourceNode'>

export type SourceNodeProps = NodeProps<SourceNodeType>

// ============================================================
// SourceContextContainer コンポーネント用型    [CTX-22]
// ============================================================

/**
 * Subflow コンテナノードの data 型。
 * SourceGraphView が SourceContext から生成して渡す。
 */
export type SourceContextContainerData = {
    /** SourceContext の表示名 */
    label: string
    /** 対応する SourceContext の ID */
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
     * type フィールドが 'sourceNode' 以外（undefined 含む）でも受け入れるため
     * RfNode<SourceNodeData>[] に緩めている。
     * SourceGraphView 内部で 'sourceNode' として扱う。
     */
    nodes: RfNode<SourceNodeData>[]
    edges: SourceEdge[]
    /** stale 判定に使う変更ファイル集合 */
    staleFiles: ReadonlySet<string>
    /** File→Node 方向のハイライト対象（FileTree 選択中ファイル） */
    selectedFilePath?: string | null
    /** Node→File 方向: ノードクリック時に filePath を通知 */
    onNodeSelect?: (filePath: string) => void
    /** ↺ボタン押下: filePath を通知（projects.$id.tsx の handleReanalyzeSelected に接続） */
    onReanalyze?: (filePath: string) => void
    /** ノード位置変更時: 永続化のため親に通知（save_graph 呼び出しに使う） */
    onNodesChange?: (nodes: RfNode<SourceNodeData>[]) => void
    /** [CTX-22] Subflow 表示対象の SourceContext 一覧。省略時は Subflow なし。 */
    contexts?: SourceContext[]
}

// ============================================================
// Props DI 関数型
// ============================================================

/** Tauri invoke('get_structure_graph') ラッパー */
export type GetSourceGraphFn = (projectId: string) => Promise<SourceGraph>

/** Tauri invoke('analyze_file') ラッパー */
export type AnalyzeFileFn = (projectId: string, filePath: string) => Promise<void>

/** Tauri invoke('analyze_project') ラッパー */
export type AnalyzeProjectFn = (projectId: string) => Promise<void>

/** Tauri invoke('get_changed_files') ラッパー */
export type GetChangedFilesFn = (rootPath: string) => Promise<string[]>