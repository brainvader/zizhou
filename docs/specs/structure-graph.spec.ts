/**
 * @bom      docs/bom/structure-graph.ts
 * @context  CTX-20 / computeAnalyzedDisplay
 *
 * computeAnalyzedDisplay の純粋関数仕様。
 *
 *   analyzed  | filePath ∈ changedFiles | 表示
 *   ----------+--------------------------+----------
 *   undefined | -                        | 'pending'
 *   'pending' | -                        | 'pending'
 *   'fresh'   | no                       | 'fresh'
 *   'fresh'   | yes                      | 'stale'
 *
 * stale は DB に保存されない描画専用ステータスである。
 * changedFiles ∩ analyzedFiles の交差判定はこの関数の責務ではなく、
 * 呼び出し側（projects.$id.tsx）の useMemo で行う。
 */

import { describe, it, expect } from 'vitest'
import { computeAnalyzedDisplay } from '@/bom/structure-graph'

describe('computeAnalyzedDisplay', () => {
    describe('analyzed が pending 系のとき', () => {
        it('analyzed が undefined なら pending', () => {
            expect(computeAnalyzedDisplay(undefined, 'a.ts', new Set())).toBe('pending')
        })

        it('analyzed が "pending" なら pending', () => {
            expect(computeAnalyzedDisplay('pending', 'a.ts', new Set())).toBe('pending')
        })

        it('pending は changedFiles に含まれていても pending のまま（fresh を経ていないため stale 判定対象外）', () => {
            expect(
                computeAnalyzedDisplay('pending', 'a.ts', new Set(['a.ts'])),
            ).toBe('pending')
        })
    })

    describe('analyzed が "fresh" のとき', () => {
        it('changedFiles が空なら fresh', () => {
            expect(computeAnalyzedDisplay('fresh', 'a.ts', new Set())).toBe('fresh')
        })

        it('filePath が changedFiles に含まれないなら fresh', () => {
            expect(
                computeAnalyzedDisplay('fresh', 'a.ts', new Set(['b.ts', 'c.ts'])),
            ).toBe('fresh')
        })

        it('filePath が changedFiles に含まれるなら stale', () => {
            expect(
                computeAnalyzedDisplay('fresh', 'a.ts', new Set(['a.ts'])),
            ).toBe('stale')
        })

        it('changedFiles に複数要素あり filePath が含まれるなら stale', () => {
            expect(
                computeAnalyzedDisplay(
                    'fresh',
                    'src/components/FileTree.tsx',
                    new Set(['src/components/FileTree.tsx', 'README.md']),
                ),
            ).toBe('stale')
        })

        it('filePath が undefined のとき（filePath 未設定ノード）は fresh', () => {
            expect(
                computeAnalyzedDisplay('fresh', undefined, new Set(['a.ts'])),
            ).toBe('fresh')
        })
    })

    describe('パス比較は厳密一致', () => {
        it('大文字小文字が違えば stale にならない', () => {
            expect(
                computeAnalyzedDisplay('fresh', 'a.ts', new Set(['A.ts'])),
            ).toBe('fresh')
        })

        it('前方一致でも stale にならない（厳密一致のみ）', () => {
            expect(
                computeAnalyzedDisplay(
                    'fresh',
                    'src/a.ts',
                    new Set(['src/a.ts.bak']),
                ),
            ).toBe('fresh')
        })

        it('forward slash が backslash と一致しない', () => {
            // 規約: パスは forward slash で正規化されている前提。
            // 異なる区切り文字は別パスとみなす。
            expect(
                computeAnalyzedDisplay(
                    'fresh',
                    'src/a.ts',
                    new Set(['src\\a.ts']),
                ),
            ).toBe('fresh')
        })
    })
})