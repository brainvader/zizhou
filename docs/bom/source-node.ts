/**
 * docs/bom/source-node.ts
 *
 * @context CTX-21: Source Graph
 *
 * ソースファイルノードに関する型契約。
 * SourceGraphView で使用する ReactFlow カスタムノード（sourceNode）の
 * データモデルおよびコンポーネント用型を定義する。
 *
 * 命名規則:
 *   SourceNodeData        — ReactFlow Node.data 型（DB から取得した生データ）
 *   SourceNode            — ReactFlow Node 型
 *   SourceNodeDisplayData — 描画用 Node.data 型（displayStatus / onReanalyze を追加）
 *   SourceNodeType        — 描画用 ReactFlow Node 型
 *   SourceNodeProps       — カスタムノードコンポーネントの Props 型
 */

import type { Node as RfNode, NodeProps } from '@xyflow/react'
import type { AnalyzedDisplay } from '@/bom/source-analysis'

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