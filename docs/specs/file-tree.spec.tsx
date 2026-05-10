/**
 * Slot 1: 発注用ヘッダー
 * @context CTX-1 / FileTree — ロジック検証
 * @bom docs/bom/graph.ts
 * @story
 * 1. onReadDir で返したツリーのルートディレクトリ名が表示される
 * 2. 初期状態では子ノードは非表示
 * 3. ディレクトリをクリックすると展開される
 * 4. 展開済みディレクトリを再クリックすると折りたたまれる
 * 5. graphs/ 配下の .json ファイルをクリックすると setActiveGraphId が呼ばれる
 * 6. graphs/ 配下以外のファイルをクリックしても setActiveGraphId は呼ばれない
 * @output src/components/FileTree.tsx
 */

// =============================================================================
// Slot 2: Imports
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FileTree } from '@/components/FileTree'

// =============================================================================
// Slot 3: モック・セットアップ
// =============================================================================

// store フォールバックを無効化（props DI で完結させる）
vi.mock('@/store/useProjectDetailStore', () => ({
    useProjectDetailStore: vi.fn(() => undefined),
}))

const mockSetActiveGraphId = vi.fn()
const mockJoin = async (...paths: string[]) => paths.join('/')

const mockReadDir = vi.fn()

const setup = () =>
    render(
        <FileTree
            projectRootPath="/mock/project"
            onJoin={mockJoin}
            onReadDir={mockReadDir}
            setActiveGraphId={mockSetActiveGraphId}
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

// =============================================================================
// Slot 4: 挙動の検証
// =============================================================================

describe('FileTree: ツリー表示', () => {
    it('onReadDir で返したルートディレクトリ・ファイル名が表示される', async () => {
        setup()
        await waitFor(() => {
            expect(screen.getByText('graphs')).toBeInTheDocument()
            expect(screen.getByText('src')).toBeInTheDocument()
            expect(screen.getByText('README.md')).toBeInTheDocument()
        })
    })

    it('初期状態では子ノードは非表示', async () => {
        setup()
        await waitFor(() => expect(screen.getByText('graphs')).toBeInTheDocument())
        expect(screen.queryByText('graph-01.json')).not.toBeInTheDocument()
        expect(screen.queryByText('main.ts')).not.toBeInTheDocument()
    })
})

describe('FileTree: Expand / Collapse', () => {
    it('ディレクトリをクリックすると子ノードが表示される', async () => {
        setup()
        await waitFor(() => expect(screen.getByText('graphs')).toBeInTheDocument())

        await userEvent.click(screen.getByText('graphs'))
        expect(screen.getByText('graph-01.json')).toBeInTheDocument()
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
    it('graphs/ 配下の .json をクリックすると setActiveGraphId が graphId で呼ばれる', async () => {
        setup()
        await waitFor(() => expect(screen.getByText('graphs')).toBeInTheDocument())

        await userEvent.click(screen.getByText('graphs'))
        await userEvent.click(screen.getByText('graph-01.json'))

        expect(mockSetActiveGraphId).toHaveBeenCalledWith('graph-01')
        expect(mockSetActiveGraphId).toHaveBeenCalledTimes(1)
    })

    it('graphs/ 配下以外のファイルをクリックしても setActiveGraphId は呼ばれない', async () => {
        setup()
        await waitFor(() => expect(screen.getByText('README.md')).toBeInTheDocument())

        await userEvent.click(screen.getByText('README.md'))

        expect(mockSetActiveGraphId).not.toHaveBeenCalled()
    })

    it('src/ 配下のファイルをクリックしても setActiveGraphId は呼ばれない', async () => {
        setup()
        await waitFor(() => expect(screen.getByText('src')).toBeInTheDocument())

        await userEvent.click(screen.getByText('src'))
        await userEvent.click(screen.getByText('main.ts'))

        expect(mockSetActiveGraphId).not.toHaveBeenCalled()
    })
})