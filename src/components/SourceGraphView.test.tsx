import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { SourceGraphView } from './SourceGraphView'
import type { RelatedNodes } from '@/bom/source-graph'

// ReactFlow はレンダリングを持つ外部ライブラリのためモックする。
// 視覚的な動作確認は SourceGraphView.stories.tsx に委ねる。
vi.mock('@xyflow/react', () => ({
    ReactFlow: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    ReactFlowProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    Background: () => null,
    Controls: () => null,
    applyNodeChanges: vi.fn((_changes: unknown, nodes: unknown) => nodes),
    useReactFlow: () => ({ fitView: vi.fn() }),
}))

const EMPTY_STALE = new Set<string>()

const CENTER: RelatedNodes['center'] = {
    id: 'node:src/App.test.tsx',
    type: 'testNode',
    position: { x: 0, y: 0 },
    data: { label: 'App.test.tsx', filePath: 'src/App.test.tsx', analyzed: 'fresh', nodeType: 'test' },
}

const RELATED: RelatedNodes = { center: CENTER, dependencies: [], dependents: [] }

describe('テストファイルを選択して依存グラフを確認する', () => {
    it('テストファイル未選択のとき taac-empty-state が表示される', async () => {
        render(
            <SourceGraphView
                nodes={[]}
                edges={[]}
                staleFiles={EMPTY_STALE}
                selectedFilePath={null}
                onGetRelatedNodes={vi.fn()}
                onNodeSelect={vi.fn()}
                onNodesChange={vi.fn()}
            />
        )
        await waitFor(() =>
            expect(screen.getByTestId('taac-empty-state')).toBeInTheDocument()
        )
    })

    it('テストファイル以外が selectedFilePath に渡されても onGetRelatedNodes は呼ばれない', async () => {
        const onGetRelatedNodes = vi.fn()
        render(
            <SourceGraphView
                nodes={[]}
                edges={[]}
                staleFiles={EMPTY_STALE}
                selectedFilePath="src/App.tsx"
                onGetRelatedNodes={onGetRelatedNodes}
                onNodeSelect={vi.fn()}
                onNodesChange={vi.fn()}
            />
        )
        await waitFor(() =>
            expect(screen.getByTestId('taac-empty-state')).toBeInTheDocument()
        )
        expect(onGetRelatedNodes).not.toHaveBeenCalled()
    })

    it('テストファイルを選択すると onGetRelatedNodes が呼ばれる', async () => {
        const onGetRelatedNodes = vi.fn().mockResolvedValue(RELATED)
        render(
            <SourceGraphView
                nodes={[]}
                edges={[]}
                staleFiles={EMPTY_STALE}
                selectedFilePath="src/App.test.tsx"
                onGetRelatedNodes={onGetRelatedNodes}
                onNodeSelect={vi.fn()}
                onNodesChange={vi.fn()}
            />
        )
        await waitFor(() =>
            expect(onGetRelatedNodes).toHaveBeenCalledWith('', 'src/App.test.tsx')
        )
    })

    it('onGetRelatedNodes なしのとき source-graph-empty が表示される', async () => {
        render(
            <SourceGraphView
                nodes={[]}
                edges={[]}
                staleFiles={EMPTY_STALE}
                onNodeSelect={vi.fn()}
                onNodesChange={vi.fn()}
            />
        )
        await waitFor(() =>
            expect(screen.getByTestId('source-graph-empty')).toBeInTheDocument()
        )
    })
})