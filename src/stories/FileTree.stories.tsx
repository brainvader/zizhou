/**
 * @context FileTree
 * @bom docs/bom/graph.ts
 * @story
 * 1. projectRootPath が設定されるとツリーが表示される
 * 2. ディレクトリをクリックすると展開・折りたたむ
 * 3. ファイルをクリックすると選択状態になる
 * 4. graphs/ 配下の .json を選択すると setActiveGraphId が呼ばれる
 * 5. projectRootPath が未設定のとき何も表示しない
 * 6. ロード中は「Loading…」を表示する
 * 7. エラー時はエラーメッセージを表示する
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { FileTree } from '@/components/FileTree'

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
}
export default meta
type Story = StoryObj<typeof FileTree>

const mockJoin = async (...paths: string[]) => paths.join('/')

// @story 状態 1: 通常表示
export const Default: Story = {
    args: {
        projectRootPath: '/mock/project',
        onJoin: mockJoin,
        onReadDir: async (path) => {
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
        },
    },
}

// @story 状態 2: 空のプロジェクト
export const Empty: Story = {
    args: {
        projectRootPath: '/mock/project',
        onJoin: mockJoin,
        onReadDir: async () => [],
    },
}

// @story 状態 3: エラー
export const LoadError: Story = {
    args: {
        projectRootPath: '/mock/project',
        onJoin: mockJoin,
        onReadDir: async () => { throw new Error('ディレクトリが見つかりません') },
    },
}

// @story 状態 4: ローディング中
export const Loading: Story = {
    args: {
        projectRootPath: '/mock/project',
        onJoin: mockJoin,
        onReadDir: () => new Promise(() => { }), // 永久に pending
    },
}