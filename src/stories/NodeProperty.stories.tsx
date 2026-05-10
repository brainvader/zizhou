/**
 * @context NodeProperty
 * @bom docs/bom/graph.ts
 * @story
 * 1. ノードが選択されている状態でパネルを開く
 * 2. 選択ノードの name・description が表示される
 * 3. description がないノードは name のみ表示される
 * 4. selectedNodeId が null のとき何も表示されない（空白）
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
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

// @story 状態 4: 未選択（空白）
export const Empty: Story = {
    args: {
        selectedNodeId: null,
        nodes: mockNodes,
    },
    play: async ({ canvas }) => {
        await expect(canvas.queryByText('name')).not.toBeInTheDocument()
        await expect(canvas.queryByText('description')).not.toBeInTheDocument()
    },
}

// @story 状態 3: ノード選択済み（description なし）
export const WithoutDescription: Story = {
    args: {
        selectedNodeId: 'node-002',
        nodes: mockNodes,
    },
    play: async ({ canvas }) => {
        await expect(canvas.getByText('useProjectStore')).toBeVisible()
        await expect(canvas.queryByText('description')).not.toBeInTheDocument()
    },
}

// @story 状態 1-2: ノード選択済み（description あり）
export const WithDescription: Story = {
    args: {
        selectedNodeId: 'node-001',
        nodes: mockNodes,
    },
    play: async ({ canvas }) => {
        await expect(canvas.getByText('ProjectGrid.tsx')).toBeVisible()
        await expect(canvas.getByText('カードグリッド表示。projects[] を一覧表示する。')).toBeVisible()
    },
}