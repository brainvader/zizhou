/**
 * @context CTX-19 / FileTree
 * @context CTX-20 / Structure Graph 連携
 * @bom     docs/bom/file-tree.ts
 * @story
 * CTX-19:
 *   1. rootPath 配下のディレクトリ・ファイルがツリー表示される
 *   2. ディレクトリをクリックすると子エントリが遅延ロードされ展開される
 *   3. 展開済みディレクトリを再クリックすると折りたたまれる
 *   4. rootPath が未設定のとき「root path が未設定です」が表示される
 *   5. ローディング中は「Loading…」が表示される
 *   6. readDir 失敗時はエラーメッセージが表示される
 * CTX-20:
 *   7. 構造グラフに登録済みのファイルに data-analyzed が付く
 *   8. stale ファイルに data-stale が付き、analyzed のみのファイルとは区別される
 *   9. selectedFilePath のファイルに data-selected が付く
 *  10. ファイルクリックで onFileClick が rootPath 相対パスで呼ばれる
 *  11. analyzed + stale + selected の3属性が同時に立つ
 *  12. ディレクトリクリックでは onFileClick は呼ばれない
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent } from 'storybook/test'
import { FileTree } from '@/components/FileTree'
import type { FsEntry } from '@/bom/file-tree'

const ROOT = '/Users/user/projects/zizou-core'

const meta: Meta<typeof FileTree> = {
    component: FileTree,
    title: 'Project Detail/FileTree',
    parameters: { layout: 'fullscreen' },
    decorators: [
        (Story) => (
            <div style={{ width: '220px', height: '100vh' }}>
                <Story />
            </div>
        ),
    ],
    args: {
        rootPath: ROOT,
    },
}
export default meta
type Story = StoryObj<typeof FileTree>

// ── フィクスチャ（絶対パスをキーにする）────────────────────────────────

const FIXTURE: Record<string, FsEntry[]> = {
    [ROOT]: [
        { name: 'src', path: `${ROOT}/src`, isDirectory: true },
        { name: 'src-tauri', path: `${ROOT}/src-tauri`, isDirectory: true },
        { name: 'package.json', path: `${ROOT}/package.json`, isDirectory: false },
        { name: 'README.md', path: `${ROOT}/README.md`, isDirectory: false },
    ],
    [`${ROOT}/src`]: [
        { name: 'components', path: `${ROOT}/src/components`, isDirectory: true },
        { name: 'hooks', path: `${ROOT}/src/hooks`, isDirectory: true },
        { name: 'main.tsx', path: `${ROOT}/src/main.tsx`, isDirectory: false },
    ],
}

const mockReadDir = async (path: string): Promise<FsEntry[]> =>
    FIXTURE[path] ?? []

// ── @story 1: 通常表示 ──────────────────────────────────────────────────

export const Default: Story = {
    args: { onReadDir: mockReadDir },
    play: async ({ canvas }) => {
        await expect(canvas.findByText('src')).resolves.toBeVisible()
        await expect(canvas.getByText('src-tauri')).toBeVisible()
        await expect(canvas.getByText('package.json')).toBeVisible()
        await expect(canvas.getByText('README.md')).toBeVisible()
    },
}

// ── @story 2: ディレクトリ展開（遅延ロード） ────────────────────────────

export const DirExpand: Story = {
    args: { onReadDir: mockReadDir },
    play: async ({ canvas }) => {
        const srcDir = await canvas.findByText('src')
        expect(canvas.queryByText('components')).toBeNull()

        await userEvent.click(srcDir)
        await expect(canvas.findByText('components')).resolves.toBeVisible()
        await expect(canvas.getByText('hooks')).toBeVisible()
        await expect(canvas.getByText('main.tsx')).toBeVisible()
    },
}

// ── @story 3: 折りたたみ ─────────────────────────────────────────────

export const DirCollapse: Story = {
    args: { onReadDir: mockReadDir },
    play: async ({ canvas }) => {
        const srcDir = await canvas.findByText('src')

        await userEvent.click(srcDir)
        await expect(canvas.findByText('components')).resolves.toBeVisible()

        await userEvent.click(srcDir)
        expect(canvas.queryByText('components')).toBeNull()
    },
}

// ── @story 4: rootPath 未設定 ────────────────────────────────────────

export const NoRootPath: Story = {
    args: { rootPath: undefined },
    play: async ({ canvas }) => {
        await expect(canvas.findByText('root path が未設定です')).resolves.toBeVisible()
    },
}

// ── @story 5: ローディング中 ─────────────────────────────────────────

export const Loading: Story = {
    args: { onReadDir: () => new Promise(() => { }) },
    play: async ({ canvas }) => {
        await expect(canvas.getByText('Loading…')).toBeVisible()
    },
}

// ── @story 6: エラー ────────────────────────────────────────────────

export const LoadError: Story = {
    args: { onReadDir: async () => { throw new Error('fs error') } },
    play: async ({ canvas }) => {
        await expect(canvas.findByText('Failed to load directory')).resolves.toBeVisible()
    },
}

// ── @story 7: 登録済みファイル（CTX-20） ────────────────────────────

export const Analyzed: Story = {
    args: {
        onReadDir: mockReadDir,
        analyzedFiles: new Set(['src/main.tsx', 'package.json']),
    },
    play: async ({ canvas }) => {
        await userEvent.click(await canvas.findByText('src'))
        await canvas.findByText('main.tsx')

        const registered = canvas.getByTestId('fs-entry-main.tsx')
        await expect(registered).toHaveAttribute('data-analyzed', 'true')

        const unregistered = canvas.getByTestId('fs-entry-hooks')
        await expect(unregistered).not.toHaveAttribute('data-analyzed')
    },
}

// ── @story 8: stale ファイル（CTX-20） ──────────────────────────────

export const Stale: Story = {
    args: {
        onReadDir: mockReadDir,
        analyzedFiles: new Set(['src/main.tsx', 'package.json']),
        staleFiles: new Set(['src/main.tsx']),
    },
    play: async ({ canvas }) => {
        await userEvent.click(await canvas.findByText('src'))
        await canvas.findByText('main.tsx')

        const stale = canvas.getByTestId('fs-entry-main.tsx')
        await expect(stale).toHaveAttribute('data-stale', 'true')

        const fresh = canvas.getByTestId('fs-entry-package.json')
        await expect(fresh).toHaveAttribute('data-analyzed', 'true')
        await expect(fresh).not.toHaveAttribute('data-stale')
    },
}

// ── @story 9: 選択中ファイル（CTX-20 / Node→File 同期） ─────────────

export const Selected: Story = {
    args: {
        onReadDir: mockReadDir,
        analyzedFiles: new Set(['src/main.tsx']),
        selectedFilePath: 'src/main.tsx',
    },
    play: async ({ canvas }) => {
        await userEvent.click(await canvas.findByText('src'))
        await canvas.findByText('main.tsx')

        const selected = canvas.getByTestId('fs-entry-main.tsx')
        await expect(selected).toHaveAttribute('data-selected', 'true')
    },
}

// ── @story 10: ファイルクリックで onFileClick が相対パスで呼ばれる ───

export const FileClick: Story = {
    args: {
        onReadDir: mockReadDir,
        onFileClick: fn(),
    },
    play: async ({ canvas, args }) => {
        await userEvent.click(await canvas.findByText('src'))
        const file = await canvas.findByText('main.tsx')

        await userEvent.click(file)
        await expect(args.onFileClick).toHaveBeenCalledWith('src/main.tsx')
    },
}

// ── @story 11: 複合状態（analyzed + stale + selected） ──────────────

export const Combined: Story = {
    args: {
        onReadDir: mockReadDir,
        analyzedFiles: new Set(['src/main.tsx']),
        staleFiles: new Set(['src/main.tsx']),
        selectedFilePath: 'src/main.tsx',
    },
    play: async ({ canvas }) => {
        await userEvent.click(await canvas.findByText('src'))
        await canvas.findByText('main.tsx')

        const entry = canvas.getByTestId('fs-entry-main.tsx')
        await expect(entry).toHaveAttribute('data-analyzed', 'true')
        await expect(entry).toHaveAttribute('data-stale', 'true')
        await expect(entry).toHaveAttribute('data-selected', 'true')
    },
}

// ── @story 12: ディレクトリクリックは onFileClick を呼ばない ─────────

export const DirClickIgnored: Story = {
    args: {
        onReadDir: mockReadDir,
        onFileClick: fn(),
    },
    play: async ({ canvas, args }) => {
        const srcDir = await canvas.findByText('src')
        await userEvent.click(srcDir)
        await expect(args.onFileClick).not.toHaveBeenCalled()
    },
}