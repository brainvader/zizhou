/**
 * Slot 1: 発注用ヘッダー (JSDoc Metadata)
 * @context CTX-4: EditableNode — ラベル編集ロジック検証
 * @bom docs/bom/graph.ts (GraphNodeData, GraphStore.updateNodeData)
 * @story
 * 1. label が空文字で確定しても updateNodeData は呼ばれない
 * 2. Escape でキャンセルすると updateNodeData は呼ばれない
 * @output src/components/nodes/EditableNode.tsx
 * @note インタラクション検証（ダブルクリック・Enter・blur）は
 *       EditableNode.stories.tsx の play 関数に委譲する
 */

/**
 * Slot 2: 外部依存のインポート (Imports)
 */
import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import type { NodeProps } from '@xyflow/react'
import type { GraphNodeData } from '@/bom/graph'

/**
 * Slot 3: モック・セットアップ (Test Setup)
 */

const { mockUpdateNodeData } = vi.hoisted(() => ({
    mockUpdateNodeData: vi.fn(),
}))

vi.mock('@/store/useGraphStore', () => ({
    useGraphStore: vi.fn((selector: (s: any) => any) =>
        selector({
            updateNodeData: mockUpdateNodeData,
        })
    ),
}))

// ReactFlow の Handle / Position をスタブ化
vi.mock('@xyflow/react', () => ({
    Handle: () => null,
    Position: { Left: 'left', Right: 'right' },
}))

import { EditableNode } from '@/components/nodes/EditableNode'

// NodeProps の最小フィクスチャ
const makeProps = (overrides?: Partial<NodeProps<GraphNodeData>>): NodeProps<GraphNodeData> => ({
    id: 'node-001',
    data: { label: 'ProjectGrid.tsx', description: 'カードグリッド表示' },
    selected: false,
    type: 'editableNode',
    zIndex: 0,
    isConnectable: true,
    positionAbsoluteX: 0,
    positionAbsoluteY: 0,
    dragging: false,
    ...overrides,
})

beforeEach(() => {
    vi.clearAllMocks()
})

/**
 * Slot 4: 挙動の検証コード (Story Verification)
 */

describe('EditableNode: label edit logic', () => {

    test('logic: label が空文字で Enter 確定しても updateNodeData は呼ばれない', () => {
        render(<EditableNode {...makeProps()} />)

        // ダブルクリックで編集モードに入る
        fireEvent.dblClick(screen.getByTestId('editable-node-node-001'))

        const input = screen.getByTestId('inline-input') as HTMLInputElement
        fireEvent.change(input, { target: { value: '' } })
        fireEvent.keyDown(input, { key: 'Enter' })

        expect(mockUpdateNodeData).not.toHaveBeenCalled()
    })

    test('logic: Escape でキャンセルすると updateNodeData は呼ばれない', () => {
        render(<EditableNode {...makeProps()} />)

        fireEvent.dblClick(screen.getByTestId('editable-node-node-001'))

        const input = screen.getByTestId('inline-input') as HTMLInputElement
        fireEvent.change(input, { target: { value: 'Changed Label' } })
        fireEvent.keyDown(input, { key: 'Escape' })

        expect(mockUpdateNodeData).not.toHaveBeenCalled()
    })

})