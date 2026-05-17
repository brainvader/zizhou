/**
 * @context CTX-4: EditableNode — インライン編集の視覚・インタラクション検証
 * @bom docs/bom/graph.ts (GraphNodeData)
 * @story
 * 1. 通常状態: label と description が表示される
 * 2. description なし: label のみ表示される
 * 3. ダブルクリックで inline input に切り替わり label の初期値が入る
 * 4. inline input に新しい値を入力して Enter で確定すると updateNodeData が呼ばれる
 * 5. inline input に新しい値を入力して blur で確定すると updateNodeData が呼ばれる
 * 6. Escape でキャンセルすると label 表示に戻り updateNodeData は呼ばれない
 * 7. label を空にして Enter で確定しても updateNodeData は呼ばれない
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { ReactFlowProvider } from '@xyflow/react'
import { expect, fn } from 'storybook/test'
import type { EditableNodeProps } from '@/components/nodes/EditableNode'
import { EditableNode } from '@/components/nodes/EditableNode'

const meta: Meta<EditableNodeProps> = {
    component: EditableNode,
    title: 'Project Detail/EditableNode',
    parameters: { layout: 'centered' },
    decorators: [
        (Story) => (
            <ReactFlowProvider>
                <div style={{ width: 200, padding: 24 }}>
                    <Story />
                </div>
            </ReactFlowProvider>
        ),
    ],
    args: {
        id: 'node-001',
        data: { label: 'ProjectGrid.tsx' },
        selected: false,
        type: 'editableNode' as const,
        zIndex: 0,
        isConnectable: true,
        positionAbsoluteX: 0,
        positionAbsoluteY: 0,
        dragging: false,
        selectable: true,
        deletable: true,
        draggable: true,
        onUpdateNode: fn(),
    },
}
export default meta
type Story = StoryObj<EditableNodeProps>

// @story 状態 1: 通常状態（label + description）
export const Default: Story = {
    args: {
        data: { label: 'ProjectGrid.tsx', description: 'カードグリッド表示' },
    },
    play: async ({ canvas }) => {
        await expect(canvas.getByText('ProjectGrid.tsx')).toBeVisible()
        await expect(canvas.getByText('カードグリッド表示')).toBeVisible()
    },
}

// @story 状態 2: description なし
export const NoDescription: Story = {
    args: {
        data: { label: 'useProjectStore' },
    },
    play: async ({ canvas }) => {
        await expect(canvas.getByText('useProjectStore')).toBeVisible()
    },
}

// @story 状態 3: ダブルクリックで inline input に切り替わる
export const DoubleClickToEdit: Story = {
    args: {
        data: { label: 'ProjectGrid.tsx', description: 'カードグリッド表示' },
    },
    play: async ({ canvas, userEvent }) => {
        await userEvent.dblClick(canvas.getByTestId('editable-node-node-001'))
        const input = canvas.getByTestId('inline-input') as HTMLInputElement
        await expect(input).toBeVisible()
        await expect(input).toHaveValue('ProjectGrid.tsx')
    },
}

// @story 状態 4: Enter で確定 → onUpdateNode が呼ばれる
export const CommitWithEnter: Story = {
    args: {
        data: { label: 'ProjectGrid.tsx' },
    },
    play: async ({ canvas, userEvent, args }) => {
        await userEvent.dblClick(canvas.getByTestId('editable-node-node-001'))
        const input = canvas.getByTestId('inline-input')
        await userEvent.clear(input)
        await userEvent.type(input, 'NewLabel')
        await userEvent.keyboard('{Enter}')
        await expect(args.onUpdateNode).toHaveBeenCalledWith('node-001', { label: 'NewLabel' })
        await expect(canvas.queryByTestId('inline-input')).not.toBeInTheDocument()
    },
}

// @story 状態 5: blur で確定 → onUpdateNode が呼ばれる
export const CommitWithBlur: Story = {
    args: {
        data: { label: 'ProjectGrid.tsx' },
    },
    play: async ({ canvas, userEvent, args }) => {
        await userEvent.dblClick(canvas.getByTestId('editable-node-node-001'))
        const input = canvas.getByTestId('inline-input')
        await userEvent.clear(input)
        await userEvent.type(input, 'BlurLabel')
        await userEvent.tab()
        await expect(args.onUpdateNode).toHaveBeenCalledWith('node-001', { label: 'BlurLabel' })
    },
}

// @story 状態 6: Escape でキャンセル → 元の label に戻る
export const CancelWithEscape: Story = {
    args: {
        data: { label: 'ProjectGrid.tsx' },
    },
    play: async ({ canvas, userEvent, args }) => {
        await userEvent.dblClick(canvas.getByTestId('editable-node-node-001'))
        const input = canvas.getByTestId('inline-input')
        await userEvent.clear(input)
        await userEvent.type(input, 'CancelledLabel')
        await userEvent.keyboard('{Escape}')
        await expect(args.onUpdateNode).not.toHaveBeenCalled()
        await expect(canvas.getByText('ProjectGrid.tsx')).toBeVisible()
        await expect(canvas.queryByTestId('inline-input')).not.toBeInTheDocument()
    },
}

// @story 状態 7: 空文字で Enter → onUpdateNode は呼ばれない
export const EmptyLabelNoCommit: Story = {
    args: {
        data: { label: 'ProjectGrid.tsx' },
    },
    play: async ({ canvas, userEvent, args }) => {
        await userEvent.dblClick(canvas.getByTestId('editable-node-node-001'))
        const input = canvas.getByTestId('inline-input')
        await userEvent.clear(input)
        await userEvent.keyboard('{Enter}')
        await expect(args.onUpdateNode).not.toHaveBeenCalled()
    },
}