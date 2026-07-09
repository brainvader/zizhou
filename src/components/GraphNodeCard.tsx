import type { CustomNodeData } from '@/bom/context-graph'
import { cn } from '@/lib/utils'

export type GraphNodeCardProps = {
    data: CustomNodeData
}

/**
 * GraphNodeCard
 * CustomNode（ComponentNode/HookNode/ExternalNode/StateNode/FeatureNode）共通のカード外観を描画する。
 * React Flow に依存しない、フレームワーク非依存の表示コンポーネント。
 *
 * - kind === 'feature' のときは checklist を表示し、種別テキストは表示しない
 * - それ以外は種別テキスト（component/hook/external/state）を表示する
 * - accent は React Flow 公式の BaseNode パターンに倣い、data 経由で枠線を出し分ける
 *
 * @see src/bom/context-graph.ts
 */
export function GraphNodeCard({ data }: GraphNodeCardProps) {
    const isFeature = data.kind === 'feature'
    const checklist = data.kind === 'feature' ? data.checklist : undefined

    return (
        <div
            data-testid={`graph-node-${data.id}`}
            data-node={data.contextId}
            data-kind={data.kind}
            className={cn(
                'bg-card rounded-[10px] px-3.5 py-3 w-full h-full',
                data.accent === 'primary'
                    ? 'border-[1.5px] border-primary'
                    : data.accent === 'dashed'
                      ? 'border border-dashed border-border bg-[#101317]'
                      : 'border border-border',
            )}
        >
            <div
                className={cn(
                    'font-semibold',
                    isFeature ? 'text-sm mb-2' : 'text-[12.5px]',
                    data.accent === 'dashed' && 'font-medium text-[#a3a8b0] text-[11.5px]',
                )}
            >
                {data.label}
            </div>
            {!isFeature && (
                <div className="text-[10px] text-muted-foreground mt-0.5">{data.kind}</div>
            )}
            {checklist?.map((item) => (
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
