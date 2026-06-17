import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SourceNode } from './SourceNode'
import type { SourceNodeProps } from '@/bom/source-graph'

// ReactFlow Handle を使う外部ライブラリのためモックする。
// 視覚的な動作確認は SourceNode.stories.tsx に委ねる。
vi.mock('@xyflow/react', () => ({
    Handle: () => null,
    Position: { Left: 'left', Right: 'right' },
}))

const makeProps = (overrides: Partial<SourceNodeProps['data']> = {}): SourceNodeProps => ({
    id: 'node-1',
    type: 'sourceNode',
    data: {
        label: 'App.tsx',
        filePath: 'src/App.tsx',
        analyzed: 'fresh',
        displayStatus: 'fresh',
        ...overrides,
    },
    selected: false,
    dragging: false,
    draggable: true,
    selectable: true,
    deletable: true,
    isConnectable: true,
    positionAbsoluteX: 0,
    positionAbsoluteY: 0,
    zIndex: 0,
})

describe('SourceNode', () => {
    it('ラベルが表示される', () => {
        render(<SourceNode {...makeProps()} />)
        expect(screen.getByText('App.tsx')).toBeInTheDocument()
    })

    it('filePath と onReanalyze があるとき ↺ ボタンが表示される', () => {
        const onReanalyze = vi.fn()
        render(<SourceNode {...makeProps({ onReanalyze })} />)
        expect(screen.getByTestId('reanalyze-node-src-App.tsx')).toBeInTheDocument()
    })

    it('↺ ボタンをクリックすると onReanalyze(filePath) が呼ばれる', () => {
        const onReanalyze = vi.fn()
        render(<SourceNode {...makeProps({ onReanalyze })} />)
        fireEvent.click(screen.getByTestId('reanalyze-node-src-App.tsx'))
        expect(onReanalyze).toHaveBeenCalledWith('src/App.tsx')
    })

    it('onReanalyze がないとき ↺ ボタンが表示されない', () => {
        render(<SourceNode {...makeProps({ onReanalyze: undefined })} />)
        expect(screen.queryByTestId('reanalyze-node-src-App.tsx')).not.toBeInTheDocument()
    })

    it('displayStatus=stale のとき "stale" ラベルが表示される', () => {
        render(<SourceNode {...makeProps({ displayStatus: 'stale' })} />)
        expect(screen.getByText('stale')).toBeInTheDocument()
    })

    it('displayStatus=pending のとき "pending" ラベルが表示される', () => {
        render(<SourceNode {...makeProps({ displayStatus: 'pending' })} />)
        expect(screen.getByText('pending')).toBeInTheDocument()
    })

    it('displayStatus=fresh のとき ステータスラベルが表示されない', () => {
        render(<SourceNode {...makeProps({ displayStatus: 'fresh' })} />)
        expect(screen.queryByText('fresh')).not.toBeInTheDocument()
    })

    it('selected=true のとき data-selected 属性が付く', () => {
        const props = { ...makeProps(), selected: true }
        render(<SourceNode {...props} />)
        expect(screen.getByTestId('source-node-src-App.tsx')).toHaveAttribute('data-selected')
    })
})