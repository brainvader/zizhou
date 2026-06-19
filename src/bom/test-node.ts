/**
 * docs/bom/test-node.ts
 *
 * @context CTX-22: Source Graph — TestNode
 *
 * テストファイルノードに関する型契約。
 * SourceGraphView で使用する ReactFlow カスタムノード（testNode）の
 * データモデルおよびコンポーネント用型を定義する。
 *
 * 命名規則:
 *   TestNodeData        — ReactFlow Node.data 型（SourceNodeData を継承）
 *   TestNode            — ReactFlow Node 型
 *   TestNodeDisplayData — 描画用 Node.data 型（displayStatus / onReanalyze / onRunTest を追加）
 *   TestNodeType        — 描画用 ReactFlow Node 型
 *   TestNodeProps       — カスタムノードコンポーネントの Props 型
 */

import type { Node as RfNode, NodeProps } from '@xyflow/react'
import type { SourceNodeData } from '@/bom/source-node'
import type { AnalyzedDisplay } from '@/bom/source-analysis'

// ============================================================
// TestNode データモデル
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
// TestNode コンポーネント用型
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