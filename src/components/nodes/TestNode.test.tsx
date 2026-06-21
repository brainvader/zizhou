import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TestNode } from './TestNode'
import type { TestNodeProps } from '@/bom/source-graph'

// ReactFlow Handle を使う外部ライブラリのためモックする。
// 視覚的な動作確認は TestNode.stories.tsx に委ねる。
vi.mock('@xyflow/react', () => ({
    Handle: () => null,
    Position: { Left: 'left', Right: 'right' },
}))

const makeProps = (overrides: Partial<TestNodeProps['data']> = {}): TestNodeProps => ({
    id: 'test-node-1',
    type: 'testNode',
    data: {
        label: 'App.test.tsx',
        filePath: 'src/App.test.tsx',
        analyzed: 'fresh',
        nodeType: 'test',
        displayStatus: 'fresh',
        suiteCount: 2,
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

describe('テストノードを操作する', () => {
    it('ラベルが表示される', () => {
        render(<TestNode {...makeProps()} />)
        expect(screen.getByText('App.test.tsx')).toBeInTheDocument()
    })

    it('suiteCount が 1 以上のときバッジが表示される', () => {
        render(<TestNode {...makeProps({ suiteCount: 3 })} />)
        expect(screen.getByText('3')).toBeInTheDocument()
    })

    it('suiteCount が 0 のときバッジが表示されない', () => {
        render(<TestNode {...makeProps({ suiteCount: 0 })} />)
        expect(screen.queryByText('0')).not.toBeInTheDocument()
    })

    it('suiteCount が undefined のときバッジが表示されない', () => {
        render(<TestNode {...makeProps({ suiteCount: undefined })} />)
        expect(screen.queryByText('0')).not.toBeInTheDocument()
    })

    it('↺ ボタンをクリックすると onReanalyze(filePath) が呼ばれる', () => {
        const onReanalyze = vi.fn()
        render(<TestNode {...makeProps({ onReanalyze })} />)
        fireEvent.click(screen.getByTestId('reanalyze-test-node-src-App.test.tsx'))
        expect(onReanalyze).toHaveBeenCalledWith('src/App.test.tsx')
    })

    it('onReanalyze がないとき ↺ ボタンが表示されない', () => {
        render(<TestNode {...makeProps({ onReanalyze: undefined })} />)
        expect(screen.queryByTestId('reanalyze-test-node-src-App.test.tsx')).not.toBeInTheDocument()
    })

    it('onRunTest が渡されたとき ▶ ボタンが表示されクリックで呼ばれる', () => {
        const onRunTest = vi.fn()
        render(<TestNode {...makeProps({ onRunTest })} />)
        fireEvent.click(screen.getByTestId('run-test-node-src-App.test.tsx'))
        expect(onRunTest).toHaveBeenCalledWith('src/App.test.tsx')
    })

    it('onRunTest がないとき ▶ ボタンが表示されない', () => {
        render(<TestNode {...makeProps({ onRunTest: undefined })} />)
        expect(screen.queryByTestId('run-test-node-src-App.test.tsx')).not.toBeInTheDocument()
    })

    it('selected=true のとき data-selected 属性が付く', () => {
        const props = { ...makeProps(), selected: true }
        render(<TestNode {...props} />)
        expect(screen.getByTestId('test-node-src-App.test.tsx')).toHaveAttribute('data-selected')
    })

    it('displayStatus=stale のとき "stale" ラベルが表示される', () => {
        render(<TestNode {...makeProps({ displayStatus: 'stale' })} />)
        expect(screen.getByText('stale')).toBeInTheDocument()
    })

    it('displayStatus=fresh のときステータスラベルが表示されない', () => {
        render(<TestNode {...makeProps({ displayStatus: 'fresh' })} />)
        expect(screen.queryByText('fresh')).not.toBeInTheDocument()
    })
})