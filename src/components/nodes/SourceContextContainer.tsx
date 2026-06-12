/**
 * SourceContextContainer
 *
 * SourceGraphView で使用する ReactFlow Subflow コンテナノード。
 * SourceContext に属するノード群を視覚的にグループ化する。
 *
 * [CTX-22] 表示仕様:
 *   - コンテナの左上に SourceContext の名前ラベルを表示
 *   - 半透明の背景 + ボーダーでグループ範囲を示す
 *   - サイズは SourceGraphView が computeContainerRect で算出して style で注入する
 *   - 子ノード（SourceNode）は parentId でこのコンテナに紐付けられる
 *
 * data-testid:
 *   - `context-container-{contextId}` — コンテナ全体
 *   - `context-container-label-{contextId}` — 名前ラベル
 *
 * @context CTX-22
 * @bom docs/bom/source-graph.ts (SourceContextContainerProps)
 * @see src/components/SourceGraphView.tsx
 */

import type { SourceContextContainerProps } from '@/bom/source-graph'

export function SourceContextContainer({ data }: SourceContextContainerProps) {
    const { label, contextId } = data

    return (
        <div
            data-testid={`context-container-${contextId}`}
            style={{
                width: '100%',
                height: '100%',
                borderRadius: 8,
                border: '1.5px solid var(--color-violet-500, #8b5cf6)',
                background: 'color-mix(in srgb, var(--color-violet-500, #8b5cf6) 6%, transparent)',
                boxSizing: 'border-box',
                position: 'relative',
            }}
        >
            <div
                data-testid={`context-container-label-${contextId}`}
                style={{
                    position: 'absolute',
                    top: 6,
                    left: 10,
                    fontSize: 10,
                    fontFamily: 'var(--font-mono, monospace)',
                    fontWeight: 500,
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    color: 'var(--color-violet-400, #a78bfa)',
                    userSelect: 'none',
                }}
            >
                {label}
            </div>
        </div>
    )
}