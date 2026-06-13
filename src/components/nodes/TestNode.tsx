/**
 * TestNode
 *
 * SourceGraphView で使用する ReactFlow カスタムノード（テストファイル専用）。
 * *.test.ts / *.spec.ts に対応する。
 *
 * [CTX-22] 表示仕様:
 *   - 紫系のボーダー・背景でソースノードと視覚的に区別する
 *   - displayStatus に応じてボーダー色を変化させる（SourceNode と同じルール）
 *   - selected=true のとき青リング
 *   - suiteCount バッジ: describe の数を右上に表示（未解析時は非表示）
 *   - ↺ ボタン: SourceNode と同じパターンで再解析を呼び出す
 *   - ▶ ボタン: onRunTest が注入されている場合のみ表示（CTX-23 で接続）
 *
 * data-testid:
 *   - `test-node-{filePath の / を - に変換}` — ノード全体
 *   - `reanalyze-test-node-{filePath の / を - に変換}` — ↺ ボタン
 *   - `run-test-node-{filePath の / を - に変換}` — ▶ ボタン
 *
 * @context CTX-22
 * @bom docs/bom/source-graph.ts (TestNodeProps, TestNodeDisplayData)
 * @see src/components/SourceGraphView.tsx
 * @see src/stories/SourceGraphView.stories.tsx
 */

import { Handle, Position } from '@xyflow/react'
import type { TestNodeProps } from '@/bom/source-graph'

function toTestId(path: string) {
    return path.replace(/\//g, '-')
}

export function TestNode({ data, selected }: TestNodeProps) {
    const { label, filePath, displayStatus, suiteCount, onReanalyze, onRunTest } = data

    // ============================================================
    // スタイル計算
    // ============================================================

    const borderColor =
        displayStatus === 'stale'
            ? 'var(--color-amber-500, #f59e0b)'
            : displayStatus === 'fresh'
                ? 'var(--color-violet-500, #8b5cf6)'
                : 'var(--color-zinc-500, #71717a)'

    const bgColor =
        displayStatus === 'stale'
            ? 'color-mix(in srgb, var(--color-amber-500, #f59e0b) 10%, transparent)'
            : displayStatus === 'pending'
                ? 'color-mix(in srgb, var(--color-zinc-500, #71717a) 8%, transparent)'
                : 'color-mix(in srgb, var(--color-violet-500, #8b5cf6) 8%, var(--card, #1c1c1e))'

    const ringStyle: React.CSSProperties = selected
        ? {
            outline: '2px solid var(--color-blue-400, #60a5fa)',
            outlineOffset: '2px',
        }
        : {}

    const testId = filePath ? `test-node-${toTestId(filePath)}` : undefined

    return (
        <div
            data-testid={testId}
            data-selected={selected ? 'true' : 'false'}
            data-status={displayStatus}
            style={{
                minWidth: 140,
                maxWidth: 200,
                padding: '6px 10px',
                borderRadius: 6,
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
            <Handle type="target" position={Position.Left} />

            {/* ヘッダー行: ラベル + ボタン群 */}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 4,
                }}
            >
                {/* テストファイルアイコン + ラベル */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1, overflow: 'hidden' }}>
                    <span style={{ fontSize: 10, opacity: 0.7, flexShrink: 0 }}>⚗</span>
                    <span
                        style={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                        }}
                        title={filePath ?? label}
                    >
                        {label}
                    </span>
                </div>

                {/* ボタン群 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                    {/* suiteCount バッジ */}
                    {suiteCount !== undefined && suiteCount > 0 && (
                        <span
                            style={{
                                fontSize: 9,
                                fontFamily: 'var(--font-mono, monospace)',
                                color: 'var(--color-violet-400, #a78bfa)',
                                background: 'color-mix(in srgb, var(--color-violet-500, #8b5cf6) 15%, transparent)',
                                borderRadius: 3,
                                padding: '0 4px',
                                lineHeight: '16px',
                            }}
                        >
                            {suiteCount}
                        </span>
                    )}

                    {/* ↺ 再解析ボタン */}
                    {filePath && onReanalyze && (
                        <button
                            type="button"
                            data-testid={`reanalyze-test-node-${toTestId(filePath)}`}
                            onClick={(e) => {
                                e.stopPropagation()
                                onReanalyze(filePath)
                            }}
                            title={`Reanalyze ${filePath}`}
                            style={{
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
                                (e.currentTarget as HTMLButtonElement).style.color =
                                    'var(--foreground, #fafafa)'
                            }}
                            onMouseLeave={(e) => {
                                (e.currentTarget as HTMLButtonElement).style.color =
                                    'var(--muted-foreground, #a1a1aa)'
                            }}
                        >
                            ↺
                        </button>
                    )}

                    {/* ▶ 実行ボタン（CTX-23 で onRunTest が注入されたら表示） */}
                    {filePath && onRunTest && (
                        <button
                            type="button"
                            data-testid={`run-test-node-${toTestId(filePath)}`}
                            onClick={(e) => {
                                e.stopPropagation()
                                onRunTest(filePath)
                            }}
                            title={`Run tests in ${filePath}`}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--color-violet-400, #a78bfa)',
                                cursor: 'pointer',
                                padding: '0 2px',
                                fontSize: 11,
                                lineHeight: 1,
                                borderRadius: 3,
                            }}
                            onMouseEnter={(e) => {
                                (e.currentTarget as HTMLButtonElement).style.color =
                                    'var(--foreground, #fafafa)'
                            }}
                            onMouseLeave={(e) => {
                                (e.currentTarget as HTMLButtonElement).style.color =
                                    'var(--color-violet-400, #a78bfa)'
                            }}
                        >
                            ▶
                        </button>
                    )}
                </div>
            </div>

            {/* ステータス表示（fresh 以外） */}
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

            <Handle type="source" position={Position.Right} />
        </div>
    )
}