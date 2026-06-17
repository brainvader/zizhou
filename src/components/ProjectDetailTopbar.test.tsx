/**
 * Slot 1: 発注用ヘッダー
 * @context ProjectDetailTopbar — New Graph ロジック
 * @bom docs/bom/graph.ts, docs/bom/project.ts
 * @story
 * 1. New Graph ボタンクリックで onCreateGraph が projectId と name で呼ばれる
 * 2. onCreateGraph 完了後に onNavigate が graphId で呼ばれる
 * 3. onCreateGraph 失敗時に toast.error が呼ばれ onNavigate は呼ばれない
 * @output src/components/ProjectDetailTopbar.tsx
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import type { Project } from '@/bom/project'
import { ProjectDetailTopbar } from '@/components/ProjectDetailTopbar'

const {
    mockCreateGraph,
    mockToastError,
    mockNavigate,
} = vi.hoisted(() => ({
    mockCreateGraph: vi.fn<() => Promise<{ id: string }>>(),
    mockToastError: vi.fn(),
    mockNavigate: vi.fn(),
}))

vi.mock('sonner', () => ({
    toast: {
        error: mockToastError,
        success: vi.fn(),
    },
}))

vi.mock('@/store/useProjectDetailStore', () => ({
    useProjectDetailStore: vi.fn(() => true), // isDetailHydrated = true
}))

vi.mock('@/store/useProjectStore', () => ({
    useProjectStore: vi.fn(() => undefined),
}))

vi.mock('@tanstack/react-router', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@tanstack/react-router')>()
    return {
        ...actual,
        useRouter: vi.fn(() => ({ navigate: vi.fn() })),
        Link: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    }
})

const MOCK_PROJECT: Project = {
    id: 'proj-001',
    name: '地蔵 Core',
    rootPath: '/Users/user/projects/zizou-core',
    description: 'グラフベースのプロジェクト管理OS。',
}

const setup = () =>
    render(
        <ProjectDetailTopbar
            projectId={MOCK_PROJECT.id}
            project={MOCK_PROJECT}
            onNavigate={mockNavigate}
            onCreateGraph={mockCreateGraph}
        />
    )

beforeEach(() => {
    vi.clearAllMocks()
})

describe('ProjectDetailTopbar: New Graph logic', () => {
    it('logic: New Graph クリックで onCreateGraph が projectId と name で呼ばれる', async () => {
        mockCreateGraph.mockResolvedValue({ id: 'test-graph-id' })
        setup()

        fireEvent.click(screen.getByRole('button', { name: /new graph/i }))

        await waitFor(() => {
            expect(mockCreateGraph).toHaveBeenCalledWith(
                MOCK_PROJECT.id,
                expect.stringContaining('graph-')
            )
        })
    })

    it('logic: onCreateGraph 完了後に onNavigate が graphId で呼ばれる', async () => {
        mockCreateGraph.mockResolvedValue({ id: 'test-graph-id' })
        setup()

        fireEvent.click(screen.getByRole('button', { name: /new graph/i }))

        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith('test-graph-id')
        })
    })

    it('logic: onCreateGraph 失敗時に toast.error が呼ばれ onNavigate は呼ばれない', async () => {
        mockCreateGraph.mockRejectedValue(new Error('db error'))
        setup()

        fireEvent.click(screen.getByRole('button', { name: /new graph/i }))

        await waitFor(() => {
            expect(mockToastError).toHaveBeenCalledTimes(1)
        })
        expect(mockNavigate).not.toHaveBeenCalled()
    })
})