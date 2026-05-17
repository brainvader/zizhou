/**
 * @context CTX-4/5: NodeProperty — フォーム編集
 * @bom docs/bom/graph.ts (GraphNodeData, GraphStore.updateNodeData)
 * @story
 * 1. ノード選択時: label・description が input/textarea に表示される
 * 2. label を変更して blur → onUpdateNode が呼ばれる
 * 3. label を空にして blur → commit されずエラーが表示される
 * 4. description を変更して blur → onUpdateNode が呼ばれる
 * 5. 未選択状態（Empty）: 何も表示されない
 * 6. description なしのノード: description フィールドは空 textarea で表示される
 * 7. [CTX-5] 複数選択中: 何も表示されない（Visibility Guard）
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent } from 'storybook/test'
import type { Node } from '@xyflow/react'
import type { GraphNodeData } from '@/bom/graph'
import { NodeProperty } from '@/components/NodeProperty'

const meta: Meta<typeof NodeProperty> = {
    component: NodeProperty,
    title: 'Project Detail/NodeProperty',
    parameters: { layout: 'centered' },
}
export default meta
type Story = StoryObj<typeof NodeProperty>

const mockNodes: Node<GraphNodeData>[] = [
    {
        id: 'node-001',
        position: { x: 0, y: 0 },
        data: { label: 'ProjectGrid.tsx', description: 'カードグリッド表示。projects[] を一覧表示する。' },
    },
    {
        id: 'node-002',
        position: { x: 0, y: 0 },
        data: { label: 'useProjectStore' },
    },
]

// @story 状態 5: 未選択（空白）
export const Empty: Story = {
    args: {
        selectedNodeId: null,
        selectedNodeIds: [],
        nodes: mockNodes,
        onUpdateNode: fn(),
    },
    play: async ({ canvas }) => {
        await expect(canvas.queryByTestId('input-label')).not.toBeInTheDocument()
        await expect(canvas.queryByTestId('input-description')).not.toBeInTheDocument()
    },
}

// @story 状態 6: ノード選択済み（description なし）
export const WithoutDescription: Story = {
    args: {
        selectedNodeId: 'node-002',
        selectedNodeIds: ['node-002'],
        nodes: mockNodes,
        onUpdateNode: fn(),
    },
    play: async ({ canvas }) => {
        const input = canvas.getByTestId('input-label') as HTMLInputElement
        await expect(input.value).toBe('useProjectStore')
        const textarea = canvas.getByTestId('input-description') as HTMLTextAreaElement
        await expect(textarea.value).toBe('')
    },
}

// @story 状態 1: ノード選択済み（description あり）
export const WithDescription: Story = {
    args: {
        selectedNodeId: 'node-001',
        selectedNodeIds: ['node-001'],
        nodes: mockNodes,
        onUpdateNode: fn(),
    },
    play: async ({ canvas }) => {
        const input = canvas.getByTestId('input-label') as HTMLInputElement
        await expect(input.value).toBe('ProjectGrid.tsx')
        const textarea = canvas.getByTestId('input-description') as HTMLTextAreaElement
        await expect(textarea.value).toBe('カードグリッド表示。projects[] を一覧表示する。')
    },
}

// @story 状態 2: label 変更して blur → onUpdateNode が呼ばれる
export const LabelEdit: Story = {
    args: {
        selectedNodeId: 'node-001',
        selectedNodeIds: ['node-001'],
        nodes: mockNodes,
        onUpdateNode: fn(),
    },
    play: async ({ canvas, args }) => {
        const input = canvas.getByTestId('input-label')
        await userEvent.clear(input)
        await userEvent.type(input, 'NewComponent.tsx')
        await userEvent.tab()
        await expect(args.onUpdateNode).toHaveBeenCalledOnce()
        await expect(args.onUpdateNode).toHaveBeenCalledWith('node-001', { label: 'NewComponent.tsx' })
    },
}

// @story 状態 3: label を空にして blur → commit されずエラー表示
export const LabelEmptyValidation: Story = {
    args: {
        selectedNodeId: 'node-001',
        selectedNodeIds: ['node-001'],
        nodes: mockNodes,
        onUpdateNode: fn(),
    },
    play: async ({ canvas, args }) => {
        const input = canvas.getByTestId('input-label')
        await userEvent.clear(input)
        await userEvent.tab()
        await expect(args.onUpdateNode).not.toHaveBeenCalled()
        const error = canvas.getByTestId('error-label')
        await expect(error).toBeVisible()
    },
}

// @story 状態 4: description 変更して blur → onUpdateNode が呼ばれる
export const DescriptionEdit: Story = {
    args: {
        selectedNodeId: 'node-001',
        selectedNodeIds: ['node-001'],
        nodes: mockNodes,
        onUpdateNode: fn(),
    },
    play: async ({ canvas, args }) => {
        const textarea = canvas.getByTestId('input-description')
        await userEvent.clear(textarea)
        await userEvent.type(textarea, '更新した説明文')
        await userEvent.tab()
        await expect(args.onUpdateNode).toHaveBeenCalledOnce()
        await expect(args.onUpdateNode).toHaveBeenCalledWith('node-001', { description: '更新した説明文' })
    },
}

// @story 状態 7: [CTX-5] 複数選択中 — Visibility Guard により非表示
export const MultiSelectHidden: Story = {
    args: {
        selectedNodeId: 'node-001',
        selectedNodeIds: ['node-001', 'node-002'],
        nodes: mockNodes,
        onUpdateNode: fn(),
    },
    play: async ({ canvas }) => {
        await expect(canvas.queryByTestId('input-label')).not.toBeInTheDocument()
        await expect(canvas.queryByTestId('input-description')).not.toBeInTheDocument()
    },
}