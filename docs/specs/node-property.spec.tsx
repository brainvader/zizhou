/**
 * Slot 1: 発注用ヘッダー (JSDoc Metadata)
 * @context CTX-4: NodeProperty — フォーム編集ロジック検証
 * @bom docs/bom/graph.ts (GraphNodeData, GraphStore.updateNodeData)
 * @story
 * 1. label が空文字で blur しても updateNodeData は呼ばれない
 * 2. label が空文字で blur するとエラーが表示される
 * 3. selectedNodeId が変わるとフォームの値が store の値でリセットされる
 * @output src/components/NodeProperty.tsx
 * @note インタラクション検証（blur・入力・エラー表示）は
 *       NodeProperty.stories.tsx の play 関数に委譲する
 */

/**
 * Slot 2: 外部依存のインポート (Imports)
 */
import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import type { Node } from '@xyflow/react'
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
            selectedNodeId: null,
            nodes: [],
            updateNodeData: mockUpdateNodeData,
        })
    ),
}))

import { NodeProperty } from '@/components/NodeProperty'

const mockNodes: Node<GraphNodeData>[] = [
    {
        id: 'node-001',
        position: { x: 0, y: 0 },
        data: { label: 'ProjectGrid.tsx', description: 'カードグリッド表示' },
    },
    {
        id: 'node-002',
        position: { x: 0, y: 0 },
        data: { label: 'useProjectStore' },
    },
]

beforeEach(() => {
    vi.clearAllMocks()
})

/**
 * Slot 4: 挙動の検証コード (Story Verification)
 */

describe('NodeProperty: form edit logic', () => {

    test('logic: label が空文字で blur しても updateNodeData は呼ばれない', () => {
        render(
            <NodeProperty
                selectedNodeId="node-001"
                nodes={mockNodes}
                onUpdateNode={mockUpdateNodeData}
            />
        )
        const input = screen.getByTestId('input-label') as HTMLInputElement
        fireEvent.change(input, { target: { value: '' } })
        fireEvent.blur(input)

        expect(mockUpdateNodeData).not.toHaveBeenCalled()
    })

    test('logic: label が空文字で blur するとエラーが表示される', () => {
        render(
            <NodeProperty
                selectedNodeId="node-001"
                nodes={mockNodes}
                onUpdateNode={mockUpdateNodeData}
            />
        )
        const input = screen.getByTestId('input-label') as HTMLInputElement
        fireEvent.change(input, { target: { value: '' } })
        fireEvent.blur(input)

        expect(screen.getByTestId('error-label')).toBeVisible()
    })

    test('logic: 有効な label で blur すると updateNodeData が呼ばれる', () => {
        render(
            <NodeProperty
                selectedNodeId="node-001"
                nodes={mockNodes}
                onUpdateNode={mockUpdateNodeData}
            />
        )
        const input = screen.getByTestId('input-label') as HTMLInputElement
        fireEvent.change(input, { target: { value: 'NewLabel.tsx' } })
        fireEvent.blur(input)

        expect(mockUpdateNodeData).toHaveBeenCalledOnce()
        expect(mockUpdateNodeData).toHaveBeenCalledWith('node-001', {
            label: 'NewLabel.tsx',
        })
    })

    test('logic: description を blur すると updateNodeData が呼ばれる', () => {
        render(
            <NodeProperty
                selectedNodeId="node-001"
                nodes={mockNodes}
                onUpdateNode={mockUpdateNodeData}
            />
        )
        const textarea = screen.getByTestId('input-description') as HTMLTextAreaElement
        fireEvent.change(textarea, { target: { value: '新しい説明文' } })
        fireEvent.blur(textarea)

        expect(mockUpdateNodeData).toHaveBeenCalledOnce()
        expect(mockUpdateNodeData).toHaveBeenCalledWith('node-001', {
            description: '新しい説明文',
        })
    })

    test('logic: selectedNodeId が変わるとフォームが新しい node の値にリセットされる', () => {
        const { rerender } = render(
            <NodeProperty
                selectedNodeId="node-001"
                nodes={mockNodes}
                onUpdateNode={mockUpdateNodeData}
            />
        )
        const input = screen.getByTestId('input-label') as HTMLInputElement
        expect(input.value).toBe('ProjectGrid.tsx')

        rerender(
            <NodeProperty
                selectedNodeId="node-002"
                nodes={mockNodes}
                onUpdateNode={mockUpdateNodeData}
            />
        )
        expect((screen.getByTestId('input-label') as HTMLInputElement).value).toBe('useProjectStore')
    })

})