import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { FileTree } from './FileTree'
import type { FsEntry } from '@/bom/file-tree'

const ROOT = '/projects/zizhou'

const FIXTURE: Record<string, FsEntry[]> = {
    [ROOT]: [
        { name: 'src', path: `${ROOT}/src`, isDirectory: true },
        { name: 'package.json', path: `${ROOT}/package.json`, isDirectory: false },
    ],
    [`${ROOT}/src`]: [
        { name: 'main.tsx', path: `${ROOT}/src/main.tsx`, isDirectory: false },
    ],
}

const mockReadDir = vi.fn(async (path: string): Promise<FsEntry[]> => FIXTURE[path] ?? [])

describe('ファイルツリーを閲覧・選択する', () => {
    it('rootPath 配下のエントリがツリー表示される', async () => {
        render(<FileTree rootPath={ROOT} onReadDir={mockReadDir} />)
        await waitFor(() => expect(screen.getByText('src')).toBeInTheDocument())
        expect(screen.getByText('package.json')).toBeInTheDocument()
    })

    it('ディレクトリをクリックすると子エントリが遅延ロードされ展開される', async () => {
        render(<FileTree rootPath={ROOT} onReadDir={mockReadDir} />)
        await waitFor(() => screen.getByTestId('fs-entry-src'))
        fireEvent.click(screen.getByTestId('fs-entry-src'))
        await waitFor(() => expect(screen.getByText('main.tsx')).toBeInTheDocument())
    })

    it('展開済みディレクトリを再クリックすると折りたたまれる', async () => {
        render(<FileTree rootPath={ROOT} onReadDir={mockReadDir} />)
        await waitFor(() => screen.getByTestId('fs-entry-src'))
        fireEvent.click(screen.getByTestId('fs-entry-src'))
        await waitFor(() => screen.getByText('main.tsx'))
        fireEvent.click(screen.getByTestId('fs-entry-src'))
        expect(screen.queryByText('main.tsx')).not.toBeInTheDocument()
    })

    it('rootPath が未設定のとき「root path が未設定です」が表示される', () => {
        render(<FileTree />)
        expect(screen.getByText('root path が未設定です')).toBeInTheDocument()
    })

    it('readDir 失敗時はエラーメッセージが表示される', async () => {
        const failReadDir = vi.fn().mockRejectedValue(new Error('fail'))
        render(<FileTree rootPath={ROOT} onReadDir={failReadDir} />)
        await waitFor(() =>
            expect(screen.getByText('Failed to load directory')).toBeInTheDocument()
        )
    })

    it('ファイルクリックで onFileClick が rootPath 相対パスで呼ばれる', async () => {
        const onFileClick = vi.fn()
        render(<FileTree rootPath={ROOT} onReadDir={mockReadDir} onFileClick={onFileClick} />)
        await waitFor(() => screen.getByTestId('fs-entry-package.json'))
        fireEvent.click(screen.getByTestId('fs-entry-package.json'))
        expect(onFileClick).toHaveBeenCalledWith('package.json')
    })

    it('selectedFilePath のファイルに data-selected が付く', async () => {
        render(<FileTree rootPath={ROOT} onReadDir={mockReadDir} selectedFilePath="package.json" />)
        await waitFor(() => screen.getByTestId('fs-entry-package.json'))
        expect(screen.getByTestId('fs-entry-package.json')).toHaveAttribute('data-selected')
    })

    it('staleFiles に含まれるファイルに data-stale が付く', async () => {
        render(<FileTree rootPath={ROOT} onReadDir={mockReadDir} staleFiles={new Set(['package.json'])} />)
        await waitFor(() => screen.getByTestId('fs-entry-package.json'))
        expect(screen.getByTestId('fs-entry-package.json')).toHaveAttribute('data-stale')
    })

    it('analyzedFiles に含まれるファイルに data-analyzed が付く', async () => {
        render(<FileTree rootPath={ROOT} onReadDir={mockReadDir} analyzedFiles={new Set(['package.json'])} />)
        await waitFor(() => screen.getByTestId('fs-entry-package.json'))
        expect(screen.getByTestId('fs-entry-package.json')).toHaveAttribute('data-analyzed')
    })

    it('ディレクトリクリックでは onFileClick は呼ばれない', async () => {
        const onFileClick = vi.fn()
        render(<FileTree rootPath={ROOT} onReadDir={mockReadDir} onFileClick={onFileClick} />)
        await waitFor(() => screen.getByTestId('fs-entry-src'))
        fireEvent.click(screen.getByTestId('fs-entry-src'))
        expect(onFileClick).not.toHaveBeenCalled()
    })
})