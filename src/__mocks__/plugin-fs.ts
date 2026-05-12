/**
 * @tauri-apps/plugin-fs のテスト用モック。
 * VITE_PLAYWRIGHT=true のとき vite.config.ts の alias で差し替えられる。
 *
 * URL パラメータ ?fs=uninitialized を付けると exists が false を返す。
 * デフォルト（パラメータなし）は exists が true を返す。
 *
 * writeTextFile / readTextFile は localStorage をバックエンドとして使用する。
 * これにより page.reload() を跨いだ永続化の検証が可能。
 */

const fsMode = new URLSearchParams(window.location.search).get('fs')

const DEFAULT_PROJECTS = JSON.stringify([
    {
        id: '1',
        name: 'zizou-core',
        rootPath: '/Users/user/projects/zizou-core',
    },
])

export const exists = async (path: string): Promise<boolean> => {
    // projects.json の存在確認は常に true
    if (path === 'projects.json') return true
    // graphs/ の存在確認は fsMode で切り替える
    return fsMode !== 'uninitialized'
}

export const readTextFile = async (path: string): Promise<string> => {
    const stored = localStorage.getItem(path)
    if (stored !== null) return stored
    // デフォルトフィクスチャ（projects.json）
    return DEFAULT_PROJECTS
}

export const writeTextFile = async (path: string, data: string): Promise<void> => {
    localStorage.setItem(path, data)
}

export const readDir = async (path: string) => {
    const tree: Record<string, Array<{
        name: string
        isFile: boolean
        isDirectory: boolean
        isSymlink: boolean
    }>> = {
        '/Users/user/projects/zizou-core': [
            { name: 'src', isFile: false, isDirectory: true, isSymlink: false },
            { name: 'graphs', isFile: false, isDirectory: true, isSymlink: false },
        ],
        '/Users/user/projects/zizou-core/src': [
            { name: 'components', isFile: false, isDirectory: true, isSymlink: false },
        ],
        '/Users/user/projects/zizou-core/src/components': [
            { name: 'FileTree.tsx', isFile: true, isDirectory: false, isSymlink: false },
        ],
        '/Users/user/projects/zizou-core/graphs': [
            { name: 'graph-01.json', isFile: true, isDirectory: false, isSymlink: false },
            { name: 'graph-02.json', isFile: true, isDirectory: false, isSymlink: false },
        ],
    }
    return tree[path] ?? []
}

export const mkdir = async (): Promise<void> => { }

export const BaseDirectory = {
    AppData: 14,
}