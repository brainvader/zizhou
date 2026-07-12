/**
 * Pipeline用 React Flow の nodeTypes マッピング SSOT。
 * コンポーネント外（モジュールスコープ）で定義する。
 * 内部（コンポーネント関数内）で定義すると再レンダー毎にオブジェクトが
 * 再生成され、React Flow 側で警告・パフォーマンス劣化を引き起こす既知の制約
 * （src/bom/graph-node-types.ts と同じ理由）。
 *
 * @see src/bom/context-pipeline.ts (PipelineFlowNode)
 */
import type { NodeTypes } from '@xyflow/react'
import { PipelineStageNode } from '@/components/PipelineStageNode'

export const PIPELINE_NODE_TYPES: NodeTypes = {
    stage: PipelineStageNode,
}