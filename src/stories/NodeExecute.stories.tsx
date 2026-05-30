/**
 * @context  CTX-14: NODE EXECUTE DISPATCH — 視覚・インタラクション検証
 * @bom      docs/bom/execute.ts (ExecuteRequest, ExecuteResponse)
 * @story
 *   1. service='git' ノード: "▶ Run" ボタンが表示される
 *   2. service なしノード: "▶ Run" ボタンが表示されない
 *   3. "▶ Run" クリックで onRun が呼ばれる
 *   4. isRunning=true のとき "⟳ Running…" 表示になる
 * @output   src/components/nodes/EditableNode.tsx
 */

import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent } from 'storybook/test'
import { ReactFlowProvider } from '@xyflow/react'
import type { EditableNodeProps } from '@/components/nodes/EditableNode'
import { EditableNode } from '@/components/nodes/EditableNode'
import type { GraphNodeData } from '@/bom/graph'

const meta: Meta<EditableNodeProps> = {
    component: EditableNode,
    title: 'Project Detail/NodeExecute',
    parameters: { layout: 'centered' },
    decorators: [
        (Story) => (
            <ReactFlowProvider>
                <div style={{ width: 220, padding: 24 }}>
                    <Story />
                </div>
            </ReactFlowProvider>
        ),
    ],
    args: {
        id: 'node-001',
        type: 'editableNode' as const,
        zIndex: 0,
        isConnectable: true,
        positionAbsoluteX: 0,
        positionAbsoluteY: 0,
        dragging: false,
        selectable: true,
        deletable: true,
        draggable: true,
        selected: false,
        isEditing: false,
        onUpdateNode: fn(),
        onStartEditing: fn(),
        onStopEditing: fn(),
        onRun: fn(),
    },
}
export default meta
type Story = StoryObj<EditableNodeProps>

// @story 1: service あり → "▶ Run" ボタン表示
export const WithRunButton: Story = {
    args: {
        data: {
            label: 'Git Status',
            service: 'git',
            provider: 'local',
            nodeType: 'git',
        } as GraphNodeData,
    },
    play: async ({ canvas }) => {
        await expect(canvas.getByTestId('btn-run-node')).toBeVisible()
        await expect(canvas.getByTestId('btn-run-node')).toHaveTextContent('▶ Run')
    },
}

// @story 2: service なし → "▶ Run" ボタン非表示
export const WithoutRunButton: Story = {
    args: {
        data: {
            label: 'Plain Node',
        } as GraphNodeData,
    },
    play: async ({ canvas }) => {
        await expect(canvas.queryByTestId('btn-run-node')).not.toBeInTheDocument()
    },
}

// @story 3: "▶ Run" クリック → onRun が呼ばれる
export const RunButtonClick: Story = {
    args: {
        data: {
            label: 'Git Status',
            service: 'git',
            provider: 'local',
            nodeType: 'git',
        } as GraphNodeData,
        onRun: fn(),
    },
    play: async ({ canvas, args }) => {
        await userEvent.click(canvas.getByTestId('btn-run-node'))
        await expect(args.onRun).toHaveBeenCalledOnce()
    },
}

// @story 4: isRunning=true → "⟳ Running…" 表示
export const RunningState: Story = {
    args: {
        isRunning: true,
        data: {
            label: 'Git Status',
            service: 'git',
            provider: 'local',
            nodeType: 'git',
        } as GraphNodeData,
    },
    play: async ({ canvas }) => {
        const btn = canvas.getByTestId('btn-run-node')
        await expect(btn).toBeVisible()
        await expect(btn).toHaveAttribute('data-running', 'true')
    },
}