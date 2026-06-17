import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCallbackRef } from './useCallbackRef'
import { useStableValue } from './useStableValue'

// ── useCallbackRef ────────────────────────────────────────────

describe('useCallbackRef', () => {
    it('返される関数参照は再レンダリングをまたいで同一である', () => {
        const fn = vi.fn()
        const { result, rerender } = renderHook(({ cb }) => useCallbackRef(cb), {
            initialProps: { cb: fn },
        })
        const first = result.current
        rerender({ cb: vi.fn() })
        expect(result.current).toBe(first)
    })

    it('最新の fn を呼び出す', () => {
        const fn1 = vi.fn()
        const fn2 = vi.fn()
        const { result, rerender } = renderHook(({ cb }) => useCallbackRef(cb), {
            initialProps: { cb: fn1 },
        })
        rerender({ cb: fn2 })
        act(() => { result.current('arg') })
        expect(fn2).toHaveBeenCalledWith('arg')
        expect(fn1).not.toHaveBeenCalled()
    })

    it('fn が undefined のとき呼び出しても例外を投げない', () => {
        const { result } = renderHook(() => useCallbackRef(undefined))
        expect(() => result.current()).not.toThrow()
    })
})

// ── useStableValue ────────────────────────────────────────────

describe('useStableValue', () => {
    it('内容が同じなら同一参照を返す', () => {
        const isEqual = (a: Set<string>, b: Set<string>) =>
            a.size === b.size && [...a].every((v) => b.has(v))

        const set1 = new Set(['a', 'b'])
        const { result, rerender } = renderHook(({ v }) => useStableValue(v, isEqual), {
            initialProps: { v: set1 },
        })
        const first = result.current

        const set2 = new Set(['a', 'b'])
        rerender({ v: set2 })
        expect(result.current).toBe(first)
    })

    it('内容が変わったら新しい参照を返す', () => {
        const isEqual = (a: Set<string>, b: Set<string>) =>
            a.size === b.size && [...a].every((v) => b.has(v))

        const set1 = new Set(['a'])
        const { result, rerender } = renderHook(({ v }) => useStableValue(v, isEqual), {
            initialProps: { v: set1 },
        })
        const first = result.current

        rerender({ v: new Set(['a', 'b']) })
        expect(result.current).not.toBe(first)
    })
})