/**
 * ContextMenu
 *
 * 責務: ノード・エッジの右クリックで表示するコンテキストメニュー。
 *
 * - type='node': "Edit Label" + SET TYPE + "Delete Node" を表示する
 * - type='edge': "Delete Edge" のみ表示する（"Edit Label" / SET TYPE なし）
 * - x / y: GraphEditor の座標系での表示位置（position: absolute）
 * - onDelete: 削除アイテムクリック時のコールバック
 * - onEditLabel: "Edit Label" クリック時のコールバック（type='node' のみ）
 * - onSetNodeType: SET TYPE 項目クリック時のコールバック（type='node' のみ）[CTX-8]
 * - onClose: メニュー外クリック等で閉じるためのコールバック（呼び出し側が管理）
 *
 * @context CTX-7/8
 * @see docs/bom/graph.ts
 * @see docs/specs/context-menu.spec.tsx
 * @see src/stories/context-menu.stories.tsx
 */

import type { NodeType } from '@/bom/graph'
import { NODE_TYPES } from '@/bom/graph'

export type ContextMenuProps = {
    type: 'node' | 'edge'
    x: number
    y: number
    onDelete: () => void
    onClose: () => void
    onEditLabel?: () => void
    // [CTX-8] type='node' のとき Set Type メニューから呼ばれる
    onSetNodeType?: (type: NodeType) => void
}

export function ContextMenu({ type, x, y, onDelete, onClose, onEditLabel, onSetNodeType }: ContextMenuProps) {
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
            {type === 'node' && (
                <>
                    <div
                        data-testid="menu-section-set-type"
                        className="px-3 pt-2 pb-1 text-[10px] font-mono text-[--muted-foreground] opacity-50 select-none"
                    >
                        SET TYPE
                    </div>
                    {NODE_TYPES.map((t) => (
                        <div
                            key={t}
                            data-testid={`menu-item-type-${t}`}
                            className="px-3 py-1.5 text-xs font-mono text-[--muted-foreground] cursor-pointer hover:bg-[--muted] hover:text-[--foreground]"
                            onClick={() => { onSetNodeType?.(t); onClose() }}
                        >
                            {t}
                        </div>
                    ))}
                </>
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