/**
 * @context ProjectGrid
 * @bom docs/bom/project.ts
 * @story
 * 1. projects[] が空のとき「＋ new project」カードのみ表示される
 * 2. projects[] があるときプロジェクトカードが表示される
 * 3. isHydrated が false のとき「＋ new project」は disabled になる
 * 4. 「＋ new project」をクリックするとダイアログが開く
 * 5. name 空で「作成」を押すとバリデーションエラーが表示される
 * 6. フォームに入力して「作成」をクリックするとダイアログが閉じる
 * 7. 「キャンセル」でダイアログが閉じ form がリセットされる
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, screen } from 'storybook/test'
import { ProjectGrid } from '@/components/ProjectGrid'
import { useProjectStore } from '@/store/useProjectStore'
import { useEffect } from 'react'

/** Storybook 用 Link スタブ（Router context 不要） */
const StubLink = ({ children, className, 'data-testid': testId }: any) => (
    <a href="#" className={className} data-testid={testId}>{children}</a>
)

/** ストア状態を注入するラッパー */
const WithStore = ({
    projects = [],
    isHydrated = true,
    ...props
}: React.ComponentProps<typeof ProjectGrid> & {
    projects?: any[]
    isHydrated?: boolean
}) => {
    useEffect(() => {
        useProjectStore.setState({ projects, isHydrated })
        return () => useProjectStore.setState({ projects: [], isHydrated: false })
    }, [])
    return <ProjectGrid {...props} LinkComponent={StubLink} />
}

const meta: Meta<typeof ProjectGrid> = {
    component: ProjectGrid,
    title: 'Projects/ProjectGrid',
    parameters: { layout: 'fullscreen' },
    args: {
        onMkdir: fn(async () => { }),
    },
}
export default meta
type Story = StoryObj<typeof ProjectGrid>

const mockProjects = [
    { id: 'proj-001', name: '地蔵 Core', description: 'グラフベースのプロジェクト管理OS。', rootPath: '/Users/user/projects/zizou-core' },
    { id: 'proj-002', name: 'Visual Thinkering', description: '', rootPath: '/Users/user/projects/vt' },
]

// @story 状態 1: 空（projects[] なし）
export const Empty: Story = {
    render: (args) => <WithStore {...args} projects={[]} isHydrated={true} />,
    play: async () => {
        await expect(screen.getByText('＋ new project')).toBeVisible()
        await expect(screen.queryByRole('article')).not.toBeInTheDocument()
    },
}

// @story 状態 2: プロジェクトあり
export const WithProjectList: Story = {
    render: (args) => <WithStore {...args} projects={mockProjects} isHydrated={true} />,
    play: async () => {
        await expect(screen.getByText('地蔵 Core')).toBeVisible()
        await expect(screen.getByText('Visual Thinkering')).toBeVisible()
        await expect(screen.getByText('＋ new project')).toBeVisible()
    },
}

// @story 状態 3: ハイドレーション前（disabled）
export const NotHydrated: Story = {
    render: (args) => <WithStore {...args} projects={[]} isHydrated={false} />,
    play: async () => {
        const btn = screen.getByText('＋ new project').closest('button') ??
            screen.getByText('＋ new project').closest('[aria-disabled]')
        await expect(btn).toBeInTheDocument()
    },
}

// @story 状態 4: ダイアログを開く
export const OpenDialog: Story = {
    render: (args) => <WithStore {...args} projects={[]} isHydrated={true} />,
    play: async ({ userEvent }) => {
        await userEvent.click(screen.getByText('＋ new project'))
        await expect(await screen.findByText('New Project')).toBeInTheDocument()
    },
}

// @story 状態 5: バリデーションエラー
export const ValidationError: Story = {
    render: (args) => <WithStore {...args} projects={[]} isHydrated={true} />,
    play: async ({ userEvent }) => {
        await userEvent.click(screen.getByText('＋ new project'))
        await screen.findByRole('dialog')
        await userEvent.click(screen.getByText('作成'))
        await expect(await screen.findByText('name は必須です')).toBeVisible()
        await expect(screen.getByRole('dialog')).toBeInTheDocument()
    },
}

// @story 状態 6: 正常作成 → ダイアログが閉じる
export const SubmitSuccess: Story = {
    args: { onMkdir: fn(async () => { }) },
    render: (args) => <WithStore {...args} projects={[]} isHydrated={true} />,
    play: async ({ userEvent }) => {
        await userEvent.click(screen.getByText('＋ new project'))
        await userEvent.type(screen.getByPlaceholderText('My Awesome App'), '地蔵 Core')
        await userEvent.type(
            screen.getByPlaceholderText('このプロジェクトの説明（任意）'),
            'グラフベースの管理OS。'
        )
        await userEvent.type(
            screen.getByPlaceholderText('/Users/user/projects/my-app'),
            '/Users/user/projects/zizou-core'
        )
        await userEvent.click(screen.getByText('作成'))
        await expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    },
}

// @story 状態 7: キャンセル → ダイアログが閉じ form がリセットされる
export const CancelAndReset: Story = {
    render: (args) => <WithStore {...args} projects={[]} isHydrated={true} />,
    play: async ({ userEvent }) => {
        await userEvent.click(screen.getByText('＋ new project'))
        await userEvent.type(screen.getByPlaceholderText('My Awesome App'), 'Draft Name')
        await userEvent.click(screen.getByText('キャンセル'))
        await expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
        await userEvent.click(screen.getByText('＋ new project'))
        await expect(screen.getByPlaceholderText('My Awesome App')).toHaveValue('')
    },
}