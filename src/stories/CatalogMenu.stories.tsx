/**
 * @context CTX-13: CatalogMenu — useCatalogSearch 非同期化対応
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
import { expect, fn, userEvent, waitFor, within } from 'storybook/test'
import { CatalogMenu } from '@/components/CatalogMenu'
import { NODE_CATALOG } from '@/bom/graph'

// Storybook 用 catalogOptions:
// invoke の代わりに NODE_CATALOG を即時 resolve する関数を渡す。
// query は CatalogMenu 側ではなく useCatalogSearch に渡るが、
// Storybook では「決まったデータ構造が表示されること」の確認で十分。
const storybookCatalogOptions = {
    onGetAll: () => Promise.resolve(NODE_CATALOG),
    onSearch: (query: string) =>
        Promise.resolve(
            NODE_CATALOG.filter(
                (e) =>
                    e.label.toLowerCase().includes(query.toLowerCase()) ||
                    e.service.toLowerCase().includes(query.toLowerCase())
            )
        ),
}

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
        catalogOptions: storybookCatalogOptions,
    },
}
export default meta
type Story = StoryObj<typeof CatalogMenu>

// @story 状態 1: 初期表示
export const Default: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement)
        await expect(canvas.getByTestId('catalog-search-input')).toBeVisible()
        await waitFor(() => expect(canvas.getByTestId('catalog-category-git')).toBeVisible())
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
        await waitFor(() => expect(canvas.getByTestId('catalog-category-git')).toBeVisible())
        await userEvent.type(canvas.getByTestId('catalog-search-input'), 'git')
        await waitFor(() => expect(canvas.getByTestId('catalog-category-git')).toBeVisible())
        await expect(canvas.queryByTestId('catalog-category-llm')).not.toBeInTheDocument()
        await expect(canvas.queryByTestId('catalog-category-validate')).not.toBeInTheDocument()
    },
}

// @story 状態 3: "commit" で絞り込み
export const SearchCommit: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement)
        await waitFor(() => expect(canvas.getByTestId('catalog-category-git')).toBeVisible())
        await userEvent.type(canvas.getByTestId('catalog-search-input'), 'commit')
        await waitFor(() => expect(canvas.getByTestId('catalog-entry-git-commit')).toBeVisible())
        await expect(canvas.queryByTestId('catalog-entry-git-status')).not.toBeInTheDocument()
    },
}

// @story 状態 4: マッチなし → "No results"
export const NoResults: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement)
        await waitFor(() => expect(canvas.getByTestId('catalog-category-git')).toBeVisible())
        await userEvent.type(canvas.getByTestId('catalog-search-input'), 'xyznotexist')
        await waitFor(() => expect(canvas.getByText('No results')).toBeVisible())
    },
}

// @story 状態 5-6: エントリクリックで onSelectEntry と onClose が呼ばれる
export const SelectEntry: Story = {
    play: async ({ canvasElement, args }) => {
        const canvas = within(canvasElement)
        await waitFor(() => expect(canvas.getByTestId('catalog-entry-git-status')).toBeVisible())
        await userEvent.click(canvas.getByTestId('catalog-entry-git-status'))
        await expect(args.onSelectEntry).toHaveBeenCalledOnce()
        await expect(args.onSelectEntry).toHaveBeenCalledWith(
            expect.objectContaining({ label: 'Git Status', service: 'git' })
        )
        await expect(args.onClose).toHaveBeenCalledOnce()
    },
}