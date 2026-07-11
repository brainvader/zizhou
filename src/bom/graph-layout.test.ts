/**
 * layoutWithDagre — dagreによる自動レイアウトのラッパー
 *
 * @see src/bom/graph-layout.ts
 */
import { describe, it, expect } from 'vitest'

import { layoutWithDagre } from './graph-layout'

describe('dagreの中心座標をReact Flow用の左上原点座標に変換する', () => {
    it('ノード単体（エッジ無し）のとき、位置は (0, 0) になる（中心からwidth/height半分を引いた結果）', () => {
        const result = layoutWithDagre(
            [{ id: 'a', width: 100, height: 50 }],
            [],
        )
        expect(result.a).toEqual({ x: 0, y: 0 })
    })

    it('全ノード分の位置（有限の数値のx/y）を返す', () => {
        const result = layoutWithDagre(
            [
                { id: 'a', width: 100, height: 50 },
                { id: 'b', width: 100, height: 50 },
            ],
            [{ source: 'a', target: 'b' }],
        )
        expect(Number.isFinite(result.a.x)).toBe(true)
        expect(Number.isFinite(result.a.y)).toBe(true)
        expect(Number.isFinite(result.b.x)).toBe(true)
        expect(Number.isFinite(result.b.y)).toBe(true)
    })
})

describe('rankdir（方向）に応じてノードを配置する', () => {
    it('デフォルト（TB）では target が source より下（yが大きい）に配置される', () => {
        const result = layoutWithDagre(
            [
                { id: 'a', width: 100, height: 50 },
                { id: 'b', width: 100, height: 50 },
            ],
            [{ source: 'a', target: 'b' }],
        )
        expect(result.b.y).toBeGreaterThan(result.a.y)
    })

    it('LR指定では target が source より右（xが大きい）に配置される', () => {
        const result = layoutWithDagre(
            [
                { id: 'a', width: 100, height: 50 },
                { id: 'b', width: 100, height: 50 },
            ],
            [{ source: 'a', target: 'b' }],
            'LR',
        )
        expect(result.b.x).toBeGreaterThan(result.a.x)
    })
})

describe('存在しないノードを参照するエッジを無視する', () => {
    it('source/targetの一方がnodes集合に無いエッジがあってもエラーにならない', () => {
        expect(() =>
            layoutWithDagre(
                [{ id: 'a', width: 100, height: 50 }],
                [{ source: 'a', target: 'not-exist' }],
            ),
        ).not.toThrow()
    })

    it('存在しないノードへの参照は無視され、存在するノードの位置は計算される', () => {
        const result = layoutWithDagre(
            [{ id: 'a', width: 100, height: 50 }],
            [{ source: 'a', target: 'not-exist' }],
        )
        expect(result.a).toEqual({ x: 0, y: 0 })
    })
})