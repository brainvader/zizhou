import type { SourceContext } from '@/bom/source-context'

/**
 * isSameSet
 *
 * 2つの ReadonlySet が同じ要素を持つか比較する。
 *
 * @param a 比較元
 * @param b 比較先
 * @returns 同じ要素を持つなら true
 */
export function isSameSet(a: ReadonlySet<string>, b: ReadonlySet<string>): boolean {
    if (a.size !== b.size) return false
    for (const item of a) {
        if (!b.has(item)) return false
    }
    return true
}

/**
 * isSameContexts
 *
 * 2つの SourceContext 配列が同じ内容を持つか比較する。
 * id / name / nodeIds の順序まで含めて比較する。
 *
 * @param a 比較元
 * @param b 比較先
 * @returns 同じ内容なら true
 */
export function isSameContexts(a: SourceContext[], b: SourceContext[]): boolean {
    if (a.length !== b.length) return false
    return a.every((ca, i) => {
        const cb = b[i]
        return (
            ca.id === cb.id &&
            ca.name === cb.name &&
            ca.nodeIds.length === cb.nodeIds.length &&
            ca.nodeIds.every((id, j) => id === cb.nodeIds[j])
        )
    })
}