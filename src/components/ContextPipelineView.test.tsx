/**
 * ContextPipelineView — コンテキストの作業パイプラインを表示する
 *
 * @see docs/context/ContextMap.pipeline.html
 * @see src/bom/context-pipeline.ts
 */
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'

import { ContextPipelineView } from './ContextPipelineView'
import { DEFAULT_VISIBLE_CONTEXT_IDS } from '@/bom/workspace'
import type { ContextGraphNode } from '@/bom/context-graph'

const SELECTED_NODE: ContextGraphNode = {
    id: 'add-todo-form',
    contextId: 'todo',
    label: 'AddTodoForm',
    kind: 'component',
    describe: 'テキストを入力してTodoを追加する',
    checklist: [
        { label: '空文字では追加ボタンが disabled になる', done: false },
        { label: 'Enterキーで追加できる', done: true },
    ],
    position: { x: 0, y: 0 },
}

describe('コンテキストの作業パイプラインを表示する', () => {
    it('パンくずにアクティブコンテキスト名が表示される', () => {
        render(<ContextPipelineView visibleIds={['source']} />)
        expect(screen.getByTestId('pipeline-breadcrumb')).toHaveTextContent('ソース解析')
        expect(screen.getByTestId('pipeline-breadcrumb')).toHaveTextContent(
            'の作業パイプライン',
        )
    })

    it('Design / Task Splitting / Execution / Failure Handling の4ステージが表示される', () => {
        render(<ContextPipelineView visibleIds={['foundation']} />)
        expect(screen.getByTestId('pipeline-stage-design')).toBeInTheDocument()
        expect(screen.getByTestId('pipeline-stage-task-splitting')).toBeInTheDocument()
        expect(screen.getByTestId('pipeline-stage-execution')).toBeInTheDocument()
        expect(screen.getByTestId('pipeline-stage-failure-handling')).toBeInTheDocument()
        expect(screen.getByText('Design（設計）')).toBeInTheDocument()
        expect(screen.getByText('Task Splitting（契約定義）')).toBeInTheDocument()
        expect(screen.getByText('Execution（実装: Haiku）')).toBeInTheDocument()
        expect(screen.getByText('Failure Handling（失敗対応）')).toBeInTheDocument()
    })

    it('各ステージに status（done/doing/todo）が表示される', () => {
        render(<ContextPipelineView visibleIds={['foundation']} />)
        expect(screen.getByTestId('pipeline-stage-design')).toHaveAttribute(
            'data-status',
            'done',
        )
        expect(screen.getByTestId('pipeline-stage-task-splitting')).toHaveAttribute(
            'data-status',
            'doing',
        )
        expect(screen.getByTestId('pipeline-stage-execution')).toHaveAttribute(
            'data-status',
            'todo',
        )
        expect(screen.getByTestId('pipeline-stage-failure-handling')).toHaveAttribute(
            'data-status',
            'todo',
        )
    })

    it('visibleIds が空のとき空状態を表示する', () => {
        render(<ContextPipelineView visibleIds={[]} />)
        expect(screen.getByTestId('pipeline-empty')).toBeInTheDocument()
        expect(screen.queryByTestId('pipeline-stage-design')).not.toBeInTheDocument()
    })

    it('初期表示（foundation）では「グラフ基盤」のパイプラインになる', () => {
        render(
            <ContextPipelineView visibleIds={[...DEFAULT_VISIBLE_CONTEXT_IDS]} />,
        )
        expect(screen.getByTestId('pipeline-breadcrumb')).toHaveTextContent('グラフ基盤')
        expect(screen.getByTestId('pipeline-stage-design')).toBeInTheDocument()
        expect(screen.queryByTestId('pipeline-empty')).not.toBeInTheDocument()
    })

    it('selectedNode があるとき、静的な4ステージの代わりにそのノードの詳細（describe/criteria）を表示する', () => {
        render(<ContextPipelineView visibleIds={['todo']} selectedNode={SELECTED_NODE} />)

        const detail = screen.getByTestId('pipeline-node-detail')
        expect(detail).toBeInTheDocument()
        expect(detail).toHaveTextContent('AddTodoForm')
        expect(screen.getByText('テキストを入力してTodoを追加する')).toBeInTheDocument()

        const done = screen.getByText('Enterキーで追加できる')
        const notDone = screen.getByText('空文字では追加ボタンが disabled になる')
        expect(done.parentElement?.querySelector('input[type="checkbox"]')).toBeChecked()
        expect(notDone.parentElement?.querySelector('input[type="checkbox"]')).not.toBeChecked()

        expect(screen.queryByTestId('pipeline-stage-design')).not.toBeInTheDocument()
    })

    it('selectedNode のパンくずにノード名まで表示される', () => {
        render(<ContextPipelineView visibleIds={['todo']} selectedNode={SELECTED_NODE} />)
        expect(screen.getByTestId('pipeline-breadcrumb')).toHaveTextContent('AddTodoForm')
    })

    it('selectedNode に checklist が無くてもエラーにならない', () => {
        const node: ContextGraphNode = { ...SELECTED_NODE, checklist: undefined }
        render(<ContextPipelineView visibleIds={['todo']} selectedNode={node} />)
        expect(screen.getByTestId('pipeline-node-detail')).toBeInTheDocument()
    })
})