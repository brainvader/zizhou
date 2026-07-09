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
})
