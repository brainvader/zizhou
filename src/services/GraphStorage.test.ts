import { describe, it, expect, vi, beforeEach } from 'vitest'
import { defaultGraphStorage } from './GraphStorage'

// invoke は Tauri ネイティブ API のためモックする
const { mockInvoke } = vi.hoisted(() => ({ mockInvoke: vi.fn() }))
vi.mock('@tauri-apps/api/core', () => ({ invoke: mockInvoke }))

beforeEach(() => vi.clearAllMocks())

describe('GraphStorage インターフェースを満たす', () => {
    it('listGraphs は list_graphs を呼び GraphListItem[] を返す', async () => {
        mockInvoke.mockResolvedValue([{ id: 'graph:001', name: 'Main', project_id: 'proj:001' }])
        const result = await defaultGraphStorage.listGraphs('proj:001')
        expect(mockInvoke).toHaveBeenCalledWith('list_graphs', { projectId: 'proj:001' })
        expect(result).toEqual([{ id: 'graph:001', name: 'Main' }])
    })

    it('createGraph は create_graph を呼び GraphListItem を返す', async () => {
        mockInvoke.mockResolvedValue({ id: 'graph:002', name: 'New Graph', project_id: 'proj:001' })
        const result = await defaultGraphStorage.createGraph('proj:001', 'New Graph')
        expect(mockInvoke).toHaveBeenCalledWith('create_graph', { projectId: 'proj:001', name: 'New Graph' })
        expect(result).toEqual({ id: 'graph:002', name: 'New Graph' })
    })

    it('saveGraph は save_graph を nodes/edges のフラット形式で呼ぶ', async () => {
        mockInvoke.mockResolvedValue(undefined)
        await defaultGraphStorage.saveGraph(
            'graph:001',
            [{ id: 'n1', type: 'editableNode', position: { x: 10, y: 20 }, data: { label: 'A' } }],
            [{ id: 'e1', source: 'n1', target: 'n2' }]
        )
        expect(mockInvoke).toHaveBeenCalledWith('save_graph', {
            graphId: 'graph:001',
            nodes: [expect.objectContaining({ id: 'n1', position_x: 10, position_y: 20 })],
            edges: [{ id: 'e1', source: 'n1', target: 'n2' }],
        })
    })

    it('loadGraph は load_graph を呼び GraphFile を返す', async () => {
        mockInvoke.mockResolvedValue({ id: 'graph:001', nodes: [], edges: [] })
        const result = await defaultGraphStorage.loadGraph('graph:001')
        expect(mockInvoke).toHaveBeenCalledWith('load_graph', { graphId: 'graph:001' })
        expect(result.id).toBe('graph:001')
    })

    it('getStructureGraph は get_structure_graph を呼び GraphFile を返す', async () => {
        mockInvoke.mockResolvedValue({ id: 'graph:structure', nodes: [], edges: [] })
        const result = await defaultGraphStorage.getStructureGraph('proj:001')
        expect(mockInvoke).toHaveBeenCalledWith('get_structure_graph', { projectId: 'proj:001' })
        expect(result.id).toBe('graph:structure')
    })
})