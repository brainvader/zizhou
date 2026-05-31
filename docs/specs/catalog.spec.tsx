/**
 * Slot 1: 発注用ヘッダー (JSDoc Metadata)
 * @context  CTX-9: Node Catalog UI — ロジック検証
 *           CTX-13: useCatalogSearch 非同期化対応
 * @bom      docs/bom/graph.ts (CatalogEntry, NODE_CATALOG, GraphStore.addNodeFromCatalog)
 * @story
 * 1. [useCatalogSearch] query が空のとき NODE_CATALOG 全件を返す
 * 2. [useCatalogSearch] query が 'git' のとき service='git' のエントリのみ返す
 * 3. [useCatalogSearch] query が 'commit' のとき label に 'commit' を含むエントリを返す（大文字小文字無視）
 * 4. [useCatalogSearch] query がマッチしないとき空配列を返す
 * 5. [CatalogMenu] type='catalog' のとき検索窓とエントリ一覧が表示される
 * 6. [CatalogMenu] カテゴリヘッダーが表示される（git / validate / analyze / llm / custom）
 * 7. [CatalogMenu] 検索窓に入力するとエントリが絞り込まれる
 * 8. [CatalogMenu] エントリをクリックすると onSelectEntry が呼ばれる
 * 9. [CatalogMenu] エントリをクリックするとメニューが閉じる（onClose が呼ばれる）
 * @output
 *   src/hooks/useCatalogSearch.ts
 *   src/components/CatalogMenu.tsx
 *   src/components/ContextMenu.tsx  — type='catalog' 追加
 *   src/components/GraphEditor.tsx  — onPaneContextMenu + addNodeFromCatalog 追加
 *   src/store/useGraphStore.ts      — addNodeFromCatalog 追加
 *   docs/bom/graph.ts               — CatalogEntry / NODE_CATALOG / GraphNodeDataSchema / GraphStore 拡張
 */

// =============================================================================
// Slot 2: Imports
// =============================================================================

import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { renderHook } from '@testing-library/react'

// =============================================================================
// Slot 3: モック・セットアップ
// =============================================================================

const { mockAddNodeFromCatalog } = vi.hoisted(() => ({
    mockAddNodeFromCatalog: vi.fn(),
}))

vi.mock('@/store/useGraphStore', () => ({
    useGraphStore: vi.fn((selector: (s: any) => any) =>
        selector({ addNodeFromCatalog: mockAddNodeFromCatalog })
    ),
}))

import { useCatalogSearch } from '@/hooks/useCatalogSearch'
import { CatalogMenu } from '@/components/CatalogMenu'
import { NODE_CATALOG } from '@/bom/graph'
import type { CatalogEntry } from '@/bom/graph'

// テスト用カタログ DI オプション（invoke の代替）
const makeCatalogOptions = () => ({
    onGetAll: () => Promise.resolve(NODE_CATALOG),
    onSearch: (query: string) =>
        Promise.resolve(
            NODE_CATALOG.filter(
                (e) =>
                    e.label.toLowerCase().includes(query.toLowerCase()) ||
                    e.service.toLowerCase().includes(query.toLowerCase())
            )
        ),
})

beforeEach(() => {
    vi.clearAllMocks()
})

// =============================================================================
// Slot 4: useCatalogSearch
// =============================================================================

describe('useCatalogSearch', () => {

    test('logic: query が空のとき NODE_CATALOG 全件を返す', async () => {
        const { result } = renderHook(() =>
            useCatalogSearch('', makeCatalogOptions())
        )
        await waitFor(() => expect(result.current.loading).toBe(false))
        expect(result.current.results).toHaveLength(NODE_CATALOG.length)
    })

    test('logic: query が "git" のとき service="git" のエントリのみ返す', async () => {
        const { result } = renderHook(() =>
            useCatalogSearch('git', makeCatalogOptions())
        )
        await waitFor(() => expect(result.current.loading).toBe(false))
        expect(result.current.results.length).toBeGreaterThan(0)
        result.current.results.forEach((entry) => {
            expect(
                entry.service === 'git' || entry.label.toLowerCase().includes('git')
            ).toBe(true)
        })
    })

    test('logic: query が "commit" のとき label に "commit" を含むエントリを返す（大文字小文字無視）', async () => {
        const { result } = renderHook(() =>
            useCatalogSearch('commit', makeCatalogOptions())
        )
        await waitFor(() => expect(result.current.loading).toBe(false))
        expect(result.current.results.length).toBeGreaterThan(0)
        result.current.results.forEach((entry) => {
            expect(entry.label.toLowerCase()).toContain('commit')
        })
    })

    test('logic: query がマッチしないとき空配列を返す', async () => {
        const { result } = renderHook(() =>
            useCatalogSearch('xyznotexist', makeCatalogOptions())
        )
        await waitFor(() => expect(result.current.loading).toBe(false))
        expect(result.current.results).toHaveLength(0)
    })

})

// =============================================================================
// Slot 5: CatalogMenu
// =============================================================================

describe('CatalogMenu', () => {

    const defaultProps = {
        x: 100,
        y: 100,
        onClose: vi.fn(),
        onSelectEntry: vi.fn(),
        catalogOptions: makeCatalogOptions(),
    }

    test('feature: 検索窓とエントリ一覧が表示される', async () => {
        render(<CatalogMenu {...defaultProps} />)
        expect(screen.getByTestId('catalog-search-input')).toBeInTheDocument()
        await waitFor(() =>
            expect(screen.getAllByTestId(/^catalog-entry-/).length).toBeGreaterThan(0)
        )
    })

    test('feature: カテゴリヘッダーが表示される', async () => {
        render(<CatalogMenu {...defaultProps} />)
        await waitFor(() =>
            expect(screen.getByTestId('catalog-category-git')).toBeInTheDocument()
        )
        expect(screen.getByTestId('catalog-category-validate')).toBeInTheDocument()
        expect(screen.getByTestId('catalog-category-analyze')).toBeInTheDocument()
        expect(screen.getByTestId('catalog-category-llm')).toBeInTheDocument()
        expect(screen.getByTestId('catalog-category-custom')).toBeInTheDocument()
    })

    test('feature: 検索窓に入力するとエントリが絞り込まれる', async () => {
        render(<CatalogMenu {...defaultProps} />)
        const input = screen.getByTestId('catalog-search-input')

        // 全件ロード待ち
        await waitFor(() =>
            expect(screen.getAllByTestId(/^catalog-entry-/).length).toBeGreaterThan(0)
        )
        const allCount = screen.getAllByTestId(/^catalog-entry-/).length

        fireEvent.change(input, { target: { value: 'git' } })

        await waitFor(() => {
            const filtered = screen.getAllByTestId(/^catalog-entry-/).length
            expect(filtered).toBeLessThan(allCount)
        })
    })

    test('feature: エントリをクリックすると onSelectEntry が呼ばれる', async () => {
        const onSelectEntry = vi.fn()
        render(<CatalogMenu {...defaultProps} onSelectEntry={onSelectEntry} />)
        await waitFor(() =>
            expect(screen.getAllByTestId(/^catalog-entry-/).length).toBeGreaterThan(0)
        )
        const entries = screen.getAllByTestId(/^catalog-entry-/)
        fireEvent.click(entries[0])
        expect(onSelectEntry).toHaveBeenCalledTimes(1)
        expect(onSelectEntry).toHaveBeenCalledWith(
            expect.objectContaining({
                service: expect.any(String),
                label: expect.any(String),
            })
        )
    })

    test('feature: エントリをクリックすると onClose が呼ばれる', async () => {
        const onClose = vi.fn()
        render(<CatalogMenu {...defaultProps} onClose={onClose} />)
        await waitFor(() =>
            expect(screen.getAllByTestId(/^catalog-entry-/).length).toBeGreaterThan(0)
        )
        const entries = screen.getAllByTestId(/^catalog-entry-/)
        fireEvent.click(entries[0])
        expect(onClose).toHaveBeenCalledTimes(1)
    })

})