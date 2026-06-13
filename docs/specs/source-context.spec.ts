/**
 * @context CTX-22: Source Context — ロジック検証
 * @bom     docs/bom/source-context.ts
 *
 * @story
 * [isBoundaryEdge]
 * 1. source/target が同じコンテクスト → false
 * 2. source が所属・target が未所属 → true
 * 3. target が所属・source が未所属 → true
 * 4. source/target が異なるコンテクスト → true
 * 5. source/target が共に未所属 → false
 * 6. contexts が空配列 → false
 *
 * [computeContainerRect]
 * 7. 単一ノード → padding 込みの矩形を返す
 * 8. 複数ノード → 全ノードを包含する矩形を返す
 * 9. nodeIds に対応するノードが存在しない → null を返す
 * 10. padding のデフォルト値は 40
 *
 * [toRelativePosition]
 * 11. 絶対座標からコンテナ座標を引いた値を返す
 * 12. コンテナ原点と同じ座標 → { x: 0, y: 0 }
 *
 * @output docs/bom/source-context.ts（純粋関数のテスト）
 */

import { describe, test, expect } from 'vitest'
import {
    isBoundaryEdge,
    computeContainerRect,
    toRelativePosition,
} from '@/bom/source-context'
import type { SourceContext } from '@/bom/source-context'

// ============================================================
// フィクスチャ
// ============================================================

const ctxA: SourceContext = {
    id: 'source_context:a',
    name: 'Context A',
    projectId: 'project:1',
    nodeIds: ['node:1', 'node:2'],
}

const ctxB: SourceContext = {
    id: 'source_context:b',
    name: 'Context B',
    projectId: 'project:1',
    nodeIds: ['node:3', 'node:4'],
}

const allNodes = [
    { id: 'node:1', position: { x: 100, y: 100 } },
    { id: 'node:2', position: { x: 300, y: 200 } },
    { id: 'node:3', position: { x: 500, y: 100 } },
]

// ============================================================
// isBoundaryEdge
// ============================================================

describe('isBoundaryEdge', () => {
    test('1. source/target が同じコンテクスト → false', () => {
        expect(isBoundaryEdge('node:1', 'node:2', [ctxA, ctxB])).toBe(false)
    })

    test('2. source が所属・target が未所属 → true', () => {
        expect(isBoundaryEdge('node:1', 'node:99', [ctxA, ctxB])).toBe(true)
    })

    test('3. target が所属・source が未所属 → true', () => {
        expect(isBoundaryEdge('node:99', 'node:2', [ctxA, ctxB])).toBe(true)
    })

    test('4. source/target が異なるコンテクスト → true', () => {
        expect(isBoundaryEdge('node:1', 'node:3', [ctxA, ctxB])).toBe(true)
    })

    test('5. source/target が共に未所属 → false', () => {
        expect(isBoundaryEdge('node:99', 'node:100', [ctxA, ctxB])).toBe(false)
    })

    test('6. contexts が空配列 → false', () => {
        expect(isBoundaryEdge('node:1', 'node:2', [])).toBe(false)
    })
})

// ============================================================
// computeContainerRect
// ============================================================

describe('computeContainerRect', () => {
    test('7. 単一ノード → padding 込みの矩形を返す', () => {
        const rect = computeContainerRect(['node:1'], allNodes, 40)
        expect(rect).toEqual({
            x: 100 - 40,
            y: 100 - 40,
            width: 180 + 40 * 2,   // nodeWidth(180) + padding*2
            height: 60 + 40 * 2,   // nodeHeight(60) + padding*2
        })
    })

    test('8. 複数ノード → 全ノードを包含する矩形を返す', () => {
        const rect = computeContainerRect(['node:1', 'node:2'], allNodes, 40)
        // minX=100, minY=100, maxX=300+180=480, maxY=200+60=260
        expect(rect).toEqual({
            x: 100 - 40,
            y: 100 - 40,
            width: (480 - 100) + 40 * 2,
            height: (260 - 100) + 40 * 2,
        })
    })

    test('9. nodeIds に対応するノードが存在しない → null', () => {
        expect(computeContainerRect(['node:99'], allNodes, 40)).toBeNull()
    })

    test('10. padding のデフォルト値は 40', () => {
        const withDefault = computeContainerRect(['node:1'], allNodes)
        const withExplicit = computeContainerRect(['node:1'], allNodes, 40)
        expect(withDefault).toEqual(withExplicit)
    })
})

// ============================================================
// toRelativePosition
// ============================================================

describe('toRelativePosition', () => {
    test('11. 絶対座標からコンテナ座標を引いた値を返す', () => {
        expect(toRelativePosition({ x: 100, y: 200 }, { x: 60, y: 60 })).toEqual({
            x: 40,
            y: 140,
        })
    })

    test('12. コンテナ原点と同じ座標 → { x: 0, y: 0 }', () => {
        expect(toRelativePosition({ x: 60, y: 60 }, { x: 60, y: 60 })).toEqual({
            x: 0,
            y: 0,
        })
    })
})