/**
 * @context ProjectDetailTopbar
 * @bom docs/bom/graph.ts, docs/bom/project.ts
 * @story
 * 1. ロゴ（地蔵 / Zizou / Protocol v7.00）が表示される
 * 2. breadcrumb にプロジェクト名が表示される
 * 3. プロジェクトが存在しない場合 breadcrumb は表示されない
 * 4. initStatus が 'ready' のとき New Graph ボタンは有効
 * 5. initStatus が 'checking' のとき New Graph ボタンは disabled
 * 6. initStatus が 'uninitialized' のとき New Graph ボタンは disabled
 * 7. Settings ボタンクリックで onSettingsClick が発火する
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn } from 'storybook/test'
import { ProjectDetailTopbar } from '@/components/ProjectDetailTopbar'

const meta: Meta<typeof ProjectDetailTopbar> = {
    component: ProjectDetailTopbar,
    title: 'Project Detail/Topbar',
    parameters: { layout: 'fullscreen' },
    args: {
        onSettingsClick: fn(),
        onWriteTextFile: async () => { },
    },
}
export default meta
type Story = StoryObj<typeof ProjectDetailTopbar>

const mockProject = {
    id: 'proj-001',
    name: '地蔵 Core',
    description: 'グラフベースのプロジェクト管理OS。',
    rootPath: '/Users/user/projects/zizou-core',
}

// @story 状態 1-2: ready — ロゴ・breadcrumb・ボタンの表示確認
export const Ready: Story = {
    args: {
        projectId: 'proj-001',
        project: mockProject,
        initStatus: 'ready',
        projectRootPath: '/Users/user/projects/zizou-core',
        onNavigate: fn(),
    },
    play: async ({ canvas }) => {
        await expect(canvas.getByText('地蔵')).toBeVisible()
        await expect(canvas.getByText(/zizou/i)).toBeVisible()
        await expect(canvas.getByText(/protocol v7\.00/i)).toBeVisible()
        await expect(canvas.getByTestId('breadcrumb-project')).toBeVisible()
        await expect(canvas.getByText('地蔵 Core')).toBeVisible()
        await expect(canvas.getByRole('button', { name: /new graph/i })).not.toBeDisabled()
    },
}

// @story 状態 3: breadcrumb なし（プロジェクト未解決）
export const ReadyNoBreadcrumb: Story = {
    args: {
        projectId: 'proj-001',
        project: undefined,
        initStatus: 'ready',
        projectRootPath: '/Users/user/projects/zizou-core',
    },
    play: async ({ canvas }) => {
        await expect(canvas.queryByTestId('breadcrumb-project')).not.toBeInTheDocument()
    },
}

// @story 状態 4: checking — New Graph disabled
export const Checking: Story = {
    args: {
        projectId: 'proj-001',
        project: mockProject,
        initStatus: 'checking',
        projectRootPath: '/Users/user/projects/zizou-core',
    },
    play: async ({ canvas }) => {
        await expect(canvas.getByRole('button', { name: /new graph/i })).toBeDisabled()
    },
}

// @story 状態 5: uninitialized — New Graph disabled
export const Uninitialized: Story = {
    args: {
        projectId: 'proj-001',
        project: mockProject,
        initStatus: 'uninitialized',
        projectRootPath: '/Users/user/projects/zizou-core',
    },
    play: async ({ canvas }) => {
        await expect(canvas.getByRole('button', { name: /new graph/i })).toBeDisabled()
    },
}

// @story 状態 6: Settings ボタンクリックで onSettingsClick が発火する
export const ClickSettings: Story = {
    args: {
        projectId: 'proj-001',
        project: mockProject,
        initStatus: 'ready',
        projectRootPath: '/Users/user/projects/zizou-core',
    },
    play: async ({ canvas, userEvent, args }) => {
        await userEvent.click(canvas.getByRole('button', { name: /settings/i }))
        await expect(args.onSettingsClick).toHaveBeenCalledTimes(1)
    },
}