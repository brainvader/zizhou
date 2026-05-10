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
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { ProjectDetailTopbar } from '@/components/ProjectDetailTopbar'

const meta: Meta<typeof ProjectDetailTopbar> = {
    component: ProjectDetailTopbar,
    title: 'Project Detail/Topbar',
    parameters: { layout: 'fullscreen' },
}
export default meta
type Story = StoryObj<typeof ProjectDetailTopbar>

const mockProject = {
    id: 'proj-001',
    name: '地蔵 Core',
    description: 'グラフベースのプロジェクト管理OS。',
    rootPath: '/Users/user/projects/zizou-core',
}

const noopAsync = async () => { }

// @story 状態 1: ready — breadcrumb あり
export const Ready: Story = {
    args: {
        projectId: 'proj-001',
        project: mockProject,
        initStatus: 'ready',
        projectRootPath: '/Users/user/projects/zizou-core',
        onSetActiveGraphId: (id) => console.log('setActiveGraphId', id),
        onWriteTextFile: noopAsync,
        onSettingsClick: () => console.log('settings clicked'),
    },
}

// @story 状態 2: ready — breadcrumb なし（プロジェクト未解決）
export const ReadyNoBreadcrumb: Story = {
    args: {
        projectId: 'proj-001',
        project: undefined,
        initStatus: 'ready',
        projectRootPath: '/Users/user/projects/zizou-core',
        onWriteTextFile: noopAsync,
    },
}

// @story 状態 3: checking — New Graph disabled
export const Checking: Story = {
    args: {
        projectId: 'proj-001',
        project: mockProject,
        initStatus: 'checking',
        projectRootPath: '/Users/user/projects/zizou-core',
        onWriteTextFile: noopAsync,
    },
}

// @story 状態 4: uninitialized — New Graph disabled
export const Uninitialized: Story = {
    args: {
        projectId: 'proj-001',
        project: mockProject,
        initStatus: 'uninitialized',
        projectRootPath: '/Users/user/projects/zizou-core',
        onWriteTextFile: noopAsync,
    },
}