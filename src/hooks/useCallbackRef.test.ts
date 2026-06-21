import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCallbackRef } from './useCallbackRef'

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