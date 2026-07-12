import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import {
    WORKSPACE_SIDEBAR_ITEMS,
    DEFAULT_VISIBLE_CONTEXT_IDS,
    type ContextNodeId,
    type ContextSidebarItem,
    type ContextSection,
} from '@/bom/workspace'
import { cn } from '@/lib/utils'

export type ContextSidebarProps = {
    items?: readonly ContextSidebarItem[]
    defaultVisibleIds?: readonly ContextNodeId[]
    onVisibilityChange?: (visibleIds: ContextNodeId[]) => void
}

/**
 * ContextSidebar
 * コンテキストの表示を切り替える。
 *
 * Contexts: 独立トグル（複数同時 ON 可）
 * UI: 排他選択（1つ選ぶと他が OFF）
 * セクション間: どちらか一方を選ぶと、もう一方は全 OFF
 *
 * @see docs/context/ContextMap.graph.html
 * @see docs/context/ContextMap.pipeline.html
 * @see src/bom/workspace.ts
 */
export function ContextSidebar({
    items = WORKSPACE_SIDEBAR_ITEMS,
    defaultVisibleIds = DEFAULT_VISIBLE_CONTEXT_IDS,
    onVisibilityChange,
}: ContextSidebarProps = {}) {
    const [visibleIds, setVisibleIds] = useState<ContextNodeId[]>(() => [
        ...defaultVisibleIds,
    ])

    const sectionOf = (id: ContextNodeId): ContextSection =>
        items.find((item) => item.id === id)?.section ?? 'contexts'

    const commit = (next: ContextNodeId[]) => {
        setVisibleIds(next)
        onVisibilityChange?.(next)
    }

    const handleClick = (id: ContextNodeId) => {
        const section = sectionOf(id)

        if (section === 'contexts') {
            const turningOn = !visibleIds.includes(id)
            if (turningOn) {
                // Contexts ON → clear UI, keep other contexts, add this id
                commit([
                    ...visibleIds.filter((v) => sectionOf(v) === 'contexts'),
                    id,
                ])
            } else {
                // Contexts OFF → remove only this id
                commit(visibleIds.filter((v) => v !== id))
            }
            return
        }

        // UI: exclusive — clear contexts, select only this id
        commit([id])
    }

    const contexts = items.filter((item) => item.section === 'contexts')
    const ui = items.filter((item) => item.section === 'ui')

    return (
        <nav
            data-testid="context-sidebar"
            className="w-[170px] shrink-0 flex flex-col gap-0.5"
        >
            <SectionLabel>Contexts</SectionLabel>
            {contexts.map((item) => (
                <ContextRow
                    key={item.id}
                    item={item}
                    visible={visibleIds.includes(item.id)}
                    onClick={() => handleClick(item.id)}
                />
            ))}

            <div className="h-px bg-border mx-2.5 mt-2.5 mb-1" />

            <SectionLabel className="mt-2">UI</SectionLabel>
            {ui.map((item) => (
                <ContextRow
                    key={item.id}
                    item={item}
                    visible={visibleIds.includes(item.id)}
                    onClick={() => handleClick(item.id)}
                />
            ))}
        </nav>
    )
}

function SectionLabel({
    children,
    className,
}: {
    children: React.ReactNode
    className?: string
}) {
    return (
        <div
            className={cn(
                'text-[11px] text-muted-foreground font-semibold tracking-[0.06em] uppercase mb-1.5 px-2.5',
                className,
            )}
        >
            {children}
        </div>
    )
}

function ContextRow({
    item,
    visible,
    onClick,
}: {
    item: ContextSidebarItem
    visible: boolean
    onClick: () => void
}) {
    return (
        <button
            type="button"
            data-testid={`ctx-row-${item.id}`}
            data-section={item.section}
            data-node={item.id}
            data-visible={visible ? 'true' : 'false'}
            onClick={onClick}
            className="flex items-center gap-2 py-[7px] px-2.5 rounded-md cursor-pointer text-left text-sm hover:bg-muted/40"
        >
            <span
                className={cn(
                    'flex shrink-0',
                    visible ? 'text-primary' : 'text-muted-foreground',
                )}
            >
                {visible ? (
                    <Eye size={15} data-eye="open" strokeWidth={2} />
                ) : (
                    <EyeOff size={15} data-eye="closed" strokeWidth={2} />
                )}
            </span>
            <span>{item.label}</span>
        </button>
    )
}