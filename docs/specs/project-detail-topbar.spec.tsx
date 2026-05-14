/**
 * Slot 1: 発注用ヘッダー
 * @context ProjectDetailTopbar — New Graph ロジック
 * @bom docs/bom/graph.ts, docs/bom/project.ts
 * @story
 * 1. New Graph ボタンクリックで writeTextFile が正しいパス・内容で呼ばれる
 * 2. writeTextFile 完了後に onNavigate が graphId で呼ばれる
 * 3. writeTextFile 失敗時に toast.error が呼ばれ onNavigate は呼ばれない
 * @output src/components/ProjectDetailTopbar.tsx
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import type { Project } from '@/bom/project'
import { ProjectDetailTopbar } from '@/components/ProjectDetailTopbar'

const {
    mockWriteTextFile,
    mockToastError,
    mockNavigate,
} = vi.hoisted(() => ({
    mockWriteTextFile: vi.fn<() => Promise<void>>(),
    mockToastError: vi.fn(),
    mockNavigate: vi.fn(),
}))

vi.mock('@tauri-apps/plugin-fs', () => ({
    writeTextFile: mockWriteTextFile,
}))

vi.mock('sonner', () => ({
    toast: {
        error: mockToastError,
        success: vi.fn(),
    },
}))

vi.mock('nanoid', () => ({
    nanoid: vi.fn(() => 'test-graph-id'),
}))

vi.mock('@/store/useProjectDetailStore', () => ({
    useProjectDetailStore: vi.fn(() => undefined),
}))

vi.mock('@/store/useProjectStore', () => ({
    useProjectStore: vi.fn(() => undefined),
}))

// Link を含めるため importOriginal を使用
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
    description: 'グラフベースのプロジェクト管理OS。',
    rootPath: '/Users/user/projects/zizou-core',
}

const setup = () =>
    render(
        <ProjectDetailTopbar
            projectId={MOCK_PROJECT.id}
            project={MOCK_PROJECT}
            initStatus="ready"
            projectRootPath={MOCK_PROJECT.rootPath}
            onNavigate={mockNavigate}
            onWriteTextFile={mockWriteTextFile}
        />
    )

beforeEach(() => {
    vi.clearAllMocks()
})

describe('ProjectDetailTopbar: New Graph logic', () => {
    it('logic: New Graph クリックで writeTextFile が正しいパスと内容で呼ばれる', async () => {
        mockWriteTextFile.mockResolvedValue(undefined)
        setup()

        fireEvent.click(screen.getByRole('button', { name: /new graph/i }))

        await waitFor(() => {
            expect(mockWriteTextFile).toHaveBeenCalledWith(
                '/Users/user/projects/zizou-core/graphs/test-graph-id.json',
                JSON.stringify({ id: 'test-graph-id', nodes: [], edges: [] }, null, 2)
            )
        })
    })

    it('logic: writeTextFile 完了後に onNavigate が graphId で呼ばれる', async () => {
        mockWriteTextFile.mockResolvedValue(undefined)
        setup()

        fireEvent.click(screen.getByRole('button', { name: /new graph/i }))

        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith('test-graph-id')
        })
    })

    it('logic: writeTextFile 失敗時に toast.error が呼ばれ onNavigate は呼ばれない', async () => {
        mockWriteTextFile.mockRejectedValue(new Error('fs error'))
        setup()

        fireEvent.click(screen.getByRole('button', { name: /new graph/i }))

        await waitFor(() => {
            expect(mockToastError).toHaveBeenCalledTimes(1)
        })
        expect(mockNavigate).not.toHaveBeenCalled()
    })
})