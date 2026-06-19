/**
 * @bom Layout — 3ペインリサイズレイアウトの設定値
 *
 * ResizablePanelGroup（shadcn/ui + react-resizable-panels v4）に渡すパネルサイズ定数。
 *
 * @note react-resizable-panels v4 から defaultSize / minSize / maxSize は
 *       文字列（"20%"）で指定する。数値は無効。
 *
 * @see src/routes/projects.$id.tsx
 */

/** FileTree ペイン（左） */
export const FILE_TREE_PANEL = {
    defaultSize: '20%',
    minSize: '10%',
    maxSize: '40%',
} as const

/** GraphEditor ペイン（中央） */
export const GRAPH_EDITOR_PANEL = {
    defaultSize: '60%',
    minSize: '30%',
} as const

/** NodeProperty ペイン（右） */
export const NODE_PROPERTY_PANEL = {
    defaultSize: '20%',
    minSize: '10%',
    maxSize: '40%',
} as const