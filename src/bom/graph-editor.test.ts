/**
 * toReactFlowNodes / toReactFlowEdges — ContextGraphNode/Edge を React Flow の Node/Edge に変換する
 *
 * @see src/bom/context-graph.ts
 */
import { describe, it, expect } from 'vitest'

import { toReactFlowNodes, toReactFlowEdges, reconcileNodes, pickHandleIds } from './graph-editor'
import { CONTEXT_GRAPH_NODES, CONTEXT_GRAPH_EDGES } from './context-graph'

describe('ContextGraphNode を React Flow の Node に変換する', () => {
    it('foundation のみ可視のとき foundation ノードのみ返す', () => {
        const result = toReactFlowNodes(CONTEXT_GRAPH_NODES, ['foundation'])
        expect(result).toHaveLength(1)
        expect(result[0].id).toBe('foundation')
    })

    it('ノードの type は kind と一致する', () => {
        const result = toReactFlowNodes(CONTEXT_GRAPH_NODES, ['todo'])
        const addTodoForm = result.find((n) => n.id === 'add-todo-form')
        expect(addTodoForm?.type).toBe('component')
    })

    it('width が指定されているノードは style.width に変換される', () => {
        const result = toReactFlowNodes(CONTEXT_GRAPH_NODES, ['foundation'])
        expect(result[0].style).toEqual({ width: 190 })
    })

    it('可視ノードが無いとき空配列を返す', () => {
        expect(toReactFlowNodes(CONTEXT_GRAPH_NODES, [])).toEqual([])
    })
})

describe('ContextGraphEdge を React Flow の Edge に変換する', () => {
    it('両端が可視でないときエッジを返さない', () => {
        const result = toReactFlowEdges(CONTEXT_GRAPH_EDGES, CONTEXT_GRAPH_NODES, [
            'foundation',
        ])
        expect(result).toEqual([])
    })

    it('両端が可視のときエッジを返す', () => {
        const result = toReactFlowEdges(CONTEXT_GRAPH_EDGES, CONTEXT_GRAPH_NODES, [
            'foundation',
            'source',
        ])
        expect(result).toHaveLength(1)
        expect(result[0]).toMatchObject({
            id: 'foundation-source',
            source: 'foundation',
            target: 'source',
            sourceHandle: 'right',
            targetHandle: 'left',
        })
    })

    it('todo グループが可視のとき todo 内の全エッジ(6本)が返る', () => {
        const result = toReactFlowEdges(CONTEXT_GRAPH_EDGES, CONTEXT_GRAPH_NODES, [
            'todo',
        ])
        expect(result).toHaveLength(6)
    })

    it('dashed のエッジは strokeDasharray スタイルを持つ', () => {
        const result = toReactFlowEdges(CONTEXT_GRAPH_EDGES, CONTEXT_GRAPH_NODES, [
            'todo',
        ])
        const dashedEdge = result.find((e) => e.id === 'todo-store-to-global')
        expect(dashedEdge?.style).toEqual({ strokeDasharray: '3 3' })
    })

    it('dashed でないエッジは style を持たない', () => {
        const result = toReactFlowEdges(CONTEXT_GRAPH_EDGES, CONTEXT_GRAPH_NODES, [
            'foundation',
            'source',
        ])
        expect(result[0].style).toBeUndefined()
    })
})

describe('ノードid集合の変化に基づいて state を再利用するか判定する', () => {
    it('id集合が同じなら prevNodes（ドラッグ後の位置）を維持する', () => {
        const prevNodes = [{ id: 'a', position: { x: 999, y: 999 } }]
        const nextNodes = [{ id: 'a', position: { x: 0, y: 0 } }]
        expect(reconcileNodes(prevNodes, nextNodes)).toBe(prevNodes)
    })

    it('id集合が異なるなら nextNodes（新しい配列）に切り替える', () => {
        const prevNodes = [{ id: 'a', position: { x: 999, y: 999 } }]
        const nextNodes = [{ id: 'b', position: { x: 0, y: 0 } }]
        expect(reconcileNodes(prevNodes, nextNodes)).toBe(nextNodes)
    })

    it('id集合の順序も一致している必要がある', () => {
        const prevNodes = [{ id: 'a' }, { id: 'b' }]
        const nextNodes = [{ id: 'b' }, { id: 'a' }]
        expect(reconcileNodes(prevNodes, nextNodes)).toBe(nextNodes)
    })

    it('prevNodes が空でも next が空なら prevNodes を維持する', () => {
        const prevNodes: { id: string }[] = []
        const nextNodes: { id: string }[] = []
        expect(reconcileNodes(prevNodes, nextNodes)).toBe(prevNodes)
    })
})

describe('ノードの相対位置から接続に使う4方向のHandleを選ぶ', () => {
    const node = (x: number, y: number, width = 100) => ({
        id: 'n',
        contextId: 'foundation' as const,
        label: 'n',
        kind: 'component' as const,
        position: { x, y },
        width,
    })

    it('target が右にあるとき right/left を選ぶ', () => {
        expect(pickHandleIds(node(0, 0), node(300, 0))).toEqual({
            sourceHandle: 'right',
            targetHandle: 'left',
        })
    })

    it('target が左にあるとき left/right を選ぶ', () => {
        expect(pickHandleIds(node(300, 0), node(0, 0))).toEqual({
            sourceHandle: 'left',
            targetHandle: 'right',
        })
    })

    it('target が下にあるとき bottom/top を選ぶ', () => {
        expect(pickHandleIds(node(0, 0), node(0, 300))).toEqual({
            sourceHandle: 'bottom',
            targetHandle: 'top',
        })
    })

    it('target が上にあるとき top/bottom を選ぶ', () => {
        expect(pickHandleIds(node(0, 300), node(0, 0))).toEqual({
            sourceHandle: 'top',
            targetHandle: 'bottom',
        })
    })

    it('dxとdyが同じ大きさのときは水平方向を優先する', () => {
        expect(pickHandleIds(node(0, 0), node(200, 200))).toEqual({
            sourceHandle: 'right',
            targetHandle: 'left',
        })
    })

    it('実データ(foundation→project)でも妥当な方向を選ぶ', () => {
        const foundation = CONTEXT_GRAPH_NODES.find((n) => n.id === 'foundation')!
        const project = CONTEXT_GRAPH_NODES.find((n) => n.id === 'project')!
        const result = pickHandleIds(foundation, project)
        expect(['top', 'right', 'bottom', 'left']).toContain(result.sourceHandle)
        expect(['top', 'right', 'bottom', 'left']).toContain(result.targetHandle)
    })
})
