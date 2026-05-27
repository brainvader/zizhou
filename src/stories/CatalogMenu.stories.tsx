/**
 * @context CTX-9: CatalogMenu — 視覚・インタラクション検証
 * @bom docs/bom/graph.ts (CatalogEntry, NODE_CATALOG)
 * @story
 * 1. 初期表示: 検索窓とカテゴリ別エントリ一覧が表示される
 * 2. 検索窓に "git" と入力するとgitエントリのみ表示される
 * 3. 検索窓に "commit" と入力するとGit Commitのみ表示される
 * 4. マッチしないクエリを入力すると "No results" が表示される
 * 5. エントリをクリックすると onSelectEntry が呼ばれる
 * 6. エントリをクリックすると onClose が呼ばれる
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, within } from 'storybook/test'
import { CatalogMenu } from '@/components/CatalogMenu'

const meta: Meta<typeof CatalogMenu> = {
    component: CatalogMenu,
    title: 'Project Detail/CatalogMenu',
    parameters: { layout: 'centered' },
    decorators: [
        (Story) => (
            <div style={{ position: 'relative', width: 400, height: 500 }}>
                <Story />
            </div>
        ),
    ],
    args: {
        x: 20,
        y: 20,
        onClose: fn(),
        onSelectEntry: fn(),
    },
}
export default meta
type Story = StoryObj<typeof CatalogMenu>

// @story 状態 1: 初期表示
export const Default: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement)
        await expect(canvas.getByTestId('catalog-search-input')).toBeVisible()
        await expect(canvas.getByTestId('catalog-category-git')).toBeVisible()
        await expect(canvas.getByTestId('catalog-category-validate')).toBeVisible()
        await expect(canvas.getByTestId('catalog-category-analyze')).toBeVisible()
        await expect(canvas.getByTestId('catalog-category-llm')).toBeVisible()
        await expect(canvas.getByTestId('catalog-category-custom')).toBeVisible()
    },
}

// @story 状態 2: "git" で絞り込み
export const SearchGit: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement)
        await userEvent.type(canvas.getByTestId('catalog-search-input'), 'git')
        await expect(canvas.getByTestId('catalog-category-git')).toBeVisible()
        await expect(canvas.queryByTestId('catalog-category-llm')).not.toBeInTheDocument()
        await expect(canvas.queryByTestId('catalog-category-validate')).not.toBeInTheDocument()
    },
}

// @story 状態 3: "commit" で絞り込み
export const SearchCommit: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement)
        await userEvent.type(canvas.getByTestId('catalog-search-input'), 'commit')
        await expect(canvas.getByTestId('catalog-entry-git-commit')).toBeVisible()
        await expect(canvas.queryByTestId('catalog-entry-git-status')).not.toBeInTheDocument()
    },
}

// @story 状態 4: マッチなし → "No results"
export const NoResults: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement)
        await userEvent.type(canvas.getByTestId('catalog-search-input'), 'xyznotexist')
        await expect(canvas.getByText('No results')).toBeVisible()
    },
}

// @story 状態 5-6: エントリクリックで onSelectEntry と onClose が呼ばれる
export const SelectEntry: Story = {
    play: async ({ canvasElement, args }) => {
        const canvas = within(canvasElement)
        await userEvent.click(canvas.getByTestId('catalog-entry-git-status'))
        await expect(args.onSelectEntry).toHaveBeenCalledOnce()
        await expect(args.onSelectEntry).toHaveBeenCalledWith(
            expect.objectContaining({ label: 'Git Status', service: 'git' })
        )
        await expect(args.onClose).toHaveBeenCalledOnce()
    },
}