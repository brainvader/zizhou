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
     * グラフ側でノードをクリックしたときに渡される、そのノード自身の詳細。
     * 指定されているときは、静的な4ステージパイプラインの代わりに
     * そのノードの describe/criteria（ZTE抽出由来）を表示する。
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

                    {selectedNode ? (
                        <NodeDetailCard node={selectedNode} />
                    ) : (
                        <div className="relative">
                            {stages.map((stage, index) => (
                                <div key={stage.id}>
                                    <PipelineStageCard stage={stage} />
                                    {index < stages.length - 1 && (
                                        <div className="w-px h-5 bg-[#3a4048] ml-5" />
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    )
}

/**
 * NodeDetailCard
 * グラフでクリックされたノード自身の describe/criteria（ZTE抽出由来）を表示する。
 * 静的な PipelineStageCard とは別系統（Zizhou自身のロードマップではなく、
 * 開いているプロジェクトのContextMapに書かれた仕様そのもの）。
 */
function NodeDetailCard({ node }: { node: ContextGraphNode }) {
    return (
        <div
            data-testid="pipeline-node-detail"
            className="rounded-[10px] px-3.5 py-3 border border-border bg-card"
        >
            <div className="text-sm font-semibold mb-1.5">{node.label}</div>
            {node.describe && (
                <div className="text-xs text-[#a3a8b0] leading-relaxed mb-2">
                    {node.describe}
                </div>
            )}
            {node.checklist?.map((item) => (
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