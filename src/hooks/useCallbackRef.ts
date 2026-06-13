import { useEffect, useRef } from 'react'

/**
 * useCallbackRef
 *
 * コールバック関数を安定した ref 経由で包み、
 * 呼び出し元の再レンダリングを引き起こさない安定した関数参照を返す。
 *
 * useEffect の依存配列にコールバックを含める必要をなくすために使用する。
 *
 * @param fn 安定化したいコールバック（undefined 可）
 * @returns 常に同一参照を持つラッパー関数
 */
export function useCallbackRef<T extends (...args: never[]) => unknown>(
    fn: T | undefined,
): (...args: Parameters<T>) => ReturnType<T> | undefined {
    const ref = useRef(fn)
    useEffect(() => { ref.current = fn }, [fn])
    return useRef((...args: Parameters<T>) => ref.current?.(...args) as ReturnType<T>).current
}