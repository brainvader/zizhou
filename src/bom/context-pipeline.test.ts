/**
 * context-pipeline — パイプライン SSOT / レイアウト変換
 *
 * @see docs/context/ContextMap.pipeline.html
 * @see src/bom/context-pipeline.ts
 */
import { describe, it, expect } from 'vitest'

import {
    CONTEXT_PIPELINE_STAGES,
    labelForContextId,
    resolveActiveContextId,
    toPipelineFlow,
    type PipelineStage,
} from './context-pipeline'

describe('アクティブコンテキストを決定する', () => {
    it('Contexts セクションの可視 ID を優先する', () => {
        expect(resolveActiveContextId(['foundation', 'todo'])).toBe('foundation')
        expect(resolveActiveContextId(['source'])).toBe('source')
    })

    it('Contexts が無く UI だけなら UI を返す', () => {
        expect(resolveActiveContextId(['todo'])).toBe('todo')
    })

    it('空のとき null を返す', () => {
        expect(resolveActiveContextId([])).toBeNull()
    })
})

describe('コンテキスト ID の表示ラベル', () => {
    it('サイドバー定義のラベルを返す', () => {
        expect(labelForContextId('foundation')).toBe('グラフ基盤')
        expect(labelForContextId('source')).toBe('ソース解析')
    })
})

describe('PipelineStage[] を React Flow の Node/Edge に変換する', () => {
    it('4ステージ分のノードと隣接エッジを返す', () => {
        const { nodes, edges } = toPipelineFlow(CONTEXT_PIPELINE_STAGES)
        expect(nodes.map((n) => n.id)).toEqual([
            'design',
            'task-splitting',
            'execution',
            'failure-handling',
        ])
        expect(edges).toEqual([
            {
                id: 'design-task-splitting',
                source: 'design',
                target: 'task-splitting',
                sourceHandle: 'bottom',
                targetHandle: 'top',
            },
            {
                id: 'task-splitting-execution',
                source: 'task-splitting',
                target: 'execution',
                sourceHandle: 'bottom',
                targetHandle: 'top',
            },
            {
                id: 'execution-failure-handling',
                source: 'execution',
                target: 'failure-handling',
                sourceHandle: 'bottom',
                targetHandle: 'top',
            },
        ])
    })

    it('ノードは縦一列（x=0）で、checklist が多いほど次の y が大きくなる', () => {
        const stages: PipelineStage[] = [
            {
                id: 'a',
                title: 'A',
                status: 'done',
                description: 'short',
            },
            {
                id: 'b',
                title: 'B',
                status: 'doing',
                description: 'with checklist',
                checklist: [
                    { label: 'one', done: true },
                    { label: 'two', done: false },
                    { label: 'three', done: false },
                ],
            },
            {
                id: 'c',
                title: 'C',
                status: 'todo',
                description: 'after tall',
            },
        ]
        const { nodes } = toPipelineFlow(stages)
        expect(nodes.every((n) => n.position.x === 0)).toBe(true)
        expect(nodes[0].position.y).toBe(0)
        expect(nodes[1].position.y).toBeGreaterThan(nodes[0].position.y)
        // b は checklist 3件なので、b→c の間隔は a→b より大きい
        const gapAb = nodes[1].position.y - nodes[0].position.y
        const gapBc = nodes[2].position.y - nodes[1].position.y
        expect(gapBc).toBeGreaterThan(gapAb)
    })

    it('空配列のとき nodes/edges も空', () => {
        expect(toPipelineFlow([])).toEqual({ nodes: [], edges: [] })
    })
})
