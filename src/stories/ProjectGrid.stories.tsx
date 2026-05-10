/**
 * @context ProjectGrid
 * @bom docs/bom/project.ts
 * @story
 * 1. projects[] が空のとき「＋ new project」カードのみ表示される
 * 2. projects[] があるときプロジェクトカードが表示される
 * 3. isHydrated が false のとき「＋ new project」は disabled になる
 * 4. 「＋ new project」をクリックするとダイアログが開く
 * 5. フォームに入力して「作成」をクリックすると addProject が呼ばれる
 * 6. バリデーションエラー時はエラーメッセージが表示される
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { RouterProvider, createRouter, createMemoryHistory } from '@tanstack/react-router'
import { router as appRouter } from '@/router'
import { ProjectGrid } from '@/components/ProjectGrid'
import { useProjectStore } from '@/store/useProjectStore'
import { useEffect } from 'react'

const meta: Meta<typeof ProjectGrid> = {
    component: ProjectGrid,
    title: 'Projects/ProjectGrid',
    parameters: { layout: 'fullscreen' },
    decorators: [
        (Story) => {
            const memoryRouter = createRouter({
                ...appRouter.options,
                history: createMemoryHistory({ initialEntries: ['/'] }),
            })
            return <RouterProvider router={memoryRouter} defaultComponent={() => <Story />} />
        },
    ],
}
export default meta
type Story = StoryObj<typeof ProjectGrid>

// ストアにプロジェクトを注入するラッパー
const WithProjects = (props: React.ComponentProps<typeof ProjectGrid>) => {
    useEffect(() => {
        useProjectStore.setState({
            projects: [
                { id: 'proj-001', name: '地蔵 Core', description: 'グラフベースのプロジェクト管理OS。', rootPath: '/Users/user/projects/zizou-core' },
                { id: 'proj-002', name: 'Visual Thinkering', description: '', rootPath: '/Users/user/projects/vt' },
            ]
        })
        return () => useProjectStore.setState({ projects: [] })
    }, [])
    return <ProjectGrid {...props} />
}

// @story 状態 1: 空（projects[] なし）
export const Empty: Story = {
    args: { isHydrated: true },
}

// @story 状態 2: プロジェクトあり
export const WithProjectList: Story = {
    args: { isHydrated: true },
    render: (args) => <WithProjects {...args} />,
}

// @story 状態 3: ハイドレーション前（disabled）
export const NotHydrated: Story = {
    args: { isHydrated: false },
}