import type { Node, NodeProps } from '@xyflow/react'
import type { PipelineStage, PipelineStageStatus } from '@/bom/context-pipeline'
import { GraphNodeHandles } from './GraphNodeHandles'
import { cn } from '@/lib/utils'

export type PipelineStageNodeData = { stage: PipelineStage }
export type PipelineStageNodeType = Node<PipelineStageNodeData, 'stage'>

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
 * PipelineStageNode
 * React Flow用のPipelineStageカスタムノード。見た目は従来の静的カードと同じ。
 * Handle（上下左右4方向）は GraphNodeHandles を流用する（縦一列なので実際に使うのは上下のみ）。
 *
 * @see src/bom/context-pipeline.ts
 * @see src/components/GraphNodeHandles.tsx
 */
export function PipelineStageNode({ data }: NodeProps<PipelineStageNodeType>) {
    const { stage } = data
    const style = STATUS_STYLES[stage.status]
    const isDoing = stage.status === 'doing'

    return (
        <>
            <GraphNodeHandles />
            <div
                data-testid={`pipeline-stage-${stage.id}`}
                data-status={stage.status}
                className={cn(
                    'rounded-[10px] px-3.5 py-3 border w-full h-full',
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
        </>
    )
}