/**
 * @context CTX-4/5/7/8: EditableNode — インライン編集・タイプ・ステータスの視覚・インタラクション検証
 * @bom docs/bom/graph.ts (GraphNodeData)
 * @story
 * === CTX-4/5/7 ===
 * 1.  通常状態: label と description が表示される
 * 2.  description なし: label のみ表示される
 * 3.  [CTX-7] ダブルクリックで onStartEditing が呼ばれる
 * 4.  [CTX-7] isEditing=true: inline input が表示され label の初期値が入る
 * 5.  inline input に新しい値を入力して Enter で確定すると updateNodeData が呼ばれる
 * 6.  inline input に新しい値を入力して blur で確定すると updateNodeData が呼ばれる
 * 7.  Escape でキャンセルすると onStopEditing が呼ばれ updateNodeData は呼ばれない
 * 8.  label を空にして Enter で確定しても updateNodeData は呼ばれない
 * 9.  [CTX-5] 選択中: border が vermillion になる
 * === CTX-8 ===
 * 10. nodeType="git"      — 緑ボーダー + "git" バッジ
 * 11. nodeType="validate" — 青ボーダー + "validate" バッジ
 * 12. nodeType="analyze"  — 黄ボーダー + "analyze" バッジ
 * 13. nodeType="llm"      — 紫ボーダー + "llm" バッジ
 * 14. nodeType="custom"   — グレーボーダー + "custom" バッジ
 * 15. nodeType 未設定     — custom 扱い
 * 16. status="todo"       — 通常表示・チェックボックス未チェック
 * 17. status="doing"      — ハイライト表示・チェックボックス未チェック
 * 18. status="done"       — 薄表示・チェックボックスチェック済み
 * 19. チェックボックスをクリックすると onUpdateNode({ status }) が呼ばれる
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { ReactFlowProvider } from '@xyflow/react'
import { expect, fn, userEvent } from 'storybook/test'
import type { EditableNodeProps } from '@/components/nodes/EditableNode'
import { EditableNode } from '@/components/nodes/EditableNode'

const meta: Meta<EditableNodeProps> = {
    component: EditableNode,
    title: 'Project Detail/EditableNode',
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
        isEditing: false,
        onUpdateNode: fn(),
        onStartEditing: fn(),
        onStopEditing: fn(),
    },
}
export default meta
type Story = StoryObj<EditableNodeProps>

// =============================================================================
// CTX-4/5/7
// =============================================================================

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

// @story 状態 3: [CTX-7] ダブルクリックで onStartEditing が呼ばれる
export const DoubleClickToEdit: Story = {
    args: {
        data: { label: 'ProjectGrid.tsx', description: 'カードグリッド表示' },
        isEditing: false,
    },
    play: async ({ canvas, args }) => {
        await userEvent.dblClick(canvas.getByTestId('editable-node'))
        await expect(args.onStartEditing).toHaveBeenCalledOnce()
    },
}

// @story 状態 4: [CTX-7] isEditing=true — inline input が表示される
export const Editing: Story = {
    args: {
        data: { label: 'ProjectGrid.tsx' },
        isEditing: true,
    },
    play: async ({ canvas }) => {
        const input = canvas.getByTestId('inline-input') as HTMLInputElement
        await expect(input).toBeVisible()
        await expect(input).toHaveValue('ProjectGrid.tsx')
    },
}

// @story 状態 5: Enter で確定 → onUpdateNode が呼ばれる
export const CommitWithEnter: Story = {
    args: {
        data: { label: 'ProjectGrid.tsx' },
        isEditing: true,
    },
    play: async ({ canvas, args }) => {
        const input = canvas.getByTestId('inline-input')
        await userEvent.clear(input)
        await userEvent.type(input, 'NewLabel')
        await userEvent.keyboard('{Enter}')
        await expect(args.onUpdateNode).toHaveBeenCalledWith('node-001', { label: 'NewLabel' })
        await expect(args.onStopEditing).toHaveBeenCalledOnce()
    },
}

// @story 状態 6: blur で確定 → onUpdateNode が呼ばれる
export const CommitWithBlur: Story = {
    args: {
        data: { label: 'ProjectGrid.tsx' },
        isEditing: true,
    },
    play: async ({ canvas, args }) => {
        const input = canvas.getByTestId('inline-input')
        await userEvent.clear(input)
        await userEvent.type(input, 'BlurLabel')
        await userEvent.tab()
        await expect(args.onUpdateNode).toHaveBeenCalledWith('node-001', { label: 'BlurLabel' })
        await expect(args.onStopEditing).toHaveBeenCalledOnce()
    },
}

// @story 状態 7: Escape でキャンセル → onStopEditing が呼ばれ updateNodeData は呼ばれない
export const CancelWithEscape: Story = {
    args: {
        data: { label: 'ProjectGrid.tsx' },
        isEditing: true,
    },
    play: async ({ canvas, args }) => {
        const input = canvas.getByTestId('inline-input')
        await userEvent.clear(input)
        await userEvent.type(input, 'CancelledLabel')
        await userEvent.keyboard('{Escape}')
        await expect(args.onUpdateNode).not.toHaveBeenCalled()
        await expect(args.onStopEditing).toHaveBeenCalledOnce()
    },
}

// @story 状態 8: 空文字で Enter → onUpdateNode は呼ばれない
export const EmptyLabelNoCommit: Story = {
    args: {
        data: { label: 'ProjectGrid.tsx' },
        isEditing: true,
    },
    play: async ({ canvas, args }) => {
        const input = canvas.getByTestId('inline-input')
        await userEvent.clear(input)
        await userEvent.keyboard('{Enter}')
        await expect(args.onUpdateNode).not.toHaveBeenCalled()
    },
}

// @story 状態 9: [CTX-5] 選択中ハイライト（視覚確認）
export const Selected: Story = {
    args: {
        data: { label: 'ProjectGrid.tsx', description: 'カードグリッド表示' },
        selected: true,
    },
    play: async ({ canvas }) => {
        await expect(canvas.getByTestId('editable-node')).toBeVisible()
    },
}

// =============================================================================
// CTX-8: Node Type
// =============================================================================

// @story 10: nodeType="git"
export const TypeGit: Story = {
    args: { data: { label: 'ブランチ作成', nodeType: 'git', status: 'todo' } },
    play: async ({ canvas }) => {
        await expect(canvas.getByTestId('node-type-badge')).toHaveTextContent('git')
        await expect(canvas.getByTestId('editable-node').style.borderColor).toBeTruthy()
    },
}

// @story 11: nodeType="validate"
export const TypeValidate: Story = {
    args: { data: { label: 'テスト実行', nodeType: 'validate', status: 'todo' } },
    play: async ({ canvas }) => {
        await expect(canvas.getByTestId('node-type-badge')).toHaveTextContent('validate')
    },
}

// @story 12: nodeType="analyze"
export const TypeAnalyze: Story = {
    args: { data: { label: '依存分析', nodeType: 'analyze', status: 'todo' } },
    play: async ({ canvas }) => {
        await expect(canvas.getByTestId('node-type-badge')).toHaveTextContent('analyze')
    },
}

// @story 13: nodeType="llm"
export const TypeLlm: Story = {
    args: { data: { label: '実装', nodeType: 'llm', status: 'todo' } },
    play: async ({ canvas }) => {
        await expect(canvas.getByTestId('node-type-badge')).toHaveTextContent('llm')
    },
}

// @story 14: nodeType="custom"
export const TypeCustom: Story = {
    args: { data: { label: 'カスタム', nodeType: 'custom', status: 'todo' } },
    play: async ({ canvas }) => {
        await expect(canvas.getByTestId('node-type-badge')).toHaveTextContent('custom')
    },
}

// @story 15: nodeType 未設定 → custom 扱い
export const TypeUnset: Story = {
    args: { data: { label: '未分類ノード' } },
    play: async ({ canvas }) => {
        await expect(canvas.getByTestId('editable-node')).toBeInTheDocument()
    },
}

// =============================================================================
// CTX-8: Node Status
// =============================================================================

// @story 16: status="todo"
export const StatusTodo: Story = {
    args: { data: { label: 'タスク', nodeType: 'git', status: 'todo' } },
    play: async ({ canvas }) => {
        const checkbox = canvas.getByTestId('node-status-checkbox') as HTMLInputElement
        await expect(checkbox.checked).toBe(false)
        await expect(canvas.getByTestId('editable-node')).toHaveAttribute('data-status', 'todo')
    },
}

// @story 17: status="doing"
export const StatusDoing: Story = {
    args: { data: { label: '進行中', nodeType: 'llm', status: 'doing' } },
    play: async ({ canvas }) => {
        await expect(canvas.getByTestId('editable-node')).toHaveAttribute('data-status', 'doing')
        const checkbox = canvas.getByTestId('node-status-checkbox') as HTMLInputElement
        await expect(checkbox.checked).toBe(false)
    },
}

// @story 18: status="done"
export const StatusDone: Story = {
    args: { data: { label: '完了タスク', nodeType: 'validate', status: 'done' } },
    play: async ({ canvas }) => {
        await expect(canvas.getByTestId('editable-node')).toHaveAttribute('data-status', 'done')
        const checkbox = canvas.getByTestId('node-status-checkbox') as HTMLInputElement
        await expect(checkbox.checked).toBe(true)
    },
}

// @story 19: チェックボックス toggle
export const CheckboxToggle: Story = {
    args: {
        data: { label: 'トグル確認', nodeType: 'git', status: 'todo' },
        onUpdateNode: fn(),
    },
    play: async ({ canvas, args }) => {
        const checkbox = canvas.getByTestId('node-status-checkbox')
        await userEvent.click(checkbox)
        await expect(args.onUpdateNode).toHaveBeenCalledWith('node-001', { status: 'done' })
    },
}