/**
 * Slot 1: 発注用ヘッダー
 * @context CTX-1 / FileTree — ロジック検証（SurrealDB移行後）
 * @bom docs/bom/graph.ts
 * @story
 * 1. onListGraphs で返したグラフ名が表示される
 * 2. ローディング中は「Loading…」が表示される
 * 3. グラフが存在しない場合は「No graphs」が表示される
 * 4. グラフをクリックすると onNavigate が graphId で呼ばれる
 * 5. activeGraphId に一致するグラフはハイライトされる
 * 6. onListGraphs が失敗した場合はエラー状態になる
 * @output src/components/FileTree.tsx
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FileTree } from '@/components/FileTree'

vi.mock('@/store/useProjectDetailStore', () => ({
    useProjectDetailStore: vi.fn(() => null),
}))

vi.mock('@tanstack/react-router', () => ({
    useRouter: vi.fn(() => ({ navigate: vi.fn() })),
}))

vi.mock('sonner', () => ({
    toast: { error: vi.fn() },
}))

const mockNavigate = vi.fn()

const mockGraphs = [
    { id: 'graph-01', name: 'main' },
    { id: 'graph-02', name: 'feature-x' },
]

const setup = (overrides: Partial<React.ComponentProps<typeof FileTree>> = {}) =>
    render(
        <FileTree
            projectId="proj-001"
            onNavigate={mockNavigate}
            onListGraphs={vi.fn().mockResolvedValue(mockGraphs)}
            {...overrides}
        />
    )

beforeEach(() => {
    vi.clearAllMocks()
})

describe('FileTree: Graph List', () => {
    it('グラフ名が表示される', async () => {
        setup()
        await waitFor(() => expect(screen.getByText('main')).toBeInTheDocument())
        expect(screen.getByText('feature-x')).toBeInTheDocument()
    })

    it('グラフが存在しない場合は「No graphs」が表示される', async () => {
        setup({ onListGraphs: vi.fn().mockResolvedValue([]) })
        await waitFor(() => expect(screen.getByText('No graphs')).toBeInTheDocument())
    })

    it('グラフをクリックすると onNavigate が graphId で呼ばれる', async () => {
        setup()
        await waitFor(() => expect(screen.getByText('main')).toBeInTheDocument())
        await userEvent.click(screen.getByText('main'))
        expect(mockNavigate).toHaveBeenCalledWith('graph-01')
    })

    it('activeGraphId に一致するグラフは選択スタイルになる', async () => {
        setup({ activeGraphId: 'graph-01' })
        await waitFor(() => expect(screen.getByTestId('graph-item-graph-01')).toBeInTheDocument())
        expect(screen.getByTestId('graph-item-graph-01').className).toContain('bg-[--muted]')
    })

    it('onListGraphs が失敗した場合はエラーが表示される', async () => {
        setup({ onListGraphs: vi.fn().mockRejectedValue(new Error('db error')) })
        await waitFor(() => expect(screen.getByText('Failed to load graphs')).toBeInTheDocument())
    })
})