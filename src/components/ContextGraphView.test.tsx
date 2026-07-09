/**
 * ContextGraphView — 可視コンテキストのグラフを表示する
 *
 * @see docs/context/ContextMap.graph.html
 * @see src/bom/context-graph.ts
 */
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'

import { ContextGraphView } from './ContextGraphView'
import { DEFAULT_VISIBLE_CONTEXT_IDS } from '@/bom/workspace'

describe('可視コンテキストのグラフを表示する', () => {
    it('visibleIds に含まれるコンテキストのノードが表示される', () => {
        render(<ContextGraphView visibleIds={['foundation', 'source']} />)
        expect(screen.getByTestId('graph-node-foundation')).toBeInTheDocument()
        expect(screen.getByTestId('graph-node-source')).toBeInTheDocument()
    })

    it('visibleIds に含まれないコンテキストのノードは非表示', () => {
        render(<ContextGraphView visibleIds={['foundation']} />)
        expect(screen.getByTestId('graph-node-foundation')).toBeInTheDocument()
        expect(screen.queryByTestId('graph-node-source')).not.toBeInTheDocument()
        expect(screen.queryByTestId('graph-node-project')).not.toBeInTheDocument()
        expect(screen.queryByTestId('graph-node-taskflow-add-todo')).not.toBeInTheDocument()
    })

    it('エッジは require した全コンテキストが可視のときだけ表示される', () => {
        const { rerender } = render(
            <ContextGraphView visibleIds={['foundation']} />,
        )
        expect(screen.queryByTestId('graph-edge-foundation-source')).not.toBeInTheDocument()

        rerender(<ContextGraphView visibleIds={['foundation', 'source']} />)
        expect(screen.getByTestId('graph-edge-foundation-source')).toBeInTheDocument()
    })

    it('可視ノードが無いとき空状態メッセージを表示する', () => {
        render(<ContextGraphView visibleIds={[]} />)
        expect(screen.getByTestId('graph-empty')).toHaveTextContent(
            '表示中のコンテクストがありません',
        )
        expect(screen.queryByTestId('graph-node-foundation')).not.toBeInTheDocument()
    })

    it('初期表示（foundation のみ）ではグラフ基盤ノードが見える', () => {
        render(
            <ContextGraphView visibleIds={[...DEFAULT_VISIBLE_CONTEXT_IDS]} />,
        )
        expect(screen.getByTestId('graph-node-foundation')).toBeInTheDocument()
        expect(screen.getByText('グラフ基盤')).toBeInTheDocument()
        expect(screen.queryByTestId('graph-empty')).not.toBeInTheDocument()
    })
})
