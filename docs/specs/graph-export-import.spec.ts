/**
 * @context CTX-10: useGraphExport / useGraphImport — ロジック検証
 * @bom docs/bom/llm-export.ts, docs/bom/graph.ts
 * @story
 * [useGraphExport]
 * 1. exportGraph() を呼ぶと buildLlmExport の結果が返る
 * 2. projectId / projectName / graphId が payload に反映される
 * 3. catalog は invoke('catalog_get_all') の結果が使われる
 *
 * [useGraphImport]
 * 4. importGraph(payload) を呼ぶと importToGraphFile の結果で loadGraph が呼ばれる
 * 5. インポート後に saveGraph が呼ばれる（永続化）
 *
 * @output src/hooks/useGraphExport.ts, src/hooks/useGraphImport.ts
 */

import { describe, test, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import type { Node, Edge } from '@xyflow/react'
import type { GraphNodeData } from '@/bom/graph'
import type { LlmImportPayload, LlmExportPayload } from '@/bom/llm-export'

// ── モック ──────────────────────────────────────────────────

const { mockLoadGraph, mockNodes, mockEdges } = vi.hoisted(() => {
    const mockNodes: Node<GraphNodeData>[] = [
        {
            id: 'node-001',
            type: 'editableNode',
            position: { x: 0, y: 0 },
            data: { label: 'Git Status', nodeType: 'git', status: 'done' },
        },
    ]
    const mockEdges: Edge[] = []
    return {
        mockLoadGraph: vi.fn(),
        mockNodes,
        mockEdges,
    }
})

vi.mock('@/store/useGraphStore', () => ({
    useGraphStore: vi.fn((selector: (s: any) => any) =>
        selector({
            nodes: mockNodes,
            edges: mockEdges,
            loadGraph: mockLoadGraph,
        })
    ),
}))

vi.mock('@/store/useProjectDetailStore', () => ({
    useProjectDetailStore: vi.fn((selector: (s: any) => any) =>
        selector({
            activeGraphId: 'graph-1',
            projectRootPath: '/mock/path',
        })
    ),
}))

vi.mock('@/store/useProjectStore', () => ({
    useProjectStore: vi.fn((selector: (s: any) => any) =>
        selector({
            projects: [{ id: 'proj-1', name: 'My Project', rootPath: '/mock/path' }],
        })
    ),
}))

// ── useGraphExport ───────────────────────────────────────────

import { useGraphExport } from '@/hooks/useGraphExport'

describe('useGraphExport', () => {

    const mockGetAll = vi.fn(async () => [])

    beforeEach(() => {
        vi.clearAllMocks()
    })

    test('logic: exportGraph() が LlmExportPayload を返す', async () => {
        const { result } = renderHook(() =>
            useGraphExport({ projectId: 'proj-1', onGetAll: mockGetAll })
        )
        let payload: LlmExportPayload | undefined
        await act(async () => {
            payload = await result.current.exportGraph()
        })
        expect(payload).toBeDefined()
        expect(payload!.project.id).toBe('proj-1')
        expect(payload!.graph.id).toBe('graph-1')
        expect(payload!.graph.nodes).toHaveLength(1)
    })

    test('logic: catalog_get_all が呼ばれる', async () => {
        const { result } = renderHook(() =>
            useGraphExport({ projectId: 'proj-1', onGetAll: mockGetAll })
        )
        await act(async () => { await result.current.exportGraph() })
        expect(mockGetAll).toHaveBeenCalledOnce()
    })

})

// ── useGraphImport ───────────────────────────────────────────

import { useGraphImport } from '@/hooks/useGraphImport'

describe('useGraphImport', () => {

    const mockSaveGraph = vi.fn(async () => { })

    beforeEach(() => {
        vi.clearAllMocks()
    })

    const payload: LlmImportPayload = {
        graph: {
            nodes: [
                { id: 'x', label: 'Node X', nodeType: 'git' },
                { id: 'y', label: 'Node Y', nodeType: 'llm' },
            ],
            edges: [{ source: 'x', target: 'y' }],
        },
    }

    test('logic: importGraph(payload) で loadGraph が呼ばれる', async () => {
        const { result } = renderHook(() =>
            useGraphImport({ onSaveGraph: mockSaveGraph })
        )
        await act(async () => { await result.current.importGraph(payload) })
        expect(mockLoadGraph).toHaveBeenCalledOnce()
        const loaded = mockLoadGraph.mock.calls[0][0]
        expect(loaded.nodes).toHaveLength(2)
        expect(loaded.edges).toHaveLength(1)
    })

    test('logic: importGraph 後に saveGraph が呼ばれる', async () => {
        const { result } = renderHook(() =>
            useGraphImport({ onSaveGraph: mockSaveGraph })
        )
        await act(async () => { await result.current.importGraph(payload) })
        expect(mockSaveGraph).toHaveBeenCalledOnce()
    })

    test('logic: graphId が null のとき importGraph は何もしない', async () => {
        vi.mocked(
            (await import('@/store/useProjectDetailStore')).useProjectDetailStore
        ).mockImplementation((selector: (s: any) => any) =>
            selector({ activeGraphId: null, projectRootPath: '' })
        )
        const { result } = renderHook(() =>
            useGraphImport({ onSaveGraph: mockSaveGraph })
        )
        await act(async () => { await result.current.importGraph(payload) })
        expect(mockLoadGraph).not.toHaveBeenCalled()
    })

})