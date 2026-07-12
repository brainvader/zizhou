import {
    CONTEXT_PIPELINE_STAGES,
    labelForContextId,
    resolveActiveContextId,
    type PipelineStage,
    type PipelineStageStatus,
} from '@/bom/context-pipeline'
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

const STATUS_STYLES: Record<
    PipelineStageStatus,
    { border: string; badge: string; muted?: boolean }
> = {
    done: {
        border: 'border-[#3f9161]',
        badge: 'text-[#3f9161] bg-[#3f916122]',
    },
    doing: {
        border: 'border-[#b8862f]',
        badge: 'text-[#b8862f] bg-[#b8862f22]',
        muted: false,
    },
    todo: {
        border: 'border-dashed border-[#4a4f58]',
        badge: 'text-[#4a4f58] bg-[#4a4f5822]',
        muted: true,
    },
}

/**
 * ContextPipelineView
 * コンテキストの作業パイプラインを静的ステージで表示する。
 *
 * @see docs/context/ContextMap.pipeline.html
 * @see src/bom/context-pipeline.ts
 */
export function ContextPipelineView({
    visibleIds,
    stages = CONTEXT_PIPELINE_STAGES,
    selectedNode,
}: ContextPipelineViewProps) {
    const activeId = resolveActiveContextId(visibleIds)
    const effectiveStages = selectedNode ? applyNodeToTaskSplitting(stages, selectedNode) : stages

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

                    <div className="relative">
                        {effectiveStages.map((stage, index) => (
                            <div key={stage.id}>
                                <PipelineStageCard stage={stage} />
                                {index < effectiveStages.length - 1 && (
                                    <div className="w-px h-5 bg-[#3a4048] ml-5" />
                                )}
                            </div>
                        ))}
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

function PipelineStageCard({ stage }: { stage: PipelineStage }) {
    const style = STATUS_STYLES[stage.status]
    const isDoing = stage.status === 'doing'

    return (
        <div
            data-testid={`pipeline-stage-${stage.id}`}
            data-status={stage.status}
            className={cn(
                'rounded-[10px] px-3.5 py-3 border',
                isDoing ? 'bg-[#1a1712]' : 'bg-card',
                style.border,
                style.muted && 'opacity-75',
            )}
        >
            <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-semibold">{stage.title}</span>
                <span
                    className={cn(
                        'font-mono text-[9px] px-1.5 py-0.5 rounded-full',
                        style.badge,
                    )}
                >
                    {stage.status}
                </span>
            </div>
            <div
                className={cn(
                    'text-xs text-[#a3a8b0] leading-relaxed',
                    stage.checklist?.length ? 'mb-2' : undefined,
                )}
            >
                {stage.description}
            </div>
            {stage.checklist?.map((item) => (
                <div
                    key={item.label}
                    className="flex items-start gap-1.5 text-xs text-[#a3a8b0] mb-1 last:mb-0 leading-snug"
                >
                    <input
                        type="checkbox"
                        checked={item.done}
                        disabled
                        readOnly
                        className="mt-0.5"
                    />
                    <span>{item.label}</span>
                </div>
            ))}
        </div>
    )
}