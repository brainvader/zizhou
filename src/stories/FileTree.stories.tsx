/**
 * @context CTX-19 / FileTree
 * @bom     docs/bom/file-tree.ts
 * @story
 * 1. rootPath 配下のディレクトリ・ファイルがツリー表示される
 * 2. ディレクトリをクリックすると子エントリが遅延ロードされ展開される
 * 3. 展開済みディレクトリを再クリックすると折りたたまれる
 * 4. rootPath が未設定のとき「root path が未設定です」が表示される
 * 5. ローディング中は「Loading…」が表示される
 * 6. readDir 失敗時はエラーメッセージが表示される
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent } from 'storybook/test'
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