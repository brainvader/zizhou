/**
 * docs/bom/source-graph.ts
 *
 * @context CTX-21: Source Graph
 * @context CTX-22: TestNode 型追加（テストファイルノード）
 * @context CTX-22b: TaaC 型追加（Test as a Context）
 *
 * プロジェクトのファイル間依存関係グラフ（source graph）に関する型契約。
 * Rust 側の get_structure_graph / analyze_file / analyze_project / get_changed_files /
 * get_related_nodes との対応を定義する。
 *
 * このファイルはグラフ全体・エッジ・ビュー Props の型を定義するとともに、
 * 関連 BOM ファイルの re-export 窓口を担う。
 *
 * 直接定義:
 *   SourceEdge / SourceEdgeKind         — エッジ型
 *   SourceGraph                         — グラフデータ型
 *   SourceGraphViewProps                — SourceGraphView コンポーネント Props
 *   GetSourceGraphFn                    — Props DI 関数型
 *   RelatedNodes                        — get_related_nodes 戻り値型 [CTX-22]
 *   GetRelatedNodesFn                   — Props DI 関数型 [CTX-22]
 *   TaaCLayoutParams / DEFAULT_TAAC_LAYOUT — レイアウト定数 [CTX-22]
 *   isTestFile                          — テストファイル判定ユーティリティ [CTX-22]
 *   computeTaaCLayout                   — TaaC 自動レイアウト計算 [CTX-22]
 *
 * re-export:
 *   source-node.ts     — SourceNodeData / SourceNode / SourceNodeDisplayData /
 *                        SourceNodeType / SourceNodeProps
 *   test-node.ts       — TestNodeData / TestNode / TestNodeDisplayData /
 *                        TestNodeType / TestNodeProps
 *   source-analysis.ts — AnalyzedDisplay / computeAnalyzedDisplay /
 *                        AnalyzeFileFn / AnalyzeProjectFn / GetChangedFilesFn
 */

import type { Node as RfNode, Edge as RfEdge, XYPosition } from '@xyflow/react'
import type { SourceNodeData } from '@/bom/source-node'

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
    /**
     * [CTX-13] キャンバス右クリック時コールバック。CatalogMenu の表示に使用する。
     */
    onPaneContextMenu?: (event: React.MouseEvent) => void
    /**
     * [CTX-22] テストファイル選択時に依存関係を取得するコールバック。
     */
    onGetRelatedNodes?: GetRelatedNodesFn
}

// ============================================================
// Props DI 関数型
// ============================================================

export type GetSourceGraphFn = (projectId: string) => Promise<SourceGraph>

// ============================================================
// RelatedNodes                                       [CTX-22]
// get_related_nodes Tauri コマンドの戻り値型。
//
// center:       選択テストファイル自身のノード（中央に配置）
// dependencies: center が import しているノード（左側に配置）
// dependents:   center を import しているノード（右側に配置）
//
// node_modules 配下のノードは Rust 側で除外済み。
// SourceGraph.nodes と同じ RfNode<SourceNodeData, string> で統一し、
// Rust コマンド戻り値の変換処理を共通化する。
// ============================================================

export type RelatedNodes = {
    center: RfNode<SourceNodeData, string>
    dependencies: RfNode<SourceNodeData, string>[]
    dependents: RfNode<SourceNodeData, string>[]
}

/**
 * get_related_nodes の Props DI 関数型。
 * Storybook / テスト時はモック実装を渡す。
 *
 * @param projectId - プロジェクト ID
 * @param filePath  - 選択されたテストファイルの rootPath 相対パス
 * @returns 中央ノード・依存先・利用先を含む RelatedNodes
 */
export type GetRelatedNodesFn = (
    projectId: string,
    filePath: string,
) => Promise<RelatedNodes>

// ============================================================
// TaaCLayoutParams                                   [CTX-22]
// TaaC 自動レイアウトのパラメータ。
// 依存先(左) → 選択ノード(中央) → 利用先(右) の配置を制御する。
// ============================================================

export type TaaCLayoutParams = {
    /** 中央ノードの X 座標 */
    centerX: number
    /** 中央ノードの Y 座標 */
    centerY: number
    /** 依存先・利用先グループと中央ノードの水平距離 */
    horizontalGap: number
    /** 同グループ内ノードの垂直間隔 */
    verticalSpacing: number
}

/** デフォルトレイアウトパラメータ */
export const DEFAULT_TAAC_LAYOUT: TaaCLayoutParams = {
    centerX: 600,
    centerY: 300,
    horizontalGap: 350,
    verticalSpacing: 120,
}

// ============================================================
// isTestFile                                         [CTX-22]
// ============================================================

/**
 * ファイルパスがテストファイルかどうかを判定する。
 *
 * TaaC では *.test.ts / *.test.tsx / *.spec.ts / *.spec.tsx のみが
 * SourceGraph 選択対象になる。node_modules の除外は Rust 側が担う。
 *
 * @param filePath - 判定対象のファイルパス
 * @returns テストファイルであれば true
 */
export function isTestFile(filePath: string): boolean {
    return /\.(test|spec)\.(ts|tsx)$/.test(filePath)
}

// ============================================================
// computeTaaCLayout                                  [CTX-22]
// ============================================================

/**
 * RelatedNodes から各ノードの XY 座標を計算する。
 *
 * - center:       (centerX, centerY)
 * - dependencies: 中央の左側に verticalSpacing で縦に並べる（上下均等）
 * - dependents:   中央の右側に verticalSpacing で縦に並べる（上下均等）
 *
 * filePath が undefined のノードは node.id をキーとして使用する。
 *
 * @param related - get_related_nodes の戻り値
 * @param params  - レイアウトパラメータ（省略時は DEFAULT_TAAC_LAYOUT）
 * @returns filePath（または node.id） → XYPosition のマップ
 */
export function computeTaaCLayout(
    related: RelatedNodes,
    params: TaaCLayoutParams = DEFAULT_TAAC_LAYOUT,
): Map<string, XYPosition> {
    const { centerX, centerY, horizontalGap, verticalSpacing } = params
    const positions = new Map<string, XYPosition>()

    // center
    const centerKey = related.center.data.filePath ?? related.center.id
    positions.set(centerKey, { x: centerX, y: centerY })

    // dependencies（左側）
    const depCount = related.dependencies.length
    related.dependencies.forEach((node, i) => {
        const totalHeight = (depCount - 1) * verticalSpacing
        const y = centerY - totalHeight / 2 + i * verticalSpacing
        const key = node.data.filePath ?? node.id
        positions.set(key, { x: centerX - horizontalGap, y })
    })

    // dependents（右側）
    const dntCount = related.dependents.length
    related.dependents.forEach((node, i) => {
        const totalHeight = (dntCount - 1) * verticalSpacing
        const y = centerY - totalHeight / 2 + i * verticalSpacing
        const key = node.data.filePath ?? node.id
        positions.set(key, { x: centerX + horizontalGap, y })
    })

    return positions
}