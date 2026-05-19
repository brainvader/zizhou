/**
 * Slot 1: 発注用ヘッダー (JSDoc Metadata)
 * @context  CTX-8: Node Type / Status — ロジック検証
 * @bom      docs/bom/graph.ts (NodeType, NodeStatus, GraphNodeData, GraphStore.updateNodeData)
 * @story
 * 1. [GraphEditor] Set Type メニュー項目クリックで updateNodeData({ nodeType }) が呼ばれる
 * 2. [GraphEditor] Set Type メニューは type='node' のときのみ表示される
 * 3. [EditableNode] nodeType に応じてボーダー色が変わる（NODE_TYPE_COLOR）
 * 4. [EditableNode] status='done' のとき opacity が下がる
 * 5. [EditableNode] status='doing' のとき doing ハイライトが付く
 * 6. [EditableNode] チェックボックスをクリックすると todo→done が toggle する
 * 7. [EditableNode] チェックボックスをクリックすると done→todo が toggle する
 * 8. [NodeProperty] status セレクトを変更すると onUpdateNode({ status }) が呼ばれる
 * @output
 *   src/components/GraphEditor.tsx        — Set Type メニュー追加
 *   src/components/nodes/EditableNode.tsx — nodeType ボーダー・status ビジュアル・チェックボックス
 *   src/components/NodeProperty.tsx       — status セレクト追加
 *   src/components/ContextMenu.tsx        — SET TYPE セクション追加
 */

// =============================================================================
// Slot 2: Imports
// =============================================================================

import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import type { GraphNodeData, NodeType } from '@/bom/graph'
import { NODE_TYPE_COLOR } from '@/bom/graph'

// =============================================================================
// Slot 3: モック・セットアップ
// =============================================================================

const { mockUpdateNodeData, mockOnStartEditing, mockOnStopEditing } = vi.hoisted(() => ({
    mockUpdateNodeData: vi.fn(),
    mockOnStartEditing: vi.fn(),
    mockOnStopEditing: vi.fn(),
}))

vi.mock('@/store/useGraphStore', () => ({
    useGraphStore: vi.fn((selector: (s: any) => any) =>
        selector({ updateNodeData: mockUpdateNodeData })
    ),
}))

vi.mock('@xyflow/react', () => ({
    Handle: () => null,
    Position: { Left: 'left', Right: 'right' },
}))

import { EditableNode } from '@/components/nodes/EditableNode'
import { NodeProperty } from '@/components/NodeProperty'
import { ContextMenu } from '@/components/ContextMenu'

// EditableNode のデフォルト props ファクトリ
const makeNodeProps = (overrides: Partial<{
    data: GraphNodeData
    selected: boolean
    isEditing: boolean
}> = {}) => ({
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
    onUpdateNode: mockUpdateNodeData,
    onStartEditing: mockOnStartEditing,
    onStopEditing: mockOnStopEditing,
    data: { label: 'Node A' } as GraphNodeData,
    ...overrides,
})

// NodeProperty のデフォルト props ファクトリ
const makePropertyProps = (data: GraphNodeData) => ({
    selectedNodeId: 'node-001',
    selectedNodeIds: ['node-001'],
    nodes: [{ id: 'node-001', position: { x: 0, y: 0 }, data }],
    onUpdateNode: mockUpdateNodeData,
})

beforeEach(() => {
    vi.clearAllMocks()
})

// =============================================================================
// Slot 4: 挙動の検証
// =============================================================================

// --- ContextMenu: SET TYPE セクション ---

describe('ContextMenu: [CTX-8] SET TYPE', () => {

    test('logic: type="node" のとき SET TYPE セクションと5項目が表示される', () => {
        render(
            <ContextMenu
                type="node"
                x={0}
                y={0}
                onDelete={vi.fn()}
                onClose={vi.fn()}
                onSetNodeType={vi.fn()}
            />
        )
        expect(screen.getByTestId('menu-section-set-type')).toBeInTheDocument()
        expect(screen.getByTestId('menu-item-type-git')).toBeInTheDocument()
        expect(screen.getByTestId('menu-item-type-validate')).toBeInTheDocument()
        expect(screen.getByTestId('menu-item-type-analyze')).toBeInTheDocument()
        expect(screen.getByTestId('menu-item-type-llm')).toBeInTheDocument()
        expect(screen.getByTestId('menu-item-type-custom')).toBeInTheDocument()
    })

    test('logic: type="edge" のとき SET TYPE セクションが表示されない', () => {
        render(
            <ContextMenu
                type="edge"
                x={0}
                y={0}
                onDelete={vi.fn()}
                onClose={vi.fn()}
            />
        )
        expect(screen.queryByTestId('menu-section-set-type')).not.toBeInTheDocument()
    })

    test('logic: git クリックで onSetNodeType("git") と onClose が呼ばれる', () => {
        const onSetNodeType = vi.fn()
        const onClose = vi.fn()
        render(
            <ContextMenu
                type="node"
                x={0}
                y={0}
                onDelete={vi.fn()}
                onClose={onClose}
                onSetNodeType={onSetNodeType}
            />
        )
        fireEvent.click(screen.getByTestId('menu-item-type-git'))
        expect(onSetNodeType).toHaveBeenCalledWith('git')
        expect(onClose).toHaveBeenCalledTimes(1)
    })

    test('logic: llm クリックで onSetNodeType("llm") が呼ばれる', () => {
        const onSetNodeType = vi.fn()
        render(
            <ContextMenu
                type="node"
                x={0}
                y={0}
                onDelete={vi.fn()}
                onClose={vi.fn()}
                onSetNodeType={onSetNodeType}
            />
        )
        fireEvent.click(screen.getByTestId('menu-item-type-llm'))
        expect(onSetNodeType).toHaveBeenCalledWith('llm')
    })

})

// --- EditableNode: nodeType ボーダー ---

describe('EditableNode: [CTX-8] nodeType ボーダー色', () => {

    test('logic: nodeType="git" のとき git カラーのボーダーが適用される', () => {
        render(<EditableNode {...makeNodeProps({ data: { label: 'A', nodeType: 'git' } })} />)
        const node = screen.getByTestId('editable-node')
        expect(node.style.borderColor).toBe(NODE_TYPE_COLOR['git'])
    })

    test('logic: nodeType 未設定のとき custom カラーのボーダーが適用される', () => {
        render(<EditableNode {...makeNodeProps({ data: { label: 'A' } })} />)
        const node = screen.getByTestId('editable-node')
        expect(node.style.borderColor).toBe(NODE_TYPE_COLOR['custom'])
    })

    test('logic: nodeType="llm" のとき llm カラーのボーダーが適用される', () => {
        render(<EditableNode {...makeNodeProps({ data: { label: 'A', nodeType: 'llm' } })} />)
        const node = screen.getByTestId('editable-node')
        expect(node.style.borderColor).toBe(NODE_TYPE_COLOR['llm'])
    })

})

// --- EditableNode: status ビジュアル ---

describe('EditableNode: [CTX-8] status ビジュアル', () => {

    test('logic: status="done" のとき data-status="done" 属性が付く', () => {
        render(<EditableNode {...makeNodeProps({ data: { label: 'A', status: 'done' } })} />)
        expect(screen.getByTestId('editable-node')).toHaveAttribute('data-status', 'done')
    })

    test('logic: status="doing" のとき data-status="doing" 属性が付く', () => {
        render(<EditableNode {...makeNodeProps({ data: { label: 'A', status: 'doing' } })} />)
        expect(screen.getByTestId('editable-node')).toHaveAttribute('data-status', 'doing')
    })

    test('logic: status 未設定のとき data-status="todo" 属性が付く', () => {
        render(<EditableNode {...makeNodeProps({ data: { label: 'A' } })} />)
        expect(screen.getByTestId('editable-node')).toHaveAttribute('data-status', 'todo')
    })

})

// --- EditableNode: チェックボックス toggle ---

describe('EditableNode: [CTX-8] チェックボックス status toggle', () => {

    test('logic: status="todo" のときチェックボックスは未チェック', () => {
        render(<EditableNode {...makeNodeProps({ data: { label: 'A', status: 'todo' } })} />)
        const checkbox = screen.getByTestId('node-status-checkbox') as HTMLInputElement
        expect(checkbox.checked).toBe(false)
    })

    test('logic: status="done" のときチェックボックスはチェック済み', () => {
        render(<EditableNode {...makeNodeProps({ data: { label: 'A', status: 'done' } })} />)
        const checkbox = screen.getByTestId('node-status-checkbox') as HTMLInputElement
        expect(checkbox.checked).toBe(true)
    })

    test('logic: todo→done: チェックボックスをクリックすると updateNodeData({ status: "done" }) が呼ばれる', () => {
        render(<EditableNode {...makeNodeProps({ data: { label: 'A', status: 'todo' } })} />)
        fireEvent.click(screen.getByTestId('node-status-checkbox'))
        expect(mockUpdateNodeData).toHaveBeenCalledWith('node-001', { status: 'done' })
    })

    test('logic: done→todo: チェックボックスをクリックすると updateNodeData({ status: "todo" }) が呼ばれる', () => {
        render(<EditableNode {...makeNodeProps({ data: { label: 'A', status: 'done' } })} />)
        fireEvent.click(screen.getByTestId('node-status-checkbox'))
        expect(mockUpdateNodeData).toHaveBeenCalledWith('node-001', { status: 'todo' })
    })

})

// --- NodeProperty: status セレクト ---

describe('NodeProperty: [CTX-8] status セレクト', () => {

    test('logic: status セレクトが表示され、現在値が反映される', () => {
        render(<NodeProperty {...makePropertyProps({ label: 'A', status: 'doing' })} />)
        const select = screen.getByTestId('select-status') as HTMLSelectElement
        expect(select).toBeInTheDocument()
        expect(select.value).toBe('doing')
    })

    test('logic: status 未設定のときセレクトは "todo" を表示する', () => {
        render(<NodeProperty {...makePropertyProps({ label: 'A' })} />)
        const select = screen.getByTestId('select-status') as HTMLSelectElement
        expect(select.value).toBe('todo')
    })

    test('logic: セレクト変更で onUpdateNode({ status: "done" }) が呼ばれる', () => {
        render(<NodeProperty {...makePropertyProps({ label: 'A', status: 'todo' })} />)
        fireEvent.change(screen.getByTestId('select-status'), { target: { value: 'done' } })
        expect(mockUpdateNodeData).toHaveBeenCalledWith('node-001', { status: 'done' })
    })

    test('logic: セレクト変更で onUpdateNode({ status: "doing" }) が呼ばれる', () => {
        render(<NodeProperty {...makePropertyProps({ label: 'A', status: 'todo' })} />)
        fireEvent.change(screen.getByTestId('select-status'), { target: { value: 'doing' } })
        expect(mockUpdateNodeData).toHaveBeenCalledWith('node-001', { status: 'doing' })
    })

})