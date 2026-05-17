/**
 * Slot 1: 発注用ヘッダー (JSDoc Metadata)
 * @context CTX-7: ContextMenu — ロジック検証
 * @bom docs/bom/graph.ts
 * @story
 * 1. type='node' のとき "Edit Label" と "Delete Node" が表示される
 * 2. type='edge' のとき "Edit Label" は表示されず "Delete Edge" が表示される
 * 3. "Delete Node" クリックで onDelete が呼ばれる
 * 4. "Edit Label" クリックで onEditLabel が呼ばれる
 * 5. "Delete Edge" クリックで onDelete が呼ばれる
 * 6. onClose が呼ばれるとメニューが閉じる（呼び出し側の責務）
 * @output src/components/ContextMenu.tsx
 * @note ContextMenu は純粋な表示コンポーネント。
 *       ロジックは呼び出し側（GraphEditor）に委譲する。
 *       インタラクション検証は context-menu.stories.tsx の play 関数に委譲する。
 */

/**
 * Slot 2: 外部依存のインポート (Imports)
 */
import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

/**
 * Slot 3: モック・セットアップ (Test Setup)
 */
const { mockOnDelete, mockOnEditLabel, mockOnClose } = vi.hoisted(() => ({
    mockOnDelete: vi.fn(),
    mockOnEditLabel: vi.fn(),
    mockOnClose: vi.fn(),
}))

import { ContextMenu } from '@/components/ContextMenu'

const baseProps = {
    x: 100,
    y: 200,
    onDelete: mockOnDelete,
    onClose: mockOnClose,
}

beforeEach(() => {
    vi.clearAllMocks()
})

/**
 * Slot 4: 挙動の検証コード (Story Verification)
 */

describe('ContextMenu: type=node', () => {

    test('logic: "Edit Label" と "Delete Node" が表示される', () => {
        render(<ContextMenu {...baseProps} type="node" onEditLabel={mockOnEditLabel} />)
        expect(screen.getByTestId('menu-item-edit-label')).toBeInTheDocument()
        expect(screen.getByTestId('menu-item-delete')).toBeInTheDocument()
    })

    test('logic: "Delete Node" クリックで onDelete が呼ばれる', () => {
        render(<ContextMenu {...baseProps} type="node" onEditLabel={mockOnEditLabel} />)
        fireEvent.click(screen.getByTestId('menu-item-delete'))
        expect(mockOnDelete).toHaveBeenCalledOnce()
    })

    test('logic: "Edit Label" クリックで onEditLabel が呼ばれる', () => {
        render(<ContextMenu {...baseProps} type="node" onEditLabel={mockOnEditLabel} />)
        fireEvent.click(screen.getByTestId('menu-item-edit-label'))
        expect(mockOnEditLabel).toHaveBeenCalledOnce()
    })

})

describe('ContextMenu: type=edge', () => {

    test('logic: "Edit Label" は表示されず "Delete Edge" が表示される', () => {
        render(<ContextMenu {...baseProps} type="edge" />)
        expect(screen.queryByTestId('menu-item-edit-label')).not.toBeInTheDocument()
        expect(screen.getByTestId('menu-item-delete')).toBeInTheDocument()
    })

    test('logic: "Delete Edge" クリックで onDelete が呼ばれる', () => {
        render(<ContextMenu {...baseProps} type="edge" />)
        fireEvent.click(screen.getByTestId('menu-item-delete'))
        expect(mockOnDelete).toHaveBeenCalledOnce()
    })

})