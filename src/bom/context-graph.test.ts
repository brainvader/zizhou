/**
 * toCustomNodeData — ContextGraphNode を CustomNode 用の narrow な data 型に変換する
 *
 * @see src/bom/context-graph.ts
 */
import { describe, it, expect } from 'vitest'

import { toCustomNodeData, type ContextGraphNode } from './context-graph'

describe('ContextGraphNode を CustomNode 用の narrow な data 型に変換する', () => {
    it('kind が component のとき ComponentNodeData を返す', () => {
        const node: ContextGraphNode = {
            id: 'add-todo-form',
            contextId: 'todo',
            label: 'AddTodoForm',
            kind: 'component',
            position: { x: 0, y: 0 },
        }
        expect(toCustomNodeData(node)).toEqual({
            id: 'add-todo-form',
            contextId: 'todo',
            label: 'AddTodoForm',
            kind: 'component',
        })
    })

    it('kind が feature のとき checklist を含む FeatureNodeData を返す', () => {
        const node: ContextGraphNode = {
            id: 'foundation',
            contextId: 'foundation',
            label: 'グラフ基盤',
            kind: 'feature',
            position: { x: 0, y: 0 },
            checklist: [{ label: 'SurrealDBのnode/edgeスキーマを定義する', done: true }],
        }
        expect(toCustomNodeData(node)).toEqual({
            id: 'foundation',
            contextId: 'foundation',
            label: 'グラフ基盤',
            kind: 'feature',
            checklist: [{ label: 'SurrealDBのnode/edgeスキーマを定義する', done: true }],
        })
    })

    it('kind が feature で checklist が無いとき空配列にフォールバックする', () => {
        const node: ContextGraphNode = {
            id: 'no-checklist',
            contextId: 'foundation',
            label: 'no checklist',
            kind: 'feature',
            position: { x: 0, y: 0 },
        }
        expect(toCustomNodeData(node)).toEqual({
            id: 'no-checklist',
            contextId: 'foundation',
            label: 'no checklist',
            kind: 'feature',
            checklist: [],
        })
    })

    it('kind が hook/external/state のとき checklist を含まない', () => {
        const node: ContextGraphNode = {
            id: 'use-todo-store',
            contextId: 'todo',
            label: 'useTodoStore',
            kind: 'hook',
            position: { x: 0, y: 0 },
        }
        const result = toCustomNodeData(node)
        expect(result).toEqual({
            id: 'use-todo-store',
            contextId: 'todo',
            label: 'useTodoStore',
            kind: 'hook',
        })
        expect('checklist' in result).toBe(false)
    })
})
