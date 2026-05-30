/**
 * ContextMenu
 *
 * 責務: ノード・エッジの右クリックで表示するコンテキストメニュー。
 *
 * - type='node': "Edit Label" + SET TYPE + "Run Node"（service あり時）+ "Delete Node" を表示する
 * - type='edge': "Delete Edge" のみ表示する（"Edit Label" / SET TYPE / "Run Node" なし）
 * - x / y: GraphEditor の座標系での表示位置（position: absolute）
 * - onDelete: 削除アイテムクリック時のコールバック
 * - onEditLabel: "Edit Label" クリック時のコールバック（type='node' のみ）
 * - onSetNodeType: SET TYPE 項目クリック時のコールバック（type='node' のみ）[CTX-8]
 * - onRunNode: "Run Node" クリック時のコールバック（type='node' かつ service あり時）[CTX-14]
 * - onClose: メニュー外クリック等で閉じるためのコールバック（呼び出し側が管理）
 * - service: ノードの service フィールド（Run Node 表示判定に使用）[CTX-14]
 * - isRunning: 実行中フラグ（Run Node アイテムをスピナー表示にする）[CTX-14]
 *
 * @context CTX-7/8/14
 * @see docs/bom/graph.ts
 * @see docs/bom/execute.ts
 * @see docs/specs/context-menu.spec.tsx
 * @see docs/specs/node-execute.spec.tsx
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
    // [CTX-14] カタログ紐付きノードの service フィールド（null = 未紐付き）
    service?: string | null
    // [CTX-14] "Run Node" クリック時のコールバック
    onRunNode?: () => void
    // [CTX-14] 実行中フラグ（スピナー表示）
    isRunning?: boolean
}

export function ContextMenu({
    type,
    x,
    y,
    onDelete,
    onClose,
    onEditLabel,
    onSetNodeType,
    service,
    onRunNode,
    isRunning = false,
}: ContextMenuProps) {
    const handleDelete = () => {
        onDelete()
        onClose()
    }

    const handleEditLabel = () => {
        onEditLabel?.()
        onClose()
    }

    const handleRunNode = () => {
        onRunNode?.()
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
            {/* [CTX-14] service が存在するノードのみ Run Node を表示 */}
            {type === 'node' && service && (
                <div
                    data-testid="menu-item-run-node"
                    data-running={isRunning ? 'true' : undefined}
                    className={[
                        'px-3 py-1.5 text-xs font-mono cursor-pointer',
                        isRunning
                            ? 'text-[--muted-foreground] opacity-50 pointer-events-none'
                            : 'text-[--primary] hover:bg-[--muted] hover:text-[--primary]',
                    ].join(' ')}
                    onClick={isRunning ? undefined : handleRunNode}
                >
                    {isRunning ? '⟳ Running…' : 'Run Node'}
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