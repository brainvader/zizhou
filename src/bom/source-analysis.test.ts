import { describe, test, expect } from 'vitest'
import { computeAnalyzedDisplay } from '@/bom/source-graph'
import type { AnalyzedDisplay } from '@/bom/source-graph'

describe('ノードの表示状態を算出する', () => {
    const changed = new Set(['src/foo.ts', 'src/bar.ts'])

    test('fresh + filePath in changedFiles → stale', () => {
        const result = computeAnalyzedDisplay('fresh', 'src/foo.ts', changed)
        expect(result).toBe<AnalyzedDisplay>('stale')
    })

    test('fresh + filePath not in changedFiles → fresh', () => {
        const result = computeAnalyzedDisplay('fresh', 'src/baz.ts', changed)
        expect(result).toBe<AnalyzedDisplay>('fresh')
    })

    test('pending → pending', () => {
        const result = computeAnalyzedDisplay('pending', 'src/foo.ts', changed)
        expect(result).toBe<AnalyzedDisplay>('pending')
    })

    test('undefined analyzed → pending', () => {
        const result = computeAnalyzedDisplay(undefined, 'src/foo.ts', changed)
        expect(result).toBe<AnalyzedDisplay>('pending')
    })

    test('fresh + filePath undefined → fresh（filePath なしは stale にならない）', () => {
        const result = computeAnalyzedDisplay('fresh', undefined, changed)
        expect(result).toBe<AnalyzedDisplay>('fresh')
    })

    test('empty changedFiles → always fresh when analyzed=fresh', () => {
        const result = computeAnalyzedDisplay('fresh', 'src/foo.ts', new Set())
        expect(result).toBe<AnalyzedDisplay>('fresh')
    })
})