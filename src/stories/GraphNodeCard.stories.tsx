import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import { GraphNodeCard } from '@/components/GraphNodeCard'

const meta: Meta<typeof GraphNodeCard> = {
    component: GraphNodeCard,
    title: 'Workspace/GraphNodeCard',
    parameters: { layout: 'centered' },
    decorators: [
        (Story) => (
            <div className="bg-background text-foreground p-4 w-[200px]">
                <Story />
            </div>
        ),
    ],
}
export default meta
type Story = StoryObj<typeof GraphNodeCard>

/** @story component kind: ラベルと種別テキスト */
export const Component: Story = {
    args: {
        data: {
            id: 'add-todo-form',
            contextId: 'todo',
            label: 'AddTodoForm',
            kind: 'component',
        },
    },
    play: async ({ canvas }) => {
        await expect(canvas.getByText('AddTodoForm')).toBeVisible()
        await expect(canvas.getByText('component')).toBeVisible()
    },
}

/** @story hook kind + accent primary: 強調枠線 */
export const HookPrimary: Story = {
    args: {
        data: {
            id: 'use-todo-store',
            contextId: 'todo',
            label: 'useTodoStore',
            kind: 'hook',
            accent: 'primary',
        },
    },
    play: async ({ canvasElement }) => {
        const card = canvasElement.querySelector('[data-testid="graph-node-use-todo-store"]')
        await expect(card).toHaveClass('border-primary')
    },
}

/** @story external kind + accent dashed: 破線・暗背景 */
export const ExternalDashed: Story = {
    args: {
        data: {
            id: 'zustand',
            contextId: 'todo',
            label: 'zustand',
            kind: 'external',
            accent: 'dashed',
        },
    },
    play: async ({ canvasElement }) => {
        const card = canvasElement.querySelector('[data-testid="graph-node-zustand"]')
        await expect(card).toHaveClass('border-dashed')
    },
}

/** @story state kind */
export const State: Story = {
    args: {
        data: {
            id: 'global-store',
            contextId: 'todo',
            label: 'global-store',
            kind: 'state',
            accent: 'dashed',
        },
    },
}

/** @story feature kind: checklist を表示、種別テキストは非表示 */
export const Feature: Story = {
    args: {
        data: {
            id: 'foundation',
            contextId: 'foundation',
            label: 'グラフ基盤',
            kind: 'feature',
            checklist: [
                { label: 'SurrealDBのnode/edgeスキーマを定義する', done: true },
                { label: 'React Flowでグラフを描画する', done: false },
            ],
        },
    },
    play: async ({ canvas }) => {
        await expect(canvas.getByText('グラフ基盤')).toBeVisible()
        await expect(canvas.queryByText('feature')).not.toBeInTheDocument()
    },
}

/** @story feature kind: checklist が空でも壊れない */
export const FeatureEmptyChecklist: Story = {
    args: {
        data: {
            id: 'empty-feature',
            contextId: 'foundation',
            label: 'checklist無し',
            kind: 'feature',
            checklist: [],
        },
    },
}

/** @story selected: 選択時の強調表示 */
export const Selected: Story = {
    args: {
        data: {
            id: 'add-todo-form',
            contextId: 'todo',
            label: 'AddTodoForm',
            kind: 'component',
        },
        selected: true,
    },
    play: async ({ canvasElement }) => {
        const card = canvasElement.querySelector('[data-testid="graph-node-add-todo-form"]')
        await expect(card).toHaveClass('ring-primary')
    },
}
