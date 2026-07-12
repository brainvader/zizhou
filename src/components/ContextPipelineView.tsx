import { ReactFlow, Background } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import {
    CONTEXT_PIPELINE_STAGES,
    labelForContextId,
    resolveActiveContextId,
    toPipelineFlow,
    type PipelineStage,
} from '@/bom/context-pipeline'
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
 * コンテキストの作業パイプラインを React Flow で表示する（縦一列の固定シーケンス）。
 * ノードの並び順自体がパイプラインの意味そのものであり、ドラッグでの並べ替えは
 * 対象外（nodesDraggable={false}）。依存関係グラフ（ComponentGraphEditor）とは違い、
 * 自動レイアウト（dagre）は使わず toPipelineFlow() の固定縦一列配置を使う。
 *
 * @see docs/context/ContextMap.pipeline.html
 * @see src/bom/context-pipeline.ts
 * @see src/bom/pipeline-node-types.ts
 */
export function ContextPipelineView({
    visibleIds,
    stages = CONTEXT_PIPELINE_STAGES,
    selectedNode,
}: ContextPipelineViewProps) {
    const activeId = resolveActiveContextId(visibleIds)
    const effectiveStages = selectedNode ? applyNodeToTaskSplitting(stages, selectedNode) : stages
    const { nodes, edges } = toPipelineFlow(effectiveStages)

    return (
        <div
            data-testid="workspace-view-pipeline"
            className="w-[400px] shrink-0"
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
                        className="flex items-center gap-2 mb-4 text-xs text-muted-foreground"
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

                    <div className="h-[520px]">
                        <ReactFlow
                            nodes={nodes}
                            edges={edges}
                            nodeTypes={PIPELINE_NODE_TYPES}
                            nodesDraggable={false}
                            nodesConnectable={false}
                            fitView
                        >
                            <Background />
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