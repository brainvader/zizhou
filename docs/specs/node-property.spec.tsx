/**
 * Slot 1: 発注用ヘッダー (JSDoc Metadata)
 *
 * @context  CTX-3 / NodeProperty
 * @bom      docs/bom/graph.ts (GraphStore, GraphNodeData)
 *
 * @story
 *   【1. 空状態】
 *   1. selectedNodeId が null のとき、NodeProperty は何も表示しない（空白）。
 *
 *   【2. プロパティ表示】
 *   2. selectedNodeId が設定されているとき、対応するノードの name を表示する。
 *   3. description が存在するとき、description を表示する。
 *   4. description が存在しないとき、description フィールドは表示しない。
 *
 * @output   src/components/NodeProperty.tsx
 */

// =============================================================================
// Slot 2: Imports
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { GraphNodeData } from '@/bom/graph'
import type { Node } from '@xyflow/react'

// コンポーネント本体（実装後にアンコメント）
// import { NodeProperty } from '@/components/NodeProperty'

// =============================================================================
// Slot 3: モック・セットアップ
// =============================================================================

const { mockSelectedNodeId, mockNodes } = vi.hoisted(() => ({
    mockSelectedNodeId: vi.fn<[], string | null>(() => null),
    mockNodes: vi.fn<[], Node<GraphNodeData>[]>(() => []),
}))

vi.mock('@/store/useGraphStore', () => ({
    useGraphStore: (selector: (state: {
        selectedNodeId: string | null
        nodes: Node<GraphNodeData>[]
    }) => unknown) =>
        selector({
            selectedNodeId: mockSelectedNodeId(),
            nodes: mockNodes(),
        }),
}))

const makeNode = (
    id: string,
    label: string,
    description?: string
): Node<GraphNodeData> => ({
    id,
    position: { x: 0, y: 0 },
    data: { label, ...(description ? { description } : {}) },
})

beforeEach(() => {
    vi.clearAllMocks()
    mockSelectedNodeId.mockReturnValue(null)
    mockNodes.mockReturnValue([])
})

// =============================================================================
// Slot 4: 挙動の検証コード (Logic Verification)
// =============================================================================

describe('NodeProperty — logic', () => {

    /**
     * @story ステップ 1
     * selectedNodeId が null のとき何も表示しない。
     */
    it('renders nothing when selectedNodeId is null', () => {
        // mockSelectedNodeId.mockReturnValue(null)
        // mockNodes.mockReturnValue([makeNode('node-1', 'FileTree.tsx')])
        // const { container } = render(<NodeProperty />)
        // expect(container.firstChild).toBeNull()
        expect(true).toBe(true) // placeholder
    })

    /**
     * @story ステップ 2
     * selectedNodeId に対応するノードの name が表示される。
     */
    it('displays node label when selectedNodeId is set', () => {
        // mockSelectedNodeId.mockReturnValue('node-1')
        // mockNodes.mockReturnValue([makeNode('node-1', 'FileTree.tsx')])
        // render(<NodeProperty />)
        // expect(screen.getByText('FileTree.tsx')).toBeInTheDocument()
        expect(true).toBe(true) // placeholder
    })

    /**
     * @story ステップ 3
     * description が存在するとき description が表示される。
     */
    it('displays description when node has description', () => {
        // mockSelectedNodeId.mockReturnValue('node-1')
        // mockNodes.mockReturnValue([makeNode('node-1', 'FileTree.tsx', 'ファイルツリー表示コンポーネント')])
        // render(<NodeProperty />)
        // expect(screen.getByText('ファイルツリー表示コンポーネント')).toBeInTheDocument()
        expect(true).toBe(true) // placeholder
    })

    /**
     * @story ステップ 4
     * description が存在しないとき description フィールドは表示しない。
     */
    it('does not display description field when node has no description', () => {
        // mockSelectedNodeId.mockReturnValue('node-1')
        // mockNodes.mockReturnValue([makeNode('node-1', 'FileTree.tsx')])
        // render(<NodeProperty />)
        // expect(screen.queryByText('description')).not.toBeInTheDocument()
        expect(true).toBe(true) // placeholder
    })

})