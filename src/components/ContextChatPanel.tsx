import { useState } from 'react'
import {
    DEFAULT_CHAT_MESSAGES,
    type ChatMessage,
} from '@/bom/context-chat'
import { cn } from '@/lib/utils'

export type ContextChatPanelProps = {
    initialMessages?: readonly ChatMessage[]
    onSend?: (body: string) => void
}

/**
 * ContextChatPanel
 * 作業指示のチャットを表示する。送信はローカル状態に追記するのみ。
 *
 * @see docs/context/ContextMap.pipeline.html
 * @see src/bom/context-chat.ts
 */
export function ContextChatPanel({
    initialMessages = DEFAULT_CHAT_MESSAGES,
    onSend,
}: ContextChatPanelProps = {}) {
    const [messages, setMessages] = useState<ChatMessage[]>(() => [
        ...initialMessages,
    ])
    const [draft, setDraft] = useState('')

    const handleSend = () => {
        const body = draft.trim()
        if (!body) return

        const next: ChatMessage = {
            id: `msg-user-${Date.now()}`,
            role: 'user',
            body,
        }
        setMessages((prev) => [...prev, next])
        setDraft('')
        onSend?.(body)
    }

    return (
        <div
            data-testid="context-chat-panel"
            className="w-[260px] shrink-0 flex flex-col h-[560px]"
        >
            <div className="text-[11px] text-muted-foreground font-semibold tracking-[0.06em] uppercase mb-2">
                Chat
            </div>

            <div
                data-testid="chat-messages"
                className="flex-1 overflow-y-auto flex flex-col gap-2.5 pr-0.5"
            >
                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        data-testid={`chat-message-${msg.id}`}
                        data-role={msg.role}
                        className={cn(
                            'max-w-[88%] rounded-lg px-2.5 py-2 text-xs leading-relaxed',
                            msg.role === 'user'
                                ? 'self-end bg-[#c0392b22] border border-[#7a1f16]'
                                : 'self-start bg-card border border-border',
                        )}
                    >
                        {msg.label && (
                            <div
                                className={cn(
                                    'font-mono text-[9px] mb-1',
                                    msg.label.startsWith('EXECUTION')
                                        ? 'text-[#b8862f]'
                                        : 'text-muted-foreground',
                                )}
                            >
                                {msg.label}
                            </div>
                        )}
                        <div className="text-foreground">{msg.body}</div>
                    </div>
                ))}
            </div>

            <div className="flex gap-1.5 mt-3 shrink-0">
                <input
                    type="text"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSend()
                    }}
                    placeholder="指示を入力…"
                    className="flex-1 bg-card border border-border rounded-md px-2.5 py-2 text-xs text-foreground placeholder:text-muted-foreground"
                />
                <button
                    type="button"
                    onClick={handleSend}
                    className="bg-primary text-primary-foreground border-none rounded-md px-3.5 py-2 text-xs cursor-pointer shrink-0"
                >
                    送信
                </button>
            </div>
        </div>
    )
}
