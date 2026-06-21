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