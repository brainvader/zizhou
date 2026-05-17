/**
 * @context CTX-7: ContextMenu — 視覚・インタラクション検証
 * @bom docs/bom/graph.ts
 * @story
 * 1. type='node': "Edit Label" と "Delete Node" が表示される
 * 2. type='edge': "Delete Edge" のみ表示される（"Edit Label" なし）
 * 3. "Delete Node" クリックで onDelete が呼ばれる
 * 4. "Edit Label" クリックで onEditLabel が呼ばれる
 * 5. "Delete Edge" クリックで onDelete が呼ばれる
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, within } from 'storybook/test'
import { ContextMenu } from '@/components/ContextMenu'

const meta: Meta<typeof ContextMenu> = {
    component: ContextMenu,
    title: 'Project Detail/ContextMenu',
    parameters: { layout: 'centered' },
    decorators: [
        (Story) => (
            <div style={{ position: 'relative', width: 300, height: 200 }}>
                <Story />
            </div>
        ),
    ],
    args: {
        x: 40,
        y: 40,
        onDelete: fn(),
        onClose: fn(),
        onEditLabel: fn(),
    },
}
export default meta
type Story = StoryObj<typeof ContextMenu>

// @story 状態 1: ノードコンテキストメニュー
export const NodeMenu: Story = {
    args: {
        type: 'node',
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement)
        // "Edit Label" と "Delete Node" が表示される
        await expect(canvas.getByTestId('menu-item-edit-label')).toBeVisible()
        await expect(canvas.getByTestId('menu-item-delete')).toBeVisible()
        // "Delete Node" のラベル確認
        await expect(canvas.getByTestId('menu-item-delete')).toHaveTextContent('Delete Node')
    },
}

// @story 状態 2: エッジコンテキストメニュー
export const EdgeMenu: Story = {
    args: {
        type: 'edge',
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement)
        // "Edit Label" は表示されない
        await expect(canvas.queryByTestId('menu-item-edit-label')).not.toBeInTheDocument()
        // "Delete Edge" が表示される
        await expect(canvas.getByTestId('menu-item-delete')).toBeVisible()
        await expect(canvas.getByTestId('menu-item-delete')).toHaveTextContent('Delete Edge')
    },
}

// @story 状態 3: Delete Node クリック
export const DeleteNodeClick: Story = {
    args: {
        type: 'node',
    },
    play: async ({ canvasElement, args }) => {
        const canvas = within(canvasElement)
        await userEvent.click(canvas.getByTestId('menu-item-delete'))
        await expect(args.onDelete).toHaveBeenCalledOnce()
    },
}

// @story 状態 4: Edit Label クリック
export const EditLabelClick: Story = {
    args: {
        type: 'node',
    },
    play: async ({ canvasElement, args }) => {
        const canvas = within(canvasElement)
        await userEvent.click(canvas.getByTestId('menu-item-edit-label'))
        await expect(args.onEditLabel).toHaveBeenCalledOnce()
    },
}

// @story 状態 5: Delete Edge クリック
export const DeleteEdgeClick: Story = {
    args: {
        type: 'edge',
    },
    play: async ({ canvasElement, args }) => {
        const canvas = within(canvasElement)
        await userEvent.click(canvas.getByTestId('menu-item-delete'))
        await expect(args.onDelete).toHaveBeenCalledOnce()
    },
}