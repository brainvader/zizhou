/**
 * SourceNode
 *
 * SourceGraphView で使用する ReactFlow カスタムノード。
 *
 * [CTX-21] 表示ステータス:
 *   - displayStatus='fresh'   → デフォルトスタイル（緑の左ボーダー）
 *   - displayStatus='stale'   → amber の左ボーダー + 薄い amber 背景
 *   - displayStatus='pending' → グレーの左ボーダー + 薄い背景（未解析）
 *
 * [CTX-21] 選択ハイライト（File→Node 同期）:
 *   - selected=true のとき青リング
 *
 * [CTX-21] ↺ Reanalyze ボタン:
 *   - 常時表示（hover-only より UX が安定している）
 *   - filePath が存在する場合のみ表示
 *   - data-testid="reanalyze-node-{filePath}"
 *
 * props DI:
 *   onReanalyze は SourceGraphView から data に注入される。
 *
 * @context CTX-21
 * @bom docs/bom/source-graph.ts (SourceNodeProps, SourceNodeDisplayData)
 * @see src/components/SourceGraphView.tsx
 * @see src/stories/SourceGraphView.stories.tsx
 */

import { Handle, Position } from '@xyflow/react'
import type { SourceNodeProps } from '@/bom/source-graph'

export function SourceNode({ data, selected }: SourceNodeProps) {
    const { label, filePath, displayStatus, onReanalyze } = data

    // ============================================================
    // スタイル計算
    // ============================================================

    const borderColor =
        displayStatus === 'stale'
            ? 'var(--color-amber-500, #f59e0b)'
            : displayStatus === 'fresh'
                ? 'var(--color-green-500, #22c55e)'
                : 'var(--color-zinc-500, #71717a)'

    const bgColor =
        displayStatus === 'stale'
            ? 'color-mix(in srgb, var(--color-amber-500, #f59e0b) 10%, transparent)'
            : displayStatus === 'pending'
                ? 'color-mix(in srgb, var(--color-zinc-500, #71717a) 8%, transparent)'
                : 'var(--card, #1c1c1e)'

    const ringStyle: React.CSSProperties = selected
        ? {
            outline: '2px solid var(--color-blue-400, #60a5fa)',
            outlineOffset: '2px',
        }
        : {}

    return (
        <div
            data-testid={`source-node-${filePath ?? label}`}
            data-selected={selected ? 'true' : 'false'}
            data-status={displayStatus}
            style={{
                minWidth: 140,
                maxWidth: 200,
                padding: '6px 10px',
                borderRadius: 6,
                borderLeft: `3px solid ${borderColor}`,
                border: `1px solid var(--border, #3f3f46)`,
                borderLeftWidth: 3,
                borderLeftColor: borderColor,
                background: bgColor,
                color: 'var(--foreground, #fafafa)',
                fontSize: 12,
                fontFamily: 'var(--font-mono, monospace)',
                cursor: 'pointer',
                userSelect: 'none',
                position: 'relative',
                ...ringStyle,
            }}
        >
            {/* ソースハンドル（左） */}
            <Handle type="target" position={Position.Left} />

            {/* ラベル行 */}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 6,
                }}
            >
                <span
                    style={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        flex: 1,
                    }}
                    title={filePath ?? label}
                >
                    {label}
                </span>

                {/* ↺ Reanalyze ボタン: filePath が存在する場合のみ表示 */}
                {filePath && onReanalyze && (
                    <button
                        type="button"
                        data-testid={`reanalyze-node-${filePath}`}
                        onClick={(e) => {
                            e.stopPropagation()
                            onReanalyze(filePath)
                        }}
                        title={`Reanalyze ${filePath}`}
                        style={{
                            flexShrink: 0,
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--muted-foreground, #a1a1aa)',
                            cursor: 'pointer',
                            padding: '0 2px',
                            fontSize: 13,
                            lineHeight: 1,
                            borderRadius: 3,
                        }}
                        onMouseEnter={(e) => {
                            ; (e.currentTarget as HTMLButtonElement).style.color =
                                'var(--foreground, #fafafa)'
                        }}
                        onMouseLeave={(e) => {
                            ; (e.currentTarget as HTMLButtonElement).style.color =
                                'var(--muted-foreground, #a1a1aa)'
                        }}
                    >
                        ↺
                    </button>
                )}
            </div>

            {/* ステータスバッジ */}
            {displayStatus !== 'fresh' && (
                <div
                    style={{
                        marginTop: 3,
                        fontSize: 9,
                        fontFamily: 'var(--font-mono, monospace)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        color:
                            displayStatus === 'stale'
                                ? 'var(--color-amber-400, #fbbf24)'
                                : 'var(--muted-foreground, #a1a1aa)',
                    }}
                >
                    {displayStatus}
                </div>
            )}

            {/* ターゲットハンドル（右） */}
            <Handle type="source" position={Position.Right} />
        </div>
    )
}