import { useState, useEffect, useRef } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { z } from 'zod'
import { CatalogEntrySchema } from '@/bom/graph'
import type { CatalogEntry, UseCatalogSearchOptions, UseCatalogSearchReturn } from '@/bom/graph'

/**
 * useCatalogSearch
 *
 * query を SurrealDB に渡して CatalogEntry[] を返す。
 * - query が空のとき catalog_get_all を呼び全件返す
 * - query がある場合は catalog_search を呼ぶ
 * - 戻り値は { results, loading, error }
 *
 * props DI: onGetAll / onSearch を省略すると invoke() の実装が使われる。
 * テスト・Storybook では差し替えて使う。
 *
 * useRef パターンにより、呼び出し側がインラインオブジェクトを渡しても
 * useEffect が余分に再発火しない。
 *
 * @context CTX-13
 * @bom     docs/bom/graph.ts (CatalogEntrySchema, UseCatalogSearchOptions, UseCatalogSearchReturn)
 * @note    CTX-9 の CatalogEntry[] 直返しから破壊的変更。
 *          CatalogMenu.tsx の呼び出し箇所を { results } に更新すること。
 */
export function useCatalogSearch(
    query: string,
    {
        onGetAll = () => invoke<CatalogEntry[]>('catalog_get_all'),
        onSearch = (q: string) => invoke<CatalogEntry[]>('catalog_search', { query: q }),
    }: UseCatalogSearchOptions = {}
): UseCatalogSearchReturn {
    const [results, setResults] = useState<CatalogEntry[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // レンダリングごとの関数参照変化による useEffect 再発火を防ぐ
    const handlersRef = useRef({ onGetAll, onSearch })
    useEffect(() => {
        handlersRef.current = { onGetAll, onSearch }
    }, [onGetAll, onSearch])

    useEffect(() => {
        let cancelled = false
        setLoading(true)

        const trimmedQuery = query.trim()
        const fetch = trimmedQuery === ''
            ? handlersRef.current.onGetAll()
            : handlersRef.current.onSearch(trimmedQuery)

        fetch
            .then((data) => {
                if (cancelled) return
                const parsed = z.array(CatalogEntrySchema).safeParse(data)
                if (!parsed.success) {
                    setError(parsed.error.message)
                    setResults([])
                } else {
                    setResults(parsed.data)
                    setError(null)
                }
            })
            .catch((err: unknown) => {
                if (cancelled) return
                setError(err instanceof Error ? err.message : String(err))
                setResults([])
            })
            .finally(() => {
                if (!cancelled) setLoading(false)
            })

        return () => { cancelled = true }
    }, [query])

    return { results, loading, error }
}