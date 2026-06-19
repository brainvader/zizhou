import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useStableValue } from './useStableValue'

const isEqualSet = (a: Set<string>, b: Set<string>) =>
    a.size === b.size && [...a].every((v) => b.has(v))

describe('useStableValue', () => {
    it('内容が同じなら同一参照を返す', () => {
        const set1 = new Set(['a', 'b'])
        const { result, rerender } = renderHook(({ v }) => useStableValue(v, isEqualSet), {
            initialProps: { v: set1 },
        })
        const first = result.current
        rerender({ v: new Set(['a', 'b']) })
        expect(result.current).toBe(first)
    })

    it('内容が変わったら新しい参照を返す', () => {
        const { result, rerender } = renderHook(({ v }) => useStableValue(v, isEqualSet), {
            initialProps: { v: new Set(['a']) },
        })
        const first = result.current
        rerender({ v: new Set(['a', 'b']) })
        expect(result.current).not.toBe(first)
    })
})