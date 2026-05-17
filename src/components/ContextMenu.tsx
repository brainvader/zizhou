/**
 * ContextMenu
 *
 * 責務: ノード・エッジの右クリックで表示するコンテキストメニュー。
 *
 * - type='node': "Edit Label" + "Delete Node" を表示する
 * - type='edge': "Delete Edge" のみ表示する（"Edit Label" なし）
 * - x / y: GraphEditor の座標系での表示位置（position: absolute）
 * - onDelete: 削除アイテムクリック時のコールバック
 * - onEditLabel: "Edit Label" クリック時のコールバック（type='node' のみ）
 * - onClose: メニュー外クリック等で閉じるためのコールバック（呼び出し側が管理）
 *
 * @context CTX-7
 * @see docs/bom/graph.ts
 * @see docs/specs/context-menu.spec.tsx
 * @see src/stories/context-menu.stories.tsx
 */

export type ContextMenuProps = {
    type: 'node' | 'edge'
    x: number
    y: number
    onDelete: () => void
    onClose: () => void
    onEditLabel?: () => void
}

export function ContextMenu({ type, x, y, onDelete, onClose, onEditLabel }: ContextMenuProps) {
    const handleDelete = () => {
        onDelete()
        onClose()
    }

    const handleEditLabel = () => {
        onEditLabel?.()
        onClose()
    }

    return (
        <div
            data-testid="context-menu"
            className="absolute bg-[--card] border border-[--border] rounded-[--radius] py-1 min-w-35 z-100 shadow-[0_4px_16px_rgba(0,0,0,0.4)]"
            style={{ top: y, left: x }}
            // メニュー自体のクリックが pane に伝播しないよう止める
            onContextMenu={(e) => e.preventDefault()}
        >
            {type === 'node' && (
                <div
                    data-testid="menu-item-edit-label"
                    className="px-3 py-1.5 text-xs font-mono text-[--muted-foreground] cursor-pointer hover:bg-[--muted] hover:text-[--foreground]"
                    onClick={handleEditLabel}
                >
                    Edit Label
                </div>
            )}
            <div
                data-testid="menu-item-delete"
                className="px-3 py-1.5 text-xs font-mono text-[--muted-foreground] cursor-pointer hover:bg-[--muted] hover:text-[--primary]"
                onClick={handleDelete}
            >
                {type === 'node' ? 'Delete Node' : 'Delete Edge'}
            </div>
        </div>
    )
}