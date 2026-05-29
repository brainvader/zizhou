import { useState, useRef, useEffect } from 'react'
import type { CatalogEntry, UseCatalogSearchOptions } from '@/bom/graph'
import { NODE_TYPES, NODE_TYPE_COLOR } from '@/bom/graph'
import { useCatalogSearch } from '@/hooks/useCatalogSearch'

/**
 * CatalogMenu
 *
 * キャンバス空白右クリックで表示するノードカタログメニュー。
 * 検索窓 + カテゴリ別エントリ一覧を表示する。
 *
 * - 検索窓に入力するとリアルタイムで絞り込む（useCatalogSearch）
 * - エントリクリックで onSelectEntry(entry) + onClose() を呼ぶ
 * - マウント時に検索窓にフォーカスする
 * - catalogOptions: Storybook / テスト環境で invoke を差し替えるための DI
 *
 * @context CTX-13
 * @see docs/bom/graph.ts (CatalogEntry, UseCatalogSearchOptions)
 * @see src/hooks/useCatalogSearch.ts
 */

export type CatalogMenuProps = {
    x: number
    y: number
    onClose: () => void
    onSelectEntry: (entry: CatalogEntry) => void
    catalogOptions?: UseCatalogSearchOptions
}

export function CatalogMenu({ x, y, onClose, onSelectEntry, catalogOptions }: CatalogMenuProps) {
    const [query, setQuery] = useState('')
    const inputRef = useRef<HTMLInputElement>(null)
    const { results } = useCatalogSearch(query, catalogOptions)

    // マウント時に検索窓にフォーカス
    useEffect(() => {
        inputRef.current?.focus()
    }, [])

    const handleSelect = (entry: CatalogEntry) => {
        onSelectEntry(entry)
        onClose()
    }

    // カテゴリ別にグルーピング
    const grouped = NODE_TYPES.map((nodeType) => ({
        nodeType,
        entries: results.filter((e) => e.nodeType === nodeType),
    })).filter(({ entries }) => entries.length > 0)

    // testid用のスラッグ生成
    const toSlug = (label: string) =>
        label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

    return (
        <div
            data-testid="catalog-menu"
            className="absolute bg-[--card] border border-[--border] rounded-[--radius] z-100 shadow-[0_4px_16px_rgba(0,0,0,0.4)] w-52 max-h-96 flex flex-col overflow-hidden"
            style={{ top: y, left: x }}
            onContextMenu={(e) => e.preventDefault()}
        >
            {/* 検索窓 */}
            <div className="p-2 border-b border-[--border] shrink-0">
                <input
                    ref={inputRef}
                    data-testid="catalog-search-input"
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search nodes..."
                    className="w-full bg-[--background] border border-[--border] rounded px-2 py-1 text-xs font-mono text-[--foreground] placeholder:text-[--muted-foreground] outline-none focus:border-[--primary]"
                />
            </div>

            {/* エントリ一覧 */}
            <div className="overflow-y-auto flex-1 py-1">
                {grouped.length === 0 && (
                    <div className="px-3 py-2 text-xs font-mono text-[--muted-foreground] opacity-50">
                        No results
                    </div>
                )}
                {grouped.map(({ nodeType, entries }) => (
                    <div key={nodeType}>
                        {/* カテゴリヘッダー */}
                        <div
                            data-testid={`catalog-category-${nodeType}`}
                            className="px-3 pt-2 pb-1 text-[10px] font-mono tracking-widest uppercase select-none"
                            style={{ color: NODE_TYPE_COLOR[nodeType] }}
                        >
                            {nodeType}
                        </div>
                        {/* エントリ */}
                        {entries.map((entry) => (
                            <div
                                key={`${entry.service}-${entry.profile.subcommand}`}
                                data-testid={`catalog-entry-${toSlug(entry.label)}`}
                                className="px-3 py-1.5 text-xs font-mono text-[--muted-foreground] cursor-pointer hover:bg-[--muted] hover:text-[--foreground]"
                                onClick={() => handleSelect(entry)}
                            >
                                {entry.label}
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    )
}