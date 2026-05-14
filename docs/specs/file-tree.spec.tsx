/**
 * Slot 1: 発注用ヘッダー
 * @context CTX-1 / FileTree — ロジック検証
 * @bom docs/bom/graph.ts
 * @story
 * 1. onReadDir で返したツリーのルートディレクトリ名が表示される
 * 2. 初期状態では子ノードは非表示
 * 3. ディレクトリをクリックすると展開される
 * 4. 展開済みディレクトリを再クリックすると折りたたまれる
 * 5. graphs/ 配下の .json ファイルをクリックすると onNavigate が graphId で呼ばれる
 * 6. graphs/ 配下以外のファイルをクリックしても onNavigate は呼ばれない
 * @output src/components/FileTree.tsx
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FileTree } from '@/components/FileTree'

// store フォールバックを無効化（props DI で完結させる）
vi.mock('@/store/useProjectDetailStore', () => ({
    useProjectDetailStore: vi.fn(() => undefined),
}))

// useRouter のフォールバックを無効化（onNavigate props DI で完結させる）
vi.mock('@tanstack/react-router', () => ({
    useRouter: vi.fn(() => ({ navigate: vi.fn() })),
}))

const mockNavigate = vi.fn()
const mockJoin = async (...paths: string[]) => paths.join('/')
const mockReadDir = vi.fn()

const setup = () =>
    render(
        <FileTree
            projectRootPath="/mock/project"
            projectId="proj-001"
            onJoin={mockJoin}
            onReadDir={mockReadDir}
            onNavigate={mockNavigate}
        />
    )

beforeEach(() => {
    vi.clearAllMocks()
    mockReadDir.mockImplementation(async (path: string) => {
        if (path === '/mock/project') return [
            { name: 'graphs', isDirectory: true, isSymlink: false },
            { name: 'src', isDirectory: true, isSymlink: false },
            { name: 'README.md', isDirectory: false, isSymlink: false },
        ]
        if (path === '/mock/project/graphs') return [
            { name: 'graph-01.json', isDirectory: false, isSymlink: false },
        ]
        if (path === '/mock/project/src') return [
            { name: 'main.ts', isDirectory: false, isSymlink: false },
        ]
        return []
    })
})

describe('FileTree: Directory Tree', () => {
    it('ルートディレクトリ名が表示される', async () => {
        setup()
        await waitFor(() => expect(screen.getByText('graphs')).toBeInTheDocument())
        expect(screen.getByText('src')).toBeInTheDocument()
    })

    it('初期状態では子ノードは非表示', async () => {
        setup()
        await waitFor(() => expect(screen.getByText('src')).toBeInTheDocument())
        expect(screen.queryByText('main.ts')).not.toBeInTheDocument()
    })

    it('ディレクトリをクリックすると展開される', async () => {
        setup()
        await waitFor(() => expect(screen.getByText('src')).toBeInTheDocument())
        await userEvent.click(screen.getByText('src'))
        expect(screen.getByText('main.ts')).toBeInTheDocument()
    })

    it('展開済みディレクトリを再クリックすると子ノードが非表示になる', async () => {
        setup()
        await waitFor(() => expect(screen.getByText('src')).toBeInTheDocument())
        await userEvent.click(screen.getByText('src'))
        expect(screen.getByText('main.ts')).toBeInTheDocument()
        await userEvent.click(screen.getByText('src'))
        expect(screen.queryByText('main.ts')).not.toBeInTheDocument()
    })
})

describe('FileTree: File Select', () => {
    it('graphs/ 配下の .json をクリックすると onNavigate が graphId で呼ばれる', async () => {
        setup()
        await waitFor(() => expect(screen.getByText('graphs')).toBeInTheDocument())
        await userEvent.click(screen.getByText('graphs'))
        await userEvent.click(screen.getByText('graph-01.json'))
        expect(mockNavigate).toHaveBeenCalledWith('graph-01')
        expect(mockNavigate).toHaveBeenCalledTimes(1)
    })

    it('graphs/ 配下以外のファイルをクリックしても onNavigate は呼ばれない', async () => {
        setup()
        await waitFor(() => expect(screen.getByText('README.md')).toBeInTheDocument())
        await userEvent.click(screen.getByText('README.md'))
        expect(mockNavigate).not.toHaveBeenCalled()
    })

    it('src/ 配下のファイルをクリックしても onNavigate は呼ばれない', async () => {
        setup()
        await waitFor(() => expect(screen.getByText('src')).toBeInTheDocument())
        await userEvent.click(screen.getByText('src'))
        await userEvent.click(screen.getByText('main.ts'))
        expect(mockNavigate).not.toHaveBeenCalled()
    })
})