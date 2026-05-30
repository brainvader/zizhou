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
import { expect, fn, userEvent, within } from 'storybook/test'
import { EditableNode } from '@/components/nodes/EditableNode'
import type { GraphNodeData } from '@/bom/graph'
import { ReactFlow, ReactFlowProvider } from '@xyflow/react'
import '@xyflow/react/dist/style.css'

// EditableNode は ReactFlow 内でしか動作しないため ReactFlow でラップする
const meta: Meta<typeof EditableNode> = {
    component: EditableNode,
    title: 'Project Detail/NodeExecute',
    parameters: { layout: 'fullscreen' },
    decorators: [
        (Story) => (
            <div style={{ width: '100%', height: 400 }}>
                <ReactFlowProvider>
                    <ReactFlow
                        nodes={[]}
                        edges={[]}
                        nodeTypes={{ editableNode: Story as any }}
                    >
                    </ReactFlow>
                </ReactFlowProvider>
            </div>
        ),
    ],
}
export default meta
type Story = StoryObj<typeof EditableNode>

const baseArgs = {
    id: 'node-001',
    type: 'editableNode' as const,
    positionAbsoluteX: 100,
    positionAbsoluteY: 100,
    zIndex: 0,
    dragging: false,
    draggable: true,
    selectable: true,
    deletable: true,
    selected: false,
    isConnectable: true,
    onRun: fn(),
}

// @story 1: service あり → "▶ Run" ボタン表示
export const WithRunButton: Story = {
    args: {
        ...baseArgs,
        data: {
            label: 'Git Status',
            service: 'git',
            provider: 'local',
            nodeType: 'git',
        } as GraphNodeData,
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement)
        await expect(canvas.getByTestId('btn-run-node')).toBeVisible()
        await expect(canvas.getByTestId('btn-run-node')).toHaveTextContent('▶ Run')
    },
}

// @story 2: service なし → "▶ Run" ボタン非表示
export const WithoutRunButton: Story = {
    args: {
        ...baseArgs,
        data: {
            label: 'Plain Node',
        } as GraphNodeData,
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement)
        await expect(canvas.queryByTestId('btn-run-node')).not.toBeInTheDocument()
    },
}

// @story 3: "▶ Run" クリック → onRun が呼ばれる
export const RunButtonClick: Story = {
    args: {
        ...baseArgs,
        data: {
            label: 'Git Status',
            service: 'git',
            provider: 'local',
            nodeType: 'git',
        } as GraphNodeData,
    },
    play: async ({ canvasElement, args }) => {
        const canvas = within(canvasElement)
        await userEvent.click(canvas.getByTestId('btn-run-node'))
        await expect(args.onRun).toHaveBeenCalledOnce()
    },
}

// @story 4: isRunning=true → "⟳ Running…" 表示
export const RunningState: Story = {
    args: {
        ...baseArgs,
        isRunning: true,
        data: {
            label: 'Git Status',
            service: 'git',
            provider: 'local',
            nodeType: 'git',
        } as GraphNodeData,
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement)
        const btn = canvas.getByTestId('btn-run-node')
        await expect(btn).toBeVisible()
        await expect(btn).toHaveAttribute('data-running', 'true')
    },
}