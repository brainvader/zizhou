/**
 * toPipelineFlow — PipelineStage[] を React Flow の Node[]/Edge[] に変換する
 *
 * @see src/bom/context-pipeline.ts
 */
import { describe, it, expect } from 'vitest'
import { toPipelineFlow, CONTEXT_PIPELINE_STAGES } from './context-pipeline'

describe('PipelineStage[]をReact Flow用のNode[]/Edge[]に変換する', () => {
    it('各ステージにつき1ノードを作り、type: stageで振り分ける', () => {
        const { nodes } = toPipelineFlow(CONTEXT_PIPELINE_STAGES)
        expect(nodes).toHaveLength(4)
        expect(nodes[0]).toMatchObject({ id: 'design', type: 'stage' })
        expect(nodes[0].data.stage).toBe(CONTEXT_PIPELINE_STAGES[0])
    })

    it('隣接するステージ間に1本ずつedgeを張る（4ステージ→3エッジ）', () => {
        const { edges } = toPipelineFlow(CONTEXT_PIPELINE_STAGES)
        expect(edges).toEqual([
            { id: 'design-task-splitting', source: 'design', target: 'task-splitting' },
            { id: 'task-splitting-execution', source: 'task-splitting', target: 'execution' },
            { id: 'execution-failure-handling', source: 'execution', target: 'failure-handling' },
        ])
    })

    it('各ノードにstyle経由で固定幅が設定される（無いと既定の極小サイズで描画され枠が壊れる）', () => {
        const { nodes } = toPipelineFlow(CONTEXT_PIPELINE_STAGES)
        for (const node of nodes) {
            expect(node.style.width).toBeGreaterThan(0)
        }
    })

    it('全ノードに有限のpositionが設定される（縦一列）', () => {
        const { nodes } = toPipelineFlow(CONTEXT_PIPELINE_STAGES)
        for (const node of nodes) {
            expect(Number.isFinite(node.position.x)).toBe(true)
            expect(Number.isFinite(node.position.y)).toBe(true)
        }
        // 縦一列なのでx座標は全ノード共通
        expect(new Set(nodes.map((n) => n.position.x)).size).toBe(1)
    })

    it('ステージが1件のときedgeは空', () => {
        const { edges } = toPipelineFlow([CONTEXT_PIPELINE_STAGES[0]])
        expect(edges).toEqual([])
    })

    it('checklistが多いステージの直後は、その分y間隔が広がる（重なり防止）', () => {
        const short = CONTEXT_PIPELINE_STAGES[0] // checklistなし
        const long = {
            ...CONTEXT_PIPELINE_STAGES[1],
            checklist: [
                { label: 'a', done: false },
                { label: 'b', done: false },
                { label: 'c', done: false },
                { label: 'd', done: false },
            ],
        }
        const next = CONTEXT_PIPELINE_STAGES[2]

        const { nodes: shortCase } = toPipelineFlow([short, next])
        const { nodes: longCase } = toPipelineFlow([long, next])

        const gapShort = shortCase[1].position.y - shortCase[0].position.y
        const gapLong = longCase[1].position.y - longCase[0].position.y
        expect(gapLong).toBeGreaterThan(gapShort)
    })
})