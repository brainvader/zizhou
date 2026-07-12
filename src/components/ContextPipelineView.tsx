import { useCallback, useEffect, useState } from 'react'
import { ReactFlow, Background, applyNodeChanges, useReactFlow, type NodeChange } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import {
    CONTEXT_PIPELINE_STAGES,
    labelForContextId,
    resolveActiveContextId,
    toPipelineFlow,
    type PipelineStage,
    type PipelineFlowNode,
} from '@/bom/context-pipeline'
import { reconcileNodes } from '@/bom/graph-editor'
import { PIPELINE_NODE_TYPES } from '@/bom/pipeline-node-types'
import type { ContextNodeId } from '@/bom/workspace'
import type { ContextGraphNode } from '@/bom/context-graph'
import { cn } from '@/lib/utils'

export type ContextPipelineViewProps = {
    visibleIds: readonly ContextNodeId[]
    stages?: readonly PipelineStage[]
    /**
     * Contextsサイドバーで選ばれたコンテキスト（＝ContextMap上の1ノード）。
     * 指定されているときは、4ステージパイプラインの Task Splitting ステージの
     * 中身（description/checklist）だけを、そのノードの describe/criteria
     * （ZTE抽出由来）に差し替える。Task Splittingは元々「Sonnetがdescribe/criteriaを
     * 契約として書き出す」段階として設計されているため、ここに実データを乗せるのが筋。
     * 他の3ステージ（Design/Execution/Failure Handling）は当面静的なまま。
     */
    selectedNode?: ContextGraphNode
}

/**
 * ContextPipelineView
 * コンテキストの作業パイプラインを React Flow で表示する（縦一列の初期配置）。
 * ドラッグでの移動は可能（nodesDraggable、既定でtrue）。ComponentGraphEditorと同じ
 * controlled mode を採用し、ドラッグ位置をローカル state で保持する
 * （ステージ集合が変わっていなければ reconcileNodes で state を維持し、
 * 毎レンダーの再構築でドラッグ位置が消えるのを防ぐ）。
 * 依存関係グラフ（ComponentGraphEditor）とは違い、自動レイアウト（dagre）は使わず
 * toPipelineFlow() の初期配置（縦一列、checklist量に応じた可変間隔）を使う。
 *
 * fitView（ReactFlowのbool prop）は初回マウント時にしか効かず、かつ親コンテナが
 * flex-1で高さが動的に決まる関係でマウント直後はまだレイアウトが確定していないことがある
 * （ComponentGraphEditorと同じ既知の制約）。ステージ集合（id列）が変わるたびに
 * FitViewOnChange が useReactFlow().fitView() を呼び直して中央寄せし直す
 * （rfNodes自体を依存にするとドラッグのたびに再フィットしてしまうため、id集合のみで判定）。
 *
 * @see docs/context/ContextMap.pipeline.html
 * @see src/bom/context-pipeline.ts
 * @see src/bom/pipeline-node-types.ts
 * @see src/components/ComponentGraphEditor.tsx (同じcontrolled mode / FitViewOnChangeパターン)
 */
export function ContextPipelineView({
    visibleIds,
    stages = CONTEXT_PIPELINE_STAGES,
    selectedNode,
}: ContextPipelineViewProps) {
    const activeId = resolveActiveContextId(visibleIds)
    const effectiveStages = selectedNode ? applyNodeToTaskSplitting(stages, selectedNode) : stages
    const { nodes: baseNodes, edges } = toPipelineFlow(effectiveStages)

    const [rfNodes, setRfNodes] = useState(baseNodes)

    useEffect(() => {
        setRfNodes((prev) => [...reconcileNodes(prev, baseNodes)])
        // baseNodes はレンダーごとに新しい配列参照になるため、内容（visibleIds/selectedNode）で比較する
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visibleIds, selectedNode])

    const handleNodesChange = useCallback((changes: NodeChange<PipelineFlowNode>[]) => {
        setRfNodes((nds) => applyNodeChanges(changes, nds))
    }, [])

    const nodeIds = rfNodes.map((n) => n.id).join(',')

    return (
        <div
            data-testid="workspace-view-pipeline"
            className="w-full flex-1 flex flex-col min-h-0"
        >
            {activeId == null ? (
                <div
                    data-testid="pipeline-empty"
                    className="flex items-center justify-center min-h-[240px] text-muted-foreground text-xs font-mono"
                >
                    表示中のコンテクストがありません
                </div>
            ) : (
                <>
                    <div
                        data-testid="pipeline-breadcrumb"
                        className="flex items-center gap-2 mb-4 text-xs text-muted-foreground shrink-0"
                    >
                        <span>‹ Contexts</span>
                        <span>/</span>
                        <span
                            className={cn(
                                selectedNode ? undefined : 'text-foreground font-semibold',
                            )}
                        >
                            {labelForContextId(activeId)}
                        </span>
                        {selectedNode ? (
                            <>
                                <span>/</span>
                                <span className="text-foreground font-semibold">
                                    {selectedNode.label}
                                </span>
                            </>
                        ) : (
                            <span>の作業パイプライン</span>
                        )}
                    </div>

                    <div className="relative flex-1 min-h-0 w-full">
                        <ReactFlow
                            nodes={rfNodes}
                            edges={edges}
                            nodeTypes={PIPELINE_NODE_TYPES}
                            onNodesChange={handleNodesChange}
                            nodesConnectable={false}
                            fitView
                        >
                            <Background />
                            <FitViewOnChange nodeIds={nodeIds} />
                        </ReactFlow>
                    </div>
                </>
            )}
        </div>
    )
}

/**
 * Task Splittingステージ（id: 'task-splitting'）のdescription/checklistだけを、
 * 選ばれたノードのdescribe/criteriaに差し替える。他のステージはそのまま。
 */
function applyNodeToTaskSplitting(
    stages: readonly PipelineStage[],
    node: ContextGraphNode,
): readonly PipelineStage[] {
    return stages.map((stage) =>
        stage.id === 'task-splitting'
            ? {
                  ...stage,
                  description: node.describe ?? stage.description,
                  checklist: node.checklist,
              }
            : stage,
    )
}

/**
 * FitViewOnChange
 * nodeIds（ノードid集合を join した文字列）が変わったときだけ fitView() を呼び直す。
 * rfNodes自体を依存にするとドラッグによるposition変化のたびにも発火してしまうため、
 * id集合の文字列だけを依存にして、ステージの入れ替わり時のみ再フィットする
 * （ComponentGraphEditorのFitViewOnChangeと同じ理由）。
 *
 * @see src/components/ComponentGraphEditor.tsx (同じパターンの元ネタ)
 */
function FitViewOnChange({ nodeIds }: { nodeIds: string }) {
    const { fitView } = useReactFlow()

    useEffect(() => {
        fitView({ duration: 200 })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [nodeIds])

    return null
}