/**
 * Slot 1: 発注用ヘッダー (JSDoc Metadata)
 *
 * @context  CTX-1 / FileTree
 * @bom      docs/bom/graph.ts  (FileTreeNode, FileTreeNodeSchema, ProjectDetailStore)
 *           docs/bom/project.ts (Project, ProjectStore)
 *
 * @story
 *   【1. ツリー表示】
 *   1. FileTree は projectRootPath（useProjectDetailStore 経由）をもとに
 *      マウント時に Tauri fs.readDir（recursive: true）で再帰読み込みし、ツリーを描画する。
 *   2. ディレクトリは展開アイコン付きで、ファイルはインデント付きで表示される。
 *
 *   【2. Expand / Collapse】
 *   3. ディレクトリ行をクリックすると expandedDirs に追加されツリーが展開する。
 *   4. 展開済みのディレクトリ行を再クリックすると expandedDirs から除去され折りたたまれる。
 *
 *   【3. File Select — 通常ファイル】
 *   5. graphs/ 配下以外のファイル行をクリックすると selectedPath が更新される。
 *   6. activeGraphId は変化しない。
 *
 *   【4. File Select — graphs/ 配下 .json】
 *   7. graphs/ 配下の .json ファイル行をクリックすると selectedPath が更新される。
 *   8. useProjectDetailStore の setActiveGraphId が呼ばれ activeGraphId が更新される。
 *
 * @output   src/components/FileTree.tsx
 */

// =============================================================================
// Slot 2: Imports
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest'
// import { render, screen, fireEvent } from '@testing-library/react'
import type { FileTreeNode } from '@/bom/graph'

// コンポーネント本体（実装後にアンコメント）
// import { FileTree } from '@/components/FileTree'

// =============================================================================
// Slot 3: モック・セットアップ
// =============================================================================

const { mockReadDir, mockSetActiveGraphId } = vi.hoisted(() => ({
    mockReadDir: vi.fn(),
    mockSetActiveGraphId: vi.fn(),
}))

const mockProjectRootPath = '/Users/user/projects/zizou-core'

vi.mock('@tauri-apps/plugin-fs', () => ({
    readDir: mockReadDir,
    BaseDirectory: { AppData: 'AppData' },
}))

vi.mock('@/store/useProjectDetailStore', () => ({
    useProjectDetailStore: () => ({
        projectRootPath: mockProjectRootPath,
        activeGraphId: null,
        setActiveGraphId: mockSetActiveGraphId,
    }),
}))

/** graphs/ を含むシンプルなツリー構造 */
const makeTree = (): FileTreeNode[] => [
    {
        name: 'src',
        path: '/Users/user/projects/zizou-core/src',
        isDir: true,
        children: [
            {
                name: 'components',
                path: '/Users/user/projects/zizou-core/src/components',
                isDir: true,
                children: [
                    {
                        name: 'FileTree.tsx',
                        path: '/Users/user/projects/zizou-core/src/components/FileTree.tsx',
                        isDir: false,
                    },
                ],
            },
        ],
    },
    {
        name: 'graphs',
        path: '/Users/user/projects/zizou-core/graphs',
        isDir: true,
        children: [
            {
                name: 'graph-01.json',
                path: '/Users/user/projects/zizou-core/graphs/graph-01.json',
                isDir: false,
            },
            {
                name: 'graph-02.json',
                path: '/Users/user/projects/zizou-core/graphs/graph-02.json',
                isDir: false,
            },
        ],
    },
]

beforeEach(() => {
    vi.clearAllMocks()
    mockReadDir.mockResolvedValue(makeTree())
})

// =============================================================================
// Slot 4: 挙動の検証コード (Logic Verification)
// =============================================================================

describe('FileTree — logic', () => {
    /**
     * @story ステップ 1-2
     * ツリーデータが渡されたとき、ルートディレクトリ名が画面に表示される。
     */
    it('renders root directory names from tree data', () => {
        // render(<FileTree />) // readDir は内部で呼ばれる
        // expect(screen.getByText('src')).toBeInTheDocument()
        // expect(screen.getByText('graphs')).toBeInTheDocument()
        expect(true).toBe(true) // placeholder
    })

    /**
     * @story ステップ 1-2
     * 初期状態では子ノードは非表示（expandedDirs が空）。
     */
    it('hides children on initial render when expandedDirs is empty', () => {
        // render(<FileTree />) // readDir は内部で呼ばれる
        // expect(screen.queryByText('components')).not.toBeInTheDocument()
        expect(true).toBe(true) // placeholder
    })

    /**
     * @story ステップ 3
     * ディレクトリをクリックすると子ノードが表示される（展開）。
     */
    it('expands a directory on click and shows children', () => {
        // render(<FileTree />) // readDir は内部で呼ばれる
        // fireEvent.click(screen.getByText('src'))
        // expect(screen.getByText('components')).toBeInTheDocument()
        expect(true).toBe(true) // placeholder
    })

    /**
     * @story ステップ 4
     * 展開済みディレクトリを再クリックすると子ノードが非表示になる（折りたたみ）。
     */
    it('collapses an expanded directory on second click', () => {
        // render(<FileTree />) // readDir は内部で呼ばれる
        // fireEvent.click(screen.getByText('src'))
        // expect(screen.getByText('components')).toBeInTheDocument()
        // fireEvent.click(screen.getByText('src'))
        // expect(screen.queryByText('components')).not.toBeInTheDocument()
        expect(true).toBe(true) // placeholder
    })

    /**
     * @story ステップ 5-6
     * graphs/ 配下以外のファイルをクリックしても setActiveGraphId は呼ばれない。
     */
    it('does not call setActiveGraphId when selecting a non-graph file', () => {
        // render(<FileTree />) // readDir は内部で呼ばれる
        // fireEvent.click(screen.getByText('src'))
        // fireEvent.click(screen.getByText('components'))
        // fireEvent.click(screen.getByText('FileTree.tsx'))
        // expect(mockSetActiveGraphId).not.toHaveBeenCalled()
        expect(mockSetActiveGraphId).not.toHaveBeenCalled() // placeholder
    })

    /**
     * @story ステップ 7-8
     * graphs/ 配下の .json ファイルをクリックすると setActiveGraphId が
     * 拡張子なしファイル名（graphId）で呼ばれる。
     */
    it('calls setActiveGraphId with graphId when selecting a .json under graphs/', () => {
        // render(<FileTree />) // readDir は内部で呼ばれる
        // fireEvent.click(screen.getByText('graphs'))
        // fireEvent.click(screen.getByText('graph-01.json'))
        // expect(mockSetActiveGraphId).toHaveBeenCalledWith('graph-01')
        expect(true).toBe(true) // placeholder
    })

})