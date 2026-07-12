/**
 * PipelineStageNode — React Flow用のPipelineStageカスタムノード
 *
 * @see src/bom/context-pipeline.ts
 */
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ReactFlowProvider } from '@xyflow/react'
import { PipelineStageNode } from './PipelineStageNode'
import type { PipelineStage } from '@/bom/context-pipeline'
import type { NodeProps } from '@xyflow/react'
import type { PipelineStageNodeType } from './PipelineStageNode'

const STAGE: PipelineStage = {
    id: 'task-splitting',
    title: 'Task Splitting（契約定義）',
    status: 'doing',
    description: 'Sonnetがdescribe/criteriaを契約として書き出す。',
    checklist: [
        { label: 'SurrealDBのnode/edgeスキーマを定義する', done: true },
        { label: 'React Flowでグラフを描画する', done: false },
    ],
}

function renderNode(stage: PipelineStage) {
    const props = {
        data: { stage },
        selected: false,
    } as unknown as NodeProps<PipelineStageNodeType>
    return render(
        <ReactFlowProvider>
            <PipelineStageNode {...props} />
        </ReactFlowProvider>,
    )
}

describe('PipelineStageのカスタムノード', () => {
    it('タイトル・ステータス・descriptionが表示される', () => {
        renderNode(STAGE)
        expect(screen.getByText('Task Splitting（契約定義）')).toBeInTheDocument()
        expect(screen.getByText('doing')).toBeInTheDocument()
        expect(
            screen.getByText('Sonnetがdescribe/criteriaを契約として書き出す。'),
        ).toBeInTheDocument()
    })

    it('checklistがチェックボックスとして表示される', () => {
        renderNode(STAGE)
        const done = screen.getByText('SurrealDBのnode/edgeスキーマを定義する')
        const notDone = screen.getByText('React Flowでグラフを描画する')
        expect(done.parentElement?.querySelector('input[type="checkbox"]')).toBeChecked()
        expect(notDone.parentElement?.querySelector('input[type="checkbox"]')).not.toBeChecked()
    })

    it('data-testidにステージidが含まれ、data-statusにステータスが入る', () => {
        renderNode(STAGE)
        const el = screen.getByTestId('pipeline-stage-task-splitting')
        expect(el).toHaveAttribute('data-status', 'doing')
    })

    it('checklistが無いステージでもエラーにならない', () => {
        const noChecklist: PipelineStage = {
            id: 'design',
            title: 'Design（設計）',
            status: 'done',
            description: '人間とSonnetの対話で要件を固める。',
        }
        renderNode(noChecklist)
        expect(screen.getByTestId('pipeline-stage-design')).toBeInTheDocument()
    })
})