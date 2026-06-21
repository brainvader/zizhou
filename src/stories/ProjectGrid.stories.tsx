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
import { expect, screen, waitFor } from 'storybook/test'
import { ProjectGrid } from '@/components/ProjectGrid'
import { useProjectStore } from '@/store/useProjectStore'
import { useEffect } from 'react'

/** Storybook 用 Link スタブ（Router context 不要） */
const StubLink = ({ children, className, 'data-testid': testId }: { children: React.ReactNode; className?: string; 'data-testid'?: string }) => (
    <a href="#" className={className} data-testid={testId}>{children}</a>
)

// Zustand ストアの状態型からプロジェクトの配列型を安全に抽出
type StoreState = ReturnType<typeof useProjectStore.getState>
type ProjectListType = StoreState['projects']

/** ストア状態を注入するラッパー */
const WithStore = ({
    projects = [],
    isHydrated = true,
    ...props
}: React.ComponentProps<typeof ProjectGrid> & {
    projects?: ProjectListType
    isHydrated?: boolean
}) => {
    useEffect(() => {
        useProjectStore.setState({ projects, isHydrated })
    }, [projects, isHydrated])

    return <ProjectGrid {...props} />
}

const meta: Meta<typeof ProjectGrid> = {
    component: ProjectGrid,
    title: 'Project/Grid',
    parameters: { layout: 'fullscreen' },
    args: {
        LinkComponent: StubLink,
    },
}
export default meta
type Story = StoryObj<typeof ProjectGrid>

// @story 状態 1: projects が空
export const Empty: Story = {
    render: (args) => <WithStore {...args} projects={[]} isHydrated={true} />,
    play: async () => {
        const newProjectBtn = await screen.findByText('＋ new project')
        await expect(newProjectBtn).toBeVisible()
    },
}

// @story 状態 2: projects が存在する
export const WithProjectList: Story = {
    render: (args) => (
        <WithStore
            {...args}
            projects={[
                { id: '1', name: '地蔵 Core', description: 'コアシステム', rootPath: '/projects/zizhou' },
                { id: '2', name: 'Zizou Web', description: 'Webフロント', rootPath: '/projects/zizou-web' },
            ]}
            isHydrated={true}
        />
    ),
    play: async () => {
        await expect(await screen.findByText('地蔵 Core')).toBeVisible()
        await expect(screen.getByText('Zizou Web')).toBeVisible()
    },
}

// @story 状態 3: hydrated が false のとき「＋ new project」は disabled になる
export const NotHydrated: Story = {
    render: (args) => <WithStore {...args} projects={[]} isHydrated={false} />,
    play: async () => {
        const btn = await screen.findByRole('button', { name: '＋ new project' })
        await expect(btn).toBeDisabled()
    },
}

// @story 状態 4: 「＋ new project」をクリックするとダイアログが開く
export const OpenDialog: Story = {
    render: (args) => <WithStore {...args} projects={[]} isHydrated={true} />,
    play: async ({ canvas, userEvent }) => {
        await userEvent.click(canvas.getByRole('button', { name: /new project/ }))
        // ダイアログ要素が DOM にマウントされ、コンテンツがレンダーされるのを待機
        await screen.findByRole('dialog')
        await screen.findByText('Create New Project')
    },
}

// @story 状態 5: name 空で「作成」を押すとバリデーションエラーが表示される
export const ValidationError: Story = {
    render: (args) => <WithStore {...args} projects={[]} isHydrated={true} />,
    play: async ({ userEvent }) => {
        const btn = await screen.findByText('＋ new project')
        await userEvent.click(btn)

        // ✨【重要】インプット要素が出現し、Radix UI のフォーカスロックが
        // 完全に安定する（インタラクティブになる）まで非同期ポーリング待機を実行
        const nameInput = await screen.findByPlaceholderText('My Awesome App')
        await waitFor(() => expect(nameInput).toBeVisible())

        // テキストマッチングではなく、アクセシビリティロールで「作成」ボタンを厳格に捕捉してクリック
        const submitBtn = screen.getByRole('button', { name: '作成' })
        await userEvent.click(submitBtn)

        // バリデーションエラーテキストの表出を確実に追尾
        const errorMsg = await screen.findByText('name は必須です')
        await expect(errorMsg).toBeVisible()
        await expect(await screen.findByText('root path は必須です')).toBeVisible()
    },
}

// @story 状態 6: フォームに入力して「作成」をクリックするとダイアログが閉じる
export const SubmitSuccess: Story = {
    render: (args) => <WithStore {...args} projects={[]} isHydrated={true} onCreateProject={async (name: string, description?: string, rootPath?: string) => ({ id: 'new-id', name, description, rootPath: rootPath ?? '' })} />,
    play: async ({ userEvent }) => {
        const newProjectBtn = await screen.findByText('＋ new project')
        await userEvent.click(newProjectBtn)

        const nameInput = await screen.findByPlaceholderText('My Awesome App')
        await userEvent.type(nameInput, '地蔵 Core')

        const descInput = screen.getByPlaceholderText('このプロジェクトの説明（任意）')
        await userEvent.type(descInput, 'グラフベースの管理OS。')

        const rootPathInput = screen.getByPlaceholderText('/Users/user/projects/my-app')
        await userEvent.type(rootPathInput, '/projects/zizhou')

        const submitBtn = screen.getByRole('button', { name: '作成' })
        await userEvent.click(submitBtn)

        // ダイアログが消滅したことを非同期でアサーション (waitFor を併用)
        await waitFor(() => {
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
        })
    },
}

// @story 状態 7: 「キャンセル」でダイアログが閉じ form がリセットされる
export const CancelAndReset: Story = {
    render: (args) => <WithStore {...args} projects={[]} isHydrated={true} />,
    play: async ({ userEvent }) => {
        const newProjectBtn = await screen.findByText('＋ new project')
        await userEvent.click(newProjectBtn)

        const nameInput = await screen.findByPlaceholderText('My Awesome App')
        await userEvent.type(nameInput, 'Draft Name')

        const cancelBtn = screen.getByRole('button', { name: 'キャンセル' })
        await userEvent.click(cancelBtn)

        await waitFor(() => {
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
        })
    },
}