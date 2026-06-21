import { describe, it, expect, beforeEach } from 'vitest'
import { useProjectStore } from './useProjectStore'
import { useProjectDetailStore } from './useProjectDetailStore'
import { useGraphStore } from './useGraphStore'

// ── useProjectStore ──────────────────────────────────────────

describe('useProjectStore', () => {
    beforeEach(() => {
        useProjectStore.setState({ projects: [], isHydrated: false })
    })

    it('初期状態は projects=[] / isHydrated=false', () => {
        const { projects, isHydrated } = useProjectStore.getState()
        expect(projects).toEqual([])
        expect(isHydrated).toBe(false)
    })

    it('setProjects でプロジェクト一覧を更新する', () => {
        const projects = [{ id: '1', name: 'Zizhou', rootPath: '/projects/zizhou', description: '' }]
        useProjectStore.getState().setProjects(projects)
        expect(useProjectStore.getState().projects).toEqual(projects)
    })

    it('addProject でプロジェクトを追加する', () => {
        const project = { id: '1', name: 'Zizhou', rootPath: '/projects/zizhou', description: '' }
        useProjectStore.getState().addProject(project)
        expect(useProjectStore.getState().projects).toHaveLength(1)
        expect(useProjectStore.getState().projects[0]).toEqual(project)
    })

    it('setHydrated で isHydrated を更新する', () => {
        useProjectStore.getState().setHydrated(true)
        expect(useProjectStore.getState().isHydrated).toBe(true)
    })
})

// ── useProjectDetailStore ────────────────────────────────────

describe('useProjectDetailStore', () => {
    beforeEach(() => {
        useProjectDetailStore.setState({
            activeGraphId: null,
            initStatus: 'checking',
            projectRootPath: '',
            isDetailHydrated: false,
            selectedTestFilePath: null,
        })
    })

    it('初期状態が正しい', () => {
        const state = useProjectDetailStore.getState()
        expect(state.activeGraphId).toBeNull()
        expect(state.isDetailHydrated).toBe(false)
        expect(state.selectedTestFilePath).toBeNull()
    })

    it('setActiveGraphId で activeGraphId を更新する', () => {
        useProjectDetailStore.getState().setActiveGraphId('graph:001')
        expect(useProjectDetailStore.getState().activeGraphId).toBe('graph:001')
    })

    it('setDetailHydrated で isDetailHydrated を更新する', () => {
        useProjectDetailStore.getState().setDetailHydrated(true)
        expect(useProjectDetailStore.getState().isDetailHydrated).toBe(true)
    })

    it('setSelectedTestFilePath で selectedTestFilePath を更新する', () => {
        useProjectDetailStore.getState().setSelectedTestFilePath('src/App.test.tsx')
        expect(useProjectDetailStore.getState().selectedTestFilePath).toBe('src/App.test.tsx')
    })
})

// ── useGraphStore ────────────────────────────────────────────

describe('useGraphStore', () => {
    beforeEach(() => {
        useGraphStore.getState().resetGraph()
    })

    it('resetGraph で nodes / edges / selectedNodeId がリセットされる', () => {
        const state = useGraphStore.getState()
        expect(state.nodes).toEqual([])
        expect(state.edges).toEqual([])
        expect(state.selectedNodeId).toBeNull()
    })

    it('loadGraph でノードとエッジが設定される', () => {
        useGraphStore.getState().loadGraph({
            id: 'graph:001',
            nodes: [{ id: 'n1', type: 'editableNode', position: { x: 0, y: 0 }, data: { label: 'A' } }],
            edges: [{ id: 'e1', source: 'n1', target: 'n2' }],
        })
        expect(useGraphStore.getState().nodes).toHaveLength(1)
        expect(useGraphStore.getState().edges).toHaveLength(1)
    })

    it('setSelectedNodeIds で selectedNodeId が更新される（1件のとき）', () => {
        useGraphStore.getState().setSelectedNodeIds(['n1'])
        expect(useGraphStore.getState().selectedNodeId).toBe('n1')
    })

    it('setSelectedNodeIds が空のとき selectedNodeId は null になる', () => {
        useGraphStore.getState().setSelectedNodeIds([])
        expect(useGraphStore.getState().selectedNodeId).toBeNull()
    })

    it('updateNodeData で指定ノードのデータを更新する', () => {
        useGraphStore.getState().loadGraph({
            id: 'graph:001',
            nodes: [{ id: 'n1', type: 'editableNode', position: { x: 0, y: 0 }, data: { label: 'A' } }],
            edges: [],
        })
        useGraphStore.getState().updateNodeData('n1', { label: 'B' })
        expect(useGraphStore.getState().nodes[0].data.label).toBe('B')
    })
})