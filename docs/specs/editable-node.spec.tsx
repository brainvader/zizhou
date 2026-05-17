/**
 * Slot 1: 発注用ヘッダー (JSDoc Metadata)
 * @context CTX-4/7: EditableNode — ラベル編集ロジック検証
 * @bom docs/bom/graph.ts (GraphNodeData, GraphStore.updateNodeData)
 * @story
 * 1. label が空文字で確定しても updateNodeData は呼ばれない
 * 2. Escape でキャンセルすると updateNodeData は呼ばれない
 * 3. [CTX-7] ダブルクリックで onStartEditing が呼ばれる
 * 4. [CTX-7] isEditing=true のとき inline input が表示される
 * 5. [CTX-7] isEditing=false のとき label テキストが表示される
 * @output src/components/nodes/EditableNode.tsx
 * @note インタラクション検証（Enter・blur）は EditableNode.stories.tsx の play 関数に委譲する
 */

/**
 * Slot 2: 外部依存のインポート (Imports)
 */
import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import type { EditableNodeProps } from '@/components/nodes/EditableNode'

/**
 * Slot 3: モック・セットアップ (Test Setup)
 */
const { mockUpdateNodeData, mockOnStartEditing, mockOnStopEditing } = vi.hoisted(() => ({
    mockUpdateNodeData: vi.fn(),
    mockOnStartEditing: vi.fn(),
    mockOnStopEditing: vi.fn(),
}))

vi.mock('@/store/useGraphStore', () => ({
    useGraphStore: vi.fn((selector: (s: any) => any) =>
        selector({
            updateNodeData: mockUpdateNodeData,
        })
    ),
}))

vi.mock('@xyflow/react', () => ({
    Handle: () => null,
    Position: { Left: 'left', Right: 'right' },
}))

import { EditableNode } from '@/components/nodes/EditableNode'

const makeProps = (overrides?: Partial<EditableNodeProps>): EditableNodeProps => ({
    id: 'node-001',
    data: { label: 'ProjectGrid.tsx', description: 'カードグリッド表示' },
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
    onStartEditing: mockOnStartEditing,
    onStopEditing: mockOnStopEditing,
    ...overrides,
})

beforeEach(() => {
    vi.clearAllMocks()
})

/**
 * Slot 4: 挙動の検証コード (Story Verification)
 */

describe('EditableNode: [CTX-7] isEditing prop 制御', () => {

    test('logic: isEditing=false のとき label テキストが表示され input は表示されない', () => {
        render(<EditableNode {...makeProps({ isEditing: false })} />)
        expect(screen.getByText('ProjectGrid.tsx')).toBeInTheDocument()
        expect(screen.queryByTestId('inline-input')).not.toBeInTheDocument()
    })

    test('logic: isEditing=true のとき inline input が表示される', () => {
        render(<EditableNode {...makeProps({ isEditing: true })} />)
        expect(screen.getByTestId('inline-input')).toBeInTheDocument()
    })

    test('logic: ダブルクリックで onStartEditing が呼ばれる', () => {
        render(<EditableNode {...makeProps({ isEditing: false })} />)
        fireEvent.dblClick(screen.getByTestId('editable-node-node-001'))
        expect(mockOnStartEditing).toHaveBeenCalledOnce()
    })

})

describe('EditableNode: label edit logic', () => {

    test('logic: label が空文字で Enter 確定しても updateNodeData は呼ばれない', () => {
        render(<EditableNode {...makeProps({ isEditing: true })} />)
        const input = screen.getByTestId('inline-input') as HTMLInputElement
        fireEvent.change(input, { target: { value: '' } })
        fireEvent.keyDown(input, { key: 'Enter' })
        expect(mockUpdateNodeData).not.toHaveBeenCalled()
    })

    test('logic: Escape でキャンセルすると updateNodeData は呼ばれず onStopEditing が呼ばれる', () => {
        render(<EditableNode {...makeProps({ isEditing: true })} />)
        const input = screen.getByTestId('inline-input') as HTMLInputElement
        fireEvent.change(input, { target: { value: 'Changed Label' } })
        fireEvent.keyDown(input, { key: 'Escape' })
        expect(mockUpdateNodeData).not.toHaveBeenCalled()
        expect(mockOnStopEditing).toHaveBeenCalledOnce()
    })

    test('logic: 有効な label で Enter 確定すると updateNodeData と onStopEditing が呼ばれる', () => {
        render(<EditableNode {...makeProps({ isEditing: true })} />)
        const input = screen.getByTestId('inline-input') as HTMLInputElement
        fireEvent.change(input, { target: { value: 'NewLabel.tsx' } })
        fireEvent.keyDown(input, { key: 'Enter' })
        expect(mockUpdateNodeData).toHaveBeenCalledWith('node-001', { label: 'NewLabel.tsx' })
        expect(mockOnStopEditing).toHaveBeenCalledOnce()
    })

})