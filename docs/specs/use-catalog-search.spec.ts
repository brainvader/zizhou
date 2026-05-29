/**
 * Slot 1: 発注用ヘッダー
 * @context  CTX-13 useCatalogSearch — SurrealDB 連携
 * @bom      docs/bom/graph.ts (CatalogEntrySchema, UseCatalogSearchOptions, UseCatalogSearchReturn)
 * @story
 *   1. query が空文字のとき onGetAll を呼び、全件を results に返す
 *   2. query に文字列を渡すと onSearch(query) を呼び、結果を results に返す
 *   3. invoke が空配列を返したとき results は [] になる
 *   4. invoke が reject したとき error が設定され results は [] のまま
 *   5. query が変化するたびに再 invoke する
 *   6. invoke 中は loading が true になる
 * @output   src/hooks/useCatalogSearch.ts
 * @note     戻り値変更（CatalogEntry[] → { results, loading, error }）に伴い
 *           src/components/CatalogMenu.tsx の呼び出し箇所1箇所も合わせて修正すること
 */

/**
 * Slot 2: Imports
 */
import { describe, test, expect, vi, beforeEach } from 'vitest'
import type { Mock } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useCatalogSearch } from '@/hooks/useCatalogSearch'
import type { CatalogEntry, UseCatalogSearchOptions } from '@/bom/graph'

/**
 * Slot 3: モック・セットアップ
 */
const mockEntry = (overrides: Partial<CatalogEntry> = {}): CatalogEntry => ({
    service: 'git',
    provider: 'local',
    label: 'Git Status',
    nodeType: 'git',
    profile: {
        subcommand: 'status',
        args: ['status'],
        fields: {},
    },
    ...overrides,
})

interface MockOptions {
    onGetAll: Mock<NonNullable<UseCatalogSearchOptions['onGetAll']>>
    onSearch: Mock<NonNullable<UseCatalogSearchOptions['onSearch']>>
}

const makeMocks = (): MockOptions => ({
    onGetAll: vi.fn(),
    onSearch: vi.fn(),
})

/**
 * Slot 4: 挙動の検証
 */
describe('useCatalogSearch', () => {
    let mocks: MockOptions

    beforeEach(() => {
        mocks = makeMocks()
    })

    // ----------------------------------------------------------------
    // @story 1: query 空 → onGetAll を呼ぶ
    // ----------------------------------------------------------------
    test('query が空文字のとき onGetAll を呼び全件を返す', async () => {
        const entries = [
            mockEntry(),
            mockEntry({ label: 'Git Commit', profile: { subcommand: 'commit', args: [], fields: {} } }),
        ]
        mocks.onGetAll.mockResolvedValue(entries)

        const { result } = renderHook(() =>
            useCatalogSearch('', mocks)
        )

        await waitFor(() => expect(result.current.loading).toBe(false))

        expect(mocks.onGetAll).toHaveBeenCalledOnce()
        expect(mocks.onSearch).not.toHaveBeenCalled()
        expect(result.current.results).toEqual(entries)
        expect(result.current.error).toBeNull()
    })

    // ----------------------------------------------------------------
    // @story 2: query あり → onSearch(query) を呼ぶ
    // ----------------------------------------------------------------
    test('query に文字列を渡すと onSearch を呼ぶ', async () => {
        const entries = [mockEntry()]
        mocks.onSearch.mockResolvedValue(entries)

        const { result } = renderHook(() =>
            useCatalogSearch('git', mocks)
        )

        await waitFor(() => expect(result.current.loading).toBe(false))

        expect(mocks.onSearch).toHaveBeenCalledWith('git')
        expect(mocks.onGetAll).not.toHaveBeenCalled()
        expect(result.current.results).toEqual(entries)
        expect(result.current.error).toBeNull()
    })

    // ----------------------------------------------------------------
    // @story 3: 空配列が返ったとき results は []
    // ----------------------------------------------------------------
    test('onGetAll が空配列を返したとき results は []', async () => {
        mocks.onGetAll.mockResolvedValue([])

        const { result } = renderHook(() =>
            useCatalogSearch('', mocks)
        )

        await waitFor(() => expect(result.current.loading).toBe(false))
        expect(result.current.results).toEqual([])
        expect(result.current.error).toBeNull()
    })

    // ----------------------------------------------------------------
    // @story 4: reject → error が設定される
    // ----------------------------------------------------------------
    test('onSearch が reject したとき error が設定され results は []', async () => {
        mocks.onSearch.mockRejectedValue(new Error('SurrealDB connection failed'))

        const { result } = renderHook(() =>
            useCatalogSearch('git', mocks)
        )

        await waitFor(() => expect(result.current.loading).toBe(false))
        expect(result.current.results).toEqual([])
        expect(result.current.error).toBe('SurrealDB connection failed')
    })

    // ----------------------------------------------------------------
    // @story 5: query 変化 → 再 invoke
    // ----------------------------------------------------------------
    test('query が変化するたびに再 invoke する', async () => {
        mocks.onSearch.mockResolvedValue([mockEntry()])

        const { result, rerender } = renderHook(
            ({ q }: { q: string }) => useCatalogSearch(q, mocks),
            { initialProps: { q: 'git' } }
        )

        await waitFor(() => expect(result.current.loading).toBe(false))
        expect(mocks.onSearch).toHaveBeenCalledTimes(1)

        rerender({ q: 'validate' })

        await waitFor(() => expect(mocks.onSearch).toHaveBeenCalledTimes(2))
        expect(mocks.onSearch).toHaveBeenNthCalledWith(2, 'validate')
    })

    // ----------------------------------------------------------------
    // @story 6: invoke 中は loading が true
    // ----------------------------------------------------------------
    test('invoke 中は loading が true になる', async () => {
        let resolve!: (v: CatalogEntry[]) => void
        mocks.onGetAll.mockReturnValue(
            new Promise<CatalogEntry[]>((r) => { resolve = r })
        )

        const { result } = renderHook(() =>
            useCatalogSearch('', mocks)
        )

        expect(result.current.loading).toBe(true)

        resolve([mockEntry()])
        await waitFor(() => expect(result.current.loading).toBe(false))
    })

    // ----------------------------------------------------------------
    // ロジック内省: Zod バリデーション（invoke の戻り値が不正な場合）
    // ----------------------------------------------------------------
    test('onGetAll が不正な形状を返したとき error が設定される', async () => {
        mocks.onGetAll.mockResolvedValue([{ service: 'git' }] as unknown as CatalogEntry[])

        const { result } = renderHook(() =>
            useCatalogSearch('', mocks)
        )

        await waitFor(() => expect(result.current.loading).toBe(false))
        expect(result.current.error).not.toBeNull()
        expect(result.current.results).toEqual([])
    })
})