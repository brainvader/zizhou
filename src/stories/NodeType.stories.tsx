/**
 * @context  CTX-8: Node Type / Status — 視覚・インタラクション検証
 * @bom      docs/bom/graph.ts (NodeType, NodeStatus, GraphNodeData)
 * @story
 * === EditableNode ===
 * 1.  nodeType="git"      — 緑ボーダー + "git" バッジ
 * 2.  nodeType="validate" — 青ボーダー + "validate" バッジ
 * 3.  nodeType="analyze"  — 黄ボーダー + "analyze" バッジ
 * 4.  nodeType="llm"      — 紫ボーダー + "llm" バッジ
 * 5.  nodeType="custom"   — グレーボーダー + "custom" バッジ
 * 6.  nodeType 未設定     — custom と同じグレーボーダー（バッジなし or "custom"）
 * 7.  status="todo"       — 通常表示・チェックボックス未チェック
 * 8.  status="doing"      — ハイライト表示・チェックボックス未チェック
 * 9.  status="done"       — 薄表示・チェックボックスチェック済み
 * 10. チェックボックスをクリックすると onUpdateNode({ status }) が呼ばれる
 * === ContextMenu ===
 * 11. type="node": SET TYPE セクションと5項目が表示される
 * 12. type="edge": SET TYPE セクションが表示されない
 * 13. type item クリックで onSetNodeType が呼ばれる
 * === NodeProperty ===
 * 14. status セレクトが表示される（todo/doing/done の3択）
 * 15. セレクト変更で onUpdateNode({ status }) が呼ばれる
 */

import type { Meta, StoryObj } from '@storybook/react-vite'
import { ReactFlowProvider } from '@xyflow/react'
import { expect, fn, userEvent } from 'storybook/test'
import type { Node } from '@xyflow/react'
import type { EditableNodeProps } from '@/components/nodes/EditableNode'
import type { GraphNodeData } from '@/bom/graph'
import { EditableNode } from '@/components/nodes/EditableNode'
import { ContextMenu } from '@/components/ContextMenu'
import { NodeProperty } from '@/components/NodeProperty'

// =============================================================================
// EditableNode Stories
// =============================================================================

const editableMeta: Meta<EditableNodeProps> = {
    component: EditableNode,
    title: 'Project Detail/CTX-8/EditableNode',
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
    },
}
export default editableMeta
type EditableStory = StoryObj<EditableNodeProps>

// @story 1: git
export const TypeGit: EditableStory = {
    args: { data: { label: 'ブランチ作成', nodeType: 'git', status: 'todo' } },
    play: async ({ canvas }) => {
        await expect(canvas.getByTestId('node-type-badge')).toHaveTextContent('git')
        const node = canvas.getByTestId('editable-node')
        await expect(node.style.borderColor).toBeTruthy()
    },
}

// @story 2: validate
export const TypeValidate: EditableStory = {
    args: { data: { label: 'テスト実行', nodeType: 'validate', status: 'todo' } },
    play: async ({ canvas }) => {
        await expect(canvas.getByTestId('node-type-badge')).toHaveTextContent('validate')
    },
}

// @story 3: analyze
export const TypeAnalyze: EditableStory = {
    args: { data: { label: '依存分析', nodeType: 'analyze', status: 'todo' } },
    play: async ({ canvas }) => {
        await expect(canvas.getByTestId('node-type-badge')).toHaveTextContent('analyze')
    },
}

// @story 4: llm
export const TypeLlm: EditableStory = {
    args: { data: { label: '実装', nodeType: 'llm', status: 'todo' } },
    play: async ({ canvas }) => {
        await expect(canvas.getByTestId('node-type-badge')).toHaveTextContent('llm')
    },
}

// @story 5: custom（明示指定）
export const TypeCustom: EditableStory = {
    args: { data: { label: 'カスタム', nodeType: 'custom', status: 'todo' } },
    play: async ({ canvas }) => {
        await expect(canvas.getByTestId('node-type-badge')).toHaveTextContent('custom')
    },
}

// @story 6: nodeType 未設定 → custom 扱い
export const TypeUnset: EditableStory = {
    args: { data: { label: '未分類ノード' } },
    play: async ({ canvas }) => {
        await expect(canvas.getByTestId('editable-node')).toBeInTheDocument()
    },
}

// @story 7: status=todo
export const StatusTodo: EditableStory = {
    args: { data: { label: 'タスク', nodeType: 'git', status: 'todo' } },
    play: async ({ canvas }) => {
        const checkbox = canvas.getByTestId('node-status-checkbox') as HTMLInputElement
        await expect(checkbox.checked).toBe(false)
        await expect(canvas.getByTestId('editable-node')).not.toHaveAttribute('data-status', 'done')
    },
}

// @story 8: status=doing
export const StatusDoing: EditableStory = {
    args: { data: { label: '進行中', nodeType: 'llm', status: 'doing' } },
    play: async ({ canvas }) => {
        await expect(canvas.getByTestId('editable-node')).toHaveAttribute('data-status', 'doing')
        const checkbox = canvas.getByTestId('node-status-checkbox') as HTMLInputElement
        await expect(checkbox.checked).toBe(false)
    },
}

// @story 9: status=done
export const StatusDone: EditableStory = {
    args: { data: { label: '完了タスク', nodeType: 'validate', status: 'done' } },
    play: async ({ canvas }) => {
        await expect(canvas.getByTestId('editable-node')).toHaveAttribute('data-status', 'done')
        const checkbox = canvas.getByTestId('node-status-checkbox') as HTMLInputElement
        await expect(checkbox.checked).toBe(true)
    },
}

// @story 10: チェックボックス toggle
export const CheckboxToggle: EditableStory = {
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

// =============================================================================
// ContextMenu Stories  (別ファイルにしてもよいが CTX-8 スコープで一括管理)
// =============================================================================

// NOTE: Storybook は default export を1ファイル1つに制限するため、
//       ContextMenu / NodeProperty の Story は別ファイルに分割すること。
// → docs/specs/ctx-8-context-menu.stories.tsx / ctx-8-node-property.stories.tsx に分ける。
// 以下はコンポーネント単体テストのコード参考用コメントとして残す。

/*
ContextMenu @story 11-13:
  export const NodeTypeMenu: Story = {
      args: { type: 'node', x: 0, y: 0, onDelete: fn(), onClose: fn(), onSetNodeType: fn() },
      play: async ({ canvas, args }) => {
          await expect(canvas.getByTestId('menu-section-set-type')).toBeVisible()
          await userEvent.click(canvas.getByTestId('menu-item-type-git'))
          await expect(args.onSetNodeType).toHaveBeenCalledWith('git')
      },
  }

NodeProperty @story 14-15:
  export const WithStatus: Story = {
      args: { selectedNodeId: 'n1', selectedNodeIds: ['n1'],
              nodes: [{ id: 'n1', position: { x:0, y:0 }, data: { label:'A', status:'doing' } }],
              onUpdateNode: fn() },
      play: async ({ canvas, args }) => {
          const select = canvas.getByTestId('select-status')
          await expect(select).toHaveValue('doing')
          await userEvent.selectOptions(select, 'done')
          await expect(args.onUpdateNode).toHaveBeenCalledWith('n1', { status: 'done' })
      },
  }
*/