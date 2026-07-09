/**
 * Context Chat のメッセージ型・初期シード SSOT。
 * ContextMap.pipeline.html のモックを定数化したもの。
 *
 * @see docs/context/ContextMap.pipeline.html
 */

export type ChatMessageRole = 'assistant' | 'user'

export type ChatMessage = {
    id: string
    role: ChatMessageRole
    body: string
    /** assistant 側のラベル（例: EXECUTION · Haiku） */
    label?: string
}

/** ContextMap モック相当の初期メッセージ */
export const DEFAULT_CHAT_MESSAGES: readonly ChatMessage[] = [
    {
        id: 'msg-1',
        role: 'assistant',
        label: 'EXECUTION · Haiku',
        body: 'ContextGraphView.tsx の実装完了。テスト: 3/5 pass、2 fail（renders edges / toggles node visibility）',
    },
    {
        id: 'msg-2',
        role: 'user',
        body: 'toggles node visibility の失敗、原因を先に見せて',
    },
    {
        id: 'msg-3',
        role: 'assistant',
        label: 'SONNET',
        body: '原因: data-visible の初期値とDOM描画順序がズレていました。修正案を提示します。',
    },
] as const
