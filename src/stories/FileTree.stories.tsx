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

// ============================================================
// [CTX-20] 構造グラフ連携ストーリー
//
// 前提:
//   - 既存ストーリーで meta / mockReadDir / Default 等が定義済み
//   - mockReadDir は rootPath = '/Users/user/projects/zizou-core' を想定
//     （もしくは既存テストで使われているフィクスチャ rootPath に揃える）
//
// ストーリー側で追加 import が必要:
//   import { expect, fn, userEvent } from 'storybook/test'
//
// （既存 stories で既に import 済みなら重複は省く）
// ============================================================

// 既存の mockReadDir フィクスチャでツリーに src/FileTree.tsx /
// src/GraphEditor.tsx / src/utils.ts が含まれる想定。
// もし含まれていなければ既存 mockReadDir を以下に差し替えるか、
// または別のフィクスチャ stories ファイルとして分離してください。

export const AnalyzedFiles: Story = {
    name: '[CTX-20] Analyzed files (registered)',
    args: {
        analyzedFiles: new Set(['src/FileTree.tsx', 'src/utils.ts']),
    },
    play: async ({ canvas }) => {
        // src フォルダを展開
        await userEvent.click(canvas.getByTestId('fs-entry-src'))

        // 登録済みは data-analyzed='true'
        const registered = await canvas.findByTestId('fs-entry-FileTree.tsx')
        await expect(registered).toHaveAttribute('data-analyzed', 'true')

        // 未登録は data-analyzed 属性が無い
        const unregistered = canvas.getByTestId('fs-entry-GraphEditor.tsx')
        await expect(unregistered).not.toHaveAttribute('data-analyzed')
    },
}

export const StaleFiles: Story = {
    name: '[CTX-20] Stale files (changed since analyze)',
    args: {
        analyzedFiles: new Set(['src/FileTree.tsx', 'src/utils.ts']),
        staleFiles: new Set(['src/FileTree.tsx']),
    },
    play: async ({ canvas }) => {
        await userEvent.click(canvas.getByTestId('fs-entry-src'))
        const stale = await canvas.findByTestId('fs-entry-FileTree.tsx')
        await expect(stale).toHaveAttribute('data-stale', 'true')

        // utils.ts は analyzed だが stale ではない
        const freshFile = canvas.getByTestId('fs-entry-utils.ts')
        await expect(freshFile).toHaveAttribute('data-analyzed', 'true')
        await expect(freshFile).not.toHaveAttribute('data-stale')
    },
}

export const SelectedFile: Story = {
    name: '[CTX-20] Selected file highlight (Node→File sync)',
    args: {
        analyzedFiles: new Set(['src/FileTree.tsx']),
        selectedFilePath: 'src/FileTree.tsx',
    },
    play: async ({ canvas }) => {
        await userEvent.click(canvas.getByTestId('fs-entry-src'))
        const selected = await canvas.findByTestId('fs-entry-FileTree.tsx')
        await expect(selected).toHaveAttribute('data-selected', 'true')
    },
}

export const FileClickInvokesHandler: Story = {
    name: '[CTX-20] File click invokes onFileClick with relative path',
    args: {
        onFileClick: fn(),
    },
    play: async ({ canvas, args }) => {
        await userEvent.click(canvas.getByTestId('fs-entry-src'))
        const file = await canvas.findByTestId('fs-entry-FileTree.tsx')
        await userEvent.click(file)

        // 渡される引数は rootPath 相対 / forward slash
        await expect(args.onFileClick).toHaveBeenCalledWith('src/FileTree.tsx')
    },
}

export const StaleAnalyzedSelectedCombined: Story = {
    name: '[CTX-20] Stale + Analyzed + Selected (combined data attrs)',
    args: {
        analyzedFiles: new Set(['src/FileTree.tsx']),
        staleFiles: new Set(['src/FileTree.tsx']),
        selectedFilePath: 'src/FileTree.tsx',
    },
    play: async ({ canvas }) => {
        await userEvent.click(canvas.getByTestId('fs-entry-src'))
        const entry = await canvas.findByTestId('fs-entry-FileTree.tsx')

        await expect(entry).toHaveAttribute('data-analyzed', 'true')
        await expect(entry).toHaveAttribute('data-stale', 'true')
        await expect(entry).toHaveAttribute('data-selected', 'true')
    },
}

export const FileClickOnDirectoryDoesNotInvokeHandler: Story = {
    name: '[CTX-20] Directory click does NOT invoke onFileClick',
    args: {
        onFileClick: fn(),
    },
    play: async ({ canvas, args }) => {
        // ディレクトリをクリック（展開のみ）
        await userEvent.click(canvas.getByTestId('fs-entry-src'))
        // ハンドラは呼ばれない
        await expect(args.onFileClick).not.toHaveBeenCalled()
    },
}
