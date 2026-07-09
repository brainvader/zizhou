/**
 * toReactFlowNodes / toReactFlowEdges — ContextGraphNode/Edge を React Flow の Node/Edge に変換する
 *
 * @see src/bom/context-graph.ts
 */
import { describe, it, expect } from 'vitest'

import { toReactFlowNodes, toReactFlowEdges } from './graph-editor'
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
