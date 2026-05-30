/**
 * @context  CTX-14: NODE EXECUTE DISPATCH — 視覚・インタラクション検証
 * @bom      docs/bom/execute.ts (ExecuteRequest, ExecuteResponse)
 * @story
 *   1. type='node' / service='git':  "Run Node" 項目が表示される
 *   2. type='node' / service=null:   "Run Node" 項目が表示されない
 *   3. "Run Node" クリックで onRunNode が呼ばれてメニューが閉じる
 *   4. runningNodeId === nodeId のとき "Run Node" がスピナー表示になる（実行中）
 * @output   src/components/ContextMenu.tsx
 *           src/components/GraphEditor.tsx
 */

import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, within } from 'storybook/test'
import { ContextMenu } from '@/components/ContextMenu'

const meta: Meta<typeof ContextMenu> = {
    component: ContextMenu,
    title: 'Project Detail/ContextMenu/CTX-14 Run Node',
    parameters: { layout: 'centered' },
    decorators: [
        (Story) => (
            <div style={{ position: 'relative', width: 300, height: 250 }}>
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
        onSetNodeType: fn(),
        onRunNode: fn(),
    },
}
export default meta
type Story = StoryObj<typeof ContextMenu>

// @story 1: service あり → "Run Node" 表示
export const NodeWithService: Story = {
    args: {
        type: 'node',
        service: 'git',
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement)
        await expect(canvas.getByTestId('menu-item-run-node')).toBeVisible()
        await expect(canvas.getByTestId('menu-item-run-node')).toHaveTextContent('Run Node')
    },
}

// @story 2: service なし → "Run Node" 非表示
export const NodeWithoutService: Story = {
    args: {
        type: 'node',
        service: null,
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement)
        await expect(canvas.queryByTestId('menu-item-run-node')).not.toBeInTheDocument()
    },
}

// @story 3: "Run Node" クリック → onRunNode が呼ばれる
export const RunNodeClick: Story = {
    args: {
        type: 'node',
        service: 'git',
    },
    play: async ({ canvasElement, args }) => {
        const canvas = within(canvasElement)
        await userEvent.click(canvas.getByTestId('menu-item-run-node'))
        await expect(args.onRunNode).toHaveBeenCalledOnce()
    },
}

// @story 4: running 中はスピナー / 非活性
export const RunNodeRunning: Story = {
    args: {
        type: 'node',
        service: 'git',
        isRunning: true,
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement)
        const item = canvas.getByTestId('menu-item-run-node')
        await expect(item).toBeVisible()
        // running 中は aria-disabled または data-running 属性で表現
        await expect(item).toHaveAttribute('data-running', 'true')
    },
}