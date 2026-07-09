/**
 * React Flow の nodeTypes マッピング SSOT。
 * コンポーネント外（モジュールスコープ）で定義する。
 * 内部（コンポーネント関数内）で定義すると再レンダー毎にオブジェクトが
 * 再生成され、React Flow 側で警告・パフォーマンス劣化を引き起こす既知の制約。
 *
 * @see src/bom/context-graph.ts (NodeKind)
 */
import type { NodeTypes } from '@xyflow/react'
import { ComponentNode } from '@/components/ComponentNode'
import { HookNode } from '@/components/HookNode'
import { ExternalNode } from '@/components/ExternalNode'
import { StateNode } from '@/components/StateNode'
import { FeatureNode } from '@/components/FeatureNode'

export const GRAPH_NODE_TYPES: NodeTypes = {
    component: ComponentNode,
    hook: HookNode,
    external: ExternalNode,
    state: StateNode,
    feature: FeatureNode,
}
