import { useMemo, useRef } from 'react'

/**
 * useStableValue
 *
 * 値の内容が変わらない限り同一参照を返す。
 * 参照は変わるが内容が同じオブジェクト・配列・Set を
 * useEffect / useMemo の依存配列に安全に渡すために使用する。
 *
 * @param value    安定化したい値
 * @param isEqual  内容比較関数
 * @returns        内容が同じなら前回と同一参照、変わっていれば新しい値
 */
export function useStableValue<T>(value: T, isEqual: (a: T, b: T) => boolean): T {
    const ref = useRef(value)
    return useMemo(() => {
        if (isEqual(ref.current, value)) return ref.current
        ref.current = value
        return value
    }, [value, isEqual])
}