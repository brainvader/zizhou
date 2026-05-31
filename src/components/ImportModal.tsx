/**
 * ImportModal
 *
 * 責務: LLM が返した JSON テキストを受け取り、Zod でバリデーションして
 *       onImport コールバックに LlmImportPayload を渡すモーダル。
 *
 * - onImport: バリデーション成功時に LlmImportPayload を渡すコールバック
 * - onClose:  「閉じる」またはオーバーレイクリック時のコールバック
 *
 * バリデーションは Import ボタンクリック時に実行する。
 * JSON.parse 失敗・Zod 失敗のいずれも data-testid="import-error" にエラーを表示する。
 *
 * @context CTX-10
 * @see docs/bom/llm-export.ts
 * @see docs/specs/ImportModal.stories.tsx
 */

import { useState } from 'react'
import { LlmImportPayloadSchema } from '@/bom/llm-export'
import type { LlmImportPayload } from '@/bom/llm-export'

export type ImportModalProps = {
    onImport: (payload: LlmImportPayload) => void
    onClose: () => void
}

export function ImportModal({ onImport, onClose }: ImportModalProps) {
    const [text, setText] = useState('')
    const [error, setError] = useState<string | null>(null)

    const handleSubmit = () => {
        setError(null)

        // 1. JSON.parse
        let parsed: unknown
        try {
            parsed = JSON.parse(text)
        } catch {
            setError('JSON の構文エラーです。正しい JSON を貼り付けてください。')
            return
        }

        // 2. Zod バリデーション
        const result = LlmImportPayloadSchema.safeParse(parsed)
        if (!result.success) {
            const firstIssue = result.error.issues[0]
            const path = firstIssue.path.join('.')
            setError(`バリデーションエラー: ${path ? `${path}: ` : ''}${firstIssue.message}`)
            return
        }

        onImport(result.data)
    }

    return (
        /* オーバーレイ */
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
            onClick={onClose}
        >
            {/* モーダル本体 */}
            <div
                className="relative flex flex-col w-[680px] max-h-[80vh] bg-[--card] border border-[--border] rounded-[--radius] shadow-[0_8px_32px_rgba(0,0,0,0.6)] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* ヘッダー */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-[--border] shrink-0">
                    <span className="font-mono text-xs text-[--muted-foreground] tracking-widest uppercase">
                        Import Graph
                    </span>
                    <button
                        data-testid="import-close-btn"
                        className="font-mono text-xs text-[--muted-foreground] hover:text-[--foreground] transition-colors px-2 py-1"
                        onClick={onClose}
                    >
                        ✕
                    </button>
                </div>

                {/* テキストエリア */}
                <textarea
                    data-testid="import-textarea"
                    value={text}
                    onChange={(e) => {
                        setText(e.target.value)
                        setError(null)
                    }}
                    placeholder={'{\n  "graph": {\n    "nodes": [...],\n    "edges": [...]\n  }\n}'}
                    className="flex-1 min-h-[320px] resize-none bg-[--background] text-[--foreground] font-mono text-[11px] leading-relaxed p-4 outline-none border-none placeholder:text-[--muted-foreground]/40"
                    spellCheck={false}
                />

                {/* エラー */}
                {error && (
                    <div
                        data-testid="import-error"
                        className="px-4 py-2 bg-[--primary]/10 border-t border-[--primary]/30 font-mono text-[11px] text-[--primary] shrink-0"
                    >
                        {error}
                    </div>
                )}

                {/* フッター */}
                <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-[--border] shrink-0">
                    <button
                        data-testid="import-submit-btn"
                        disabled={text.trim() === ''}
                        className="font-mono text-xs text-[--primary-foreground] bg-[--primary] hover:bg-[--primary-soft] disabled:opacity-40 disabled:cursor-not-allowed px-3 py-1.5 rounded-[--radius] transition-colors"
                        onClick={handleSubmit}
                    >
                        Import
                    </button>
                </div>
            </div>
        </div>
    )
}