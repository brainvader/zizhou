/**
 * ExportModal
 *
 * 責務: グラフの LLM Knowledge Format JSON を表示し、
 *       クリップボードコピーまたはファイル保存を提供するモーダル。
 *
 * - payload: buildLlmExport() の結果（GraphEditor から受け取る）
 * - onCopy:  「コピー」クリック時のコールバック
 * - onSave:  「保存」クリック時のコールバック
 * - onClose: 「閉じる」またはオーバーレイクリック時のコールバック
 *
 * テキストエリアは readonly。ユーザーは内容を確認してコピーする。
 *
 * @context CTX-10
 * @see docs/bom/llm-export.ts
 * @see docs/specs/ExportModal.stories.tsx
 */

import type { LlmExportPayload } from '@/bom/llm-export'

export type ExportModalProps = {
    payload: LlmExportPayload
    onCopy: () => void
    onSave: () => void
    onClose: () => void
}

export function ExportModal({ payload, onCopy, onSave, onClose }: ExportModalProps) {
    const json = JSON.stringify(payload, null, 2)

    return (
        /* オーバーレイ */
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
            onClick={onClose}
        >
            {/* モーダル本体 */}
            <div
                className="relative flex flex-col w-170 max-h-[80vh] bg-[--card] border border-[--border] rounded-[--radius] shadow-[0_8px_32px_rgba(0,0,0,0.6)] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* ヘッダー */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-[--border] shrink-0">
                    <span className="font-mono text-xs text-[--muted-foreground] tracking-widest uppercase">
                        Export Graph
                    </span>
                    <button
                        data-testid="export-close-btn"
                        className="font-mono text-xs text-[--muted-foreground] hover:text-[--foreground] transition-colors px-2 py-1"
                        onClick={onClose}
                    >
                        ✕
                    </button>
                </div>

                {/* テキストエリア */}
                <textarea
                    data-testid="export-textarea"
                    readOnly
                    value={json}
                    className="flex-1 min-h-0 resize-none bg-[--background] text-[--foreground] font-mono text-[11px] leading-relaxed p-4 outline-none border-none"
                    spellCheck={false}
                />

                {/* フッター */}
                <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-[--border] shrink-0">
                    <button
                        data-testid="export-save-btn"
                        className="font-mono text-xs text-[--muted-foreground] hover:text-[--foreground] border border-[--border] hover:border-[--muted-foreground] px-3 py-1.5 rounded-[--radius] transition-colors"
                        onClick={onSave}
                    >
                        Save
                    </button>
                    <button
                        data-testid="export-copy-btn"
                        className="font-mono text-xs text-[--primary-foreground] bg-[--primary] hover:bg-[--primary-soft] px-3 py-1.5 rounded-[--radius] transition-colors"
                        onClick={onCopy}
                    >
                        Copy
                    </button>
                </div>
            </div>
        </div>
    )
}