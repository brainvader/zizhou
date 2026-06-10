/**
 * @context CTX-22: Source Context — ロジック検証
 * @bom     docs/bom/source-context.ts (SourceContext / isBoundaryEdge)
 *
 * @story
 * [isBoundaryEdge]
 * 1. source / target が同じコンテクストに属する → false（内部エッジ）
 * 2. source がコンテクストに属し、target が未所属 → true（境界エッジ）
 * 3. target がコンテクストに属し、source が未所属 → true（境界エッジ）
 * 4. source / target が異なるコンテクストに属する → true（境界エッジ）
 * 5. source / target が共に未所属 → false
 * 6. コンテクストが空配列 → false
 *
 * [ContextStorage — defaultContextStorage]
 * 7. listContexts は invoke('list_contexts', { projectId }) を呼ぶ
 * 8. createContext は invoke('create_context', { projectId, name, nodeIds }) を呼ぶ
 * 9. updateContext は invoke('update_context', { contextId, name, nodeIds }) を呼ぶ
 * 10. deleteContext は invoke('delete_context', { contextId }) を呼ぶ
 *
 * @output
 *   docs/bom/source-context.ts           — isBoundaryEdge 純粋関数
 *   src/services/ContextStorage.ts       — defaultContextStorage 実装
 */

// =============================================================================
// Imports
// =============================================================================

import { describe, test, expect, vi, beforeEach } from 'vitest'
import type { SourceContext } from '@/bom/source-context'
import { isBoundaryEdge } from '@/bom/source-context'

// =============================================================================
// モック
// =============================================================================

const { mockInvoke } = vi.hoisted(() => ({
    mockInvoke: vi.fn(),
}))

vi.mock('@tauri-apps/api/core', () => ({
    invoke: mockInvoke,
}))

// =============================================================================
// フィクスチャ
// =============================================================================

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

// =============================================================================
// isBoundaryEdge
// =============================================================================

describe('isBoundaryEdge', () => {
    test.skip('1. source/target が同じコンテクスト → false', () => {
        expect(isBoundaryEdge('node:1', 'node:2', [ctxA, ctxB])).toBe(false)
    })

    test.skip('2. source が所属・target が未所属 → true', () => {
        expect(isBoundaryEdge('node:1', 'node:99', [ctxA, ctxB])).toBe(true)
    })

    test.skip('3. target が所属・source が未所属 → true', () => {
        expect(isBoundaryEdge('node:99', 'node:2', [ctxA, ctxB])).toBe(true)
    })

    test.skip('4. source/target が異なるコンテクスト → true', () => {
        expect(isBoundaryEdge('node:1', 'node:3', [ctxA, ctxB])).toBe(true)
    })

    test.skip('5. source/target が共に未所属 → false', () => {
        expect(isBoundaryEdge('node:99', 'node:100', [ctxA, ctxB])).toBe(false)
    })

    test.skip('6. contexts が空配列 → false', () => {
        expect(isBoundaryEdge('node:1', 'node:2', [])).toBe(false)
    })
})

// =============================================================================
// defaultContextStorage
// =============================================================================

describe('defaultContextStorage', () => {
    beforeEach(() => {
        mockInvoke.mockReset()
    })

    test.skip('7. listContexts は invoke("list_contexts") を呼ぶ', async () => {
        mockInvoke.mockResolvedValue([ctxA])
        const { defaultContextStorage } = await import('@/services/ContextStorage')
        const result = await defaultContextStorage.listContexts('project:1')
        expect(mockInvoke).toHaveBeenCalledWith('list_contexts', { projectId: 'project:1' })
        expect(result).toEqual([ctxA])
    })

    test.skip('8. createContext は invoke("create_context") を呼ぶ', async () => {
        mockInvoke.mockResolvedValue(ctxA)
        const { defaultContextStorage } = await import('@/services/ContextStorage')
        const result = await defaultContextStorage.createContext('project:1', 'Context A', ['node:1', 'node:2'])
        expect(mockInvoke).toHaveBeenCalledWith('create_context', {
            projectId: 'project:1',
            name: 'Context A',
            nodeIds: ['node:1', 'node:2'],
        })
        expect(result).toEqual(ctxA)
    })

    test.skip('9. updateContext は invoke("update_context") を呼ぶ', async () => {
        const updated = { ...ctxA, name: 'Renamed' }
        mockInvoke.mockResolvedValue(updated)
        const { defaultContextStorage } = await import('@/services/ContextStorage')
        const result = await defaultContextStorage.updateContext('source_context:a', 'Renamed', ['node:1'])
        expect(mockInvoke).toHaveBeenCalledWith('update_context', {
            contextId: 'source_context:a',
            name: 'Renamed',
            nodeIds: ['node:1'],
        })
        expect(result).toEqual(updated)
    })

    test.skip('10. deleteContext は invoke("delete_context") を呼ぶ', async () => {
        mockInvoke.mockResolvedValue(undefined)
        const { defaultContextStorage } = await import('@/services/ContextStorage')
        await defaultContextStorage.deleteContext('source_context:a')
        expect(mockInvoke).toHaveBeenCalledWith('delete_context', {
            contextId: 'source_context:a',
        })
    })
})