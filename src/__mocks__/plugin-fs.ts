/**
 * @tauri-apps/plugin-fs のテスト用モック。
 * VITE_PLAYWRIGHT=true のとき vite.config.ts の alias で差し替えられる。
 *
 * URL パラメータ ?fs=uninitialized を付けると exists が false を返す。
 * デフォルト（パラメータなし）は exists が true を返す。
 *
 * --- localStorage バックエンド（グラフデータ永続化）---
 * パスに /graphs/ を含む操作は localStorage を使う。
 *   writeTextFile → localStorage.setItem(path, contents)
 *   readTextFile  → localStorage.getItem(path) / なければ throw
 *   exists        → グラフファイル（*.json）は localStorage にキーがあるか確認
 *                   graphs/ ディレクトリ自体の存在確認は fsMode で従来通り制御
 */

// ============================================================
// Utilities
// ============================================================

const isGraphFile = (path: string): boolean =>
    /[\\/]graphs[\\/][^/\\/]+\.json$/.test(path)

const isProjectDetailFile = (path: string): boolean =>
    /^project-detail-.+\.json$/.test(path)

// ============================================================
// exists
// ============================================================

export const exists = async (path: string): Promise<boolean> => {
    if (path === 'projects.json') return true
    if (isGraphFile(path)) return localStorage.getItem(path) !== null
    if (isProjectDetailFile(path)) return localStorage.getItem(path) !== null
    return true
}

// ============================================================
// readTextFile
// ============================================================

export const readTextFile = async (path: string): Promise<string> => {
    // グラフファイルは localStorage から読む
    if (isGraphFile(path)) {
        const value = localStorage.getItem(path)
        if (value === null) throw new Error(`[mock] file not found: ${path}`)
        return value
    }
    // project-detail-{id}.json は localStorage から読む
    if (isProjectDetailFile(path)) {
        const value = localStorage.getItem(path)
        if (value === null) throw new Error(`[mock] file not found: ${path}`)
        return value
    }
    // projects.json（AppData 相対パス）は固定フィクスチャを返す
    return JSON.stringify([
        {
            id: '1',
            name: 'zizou-core',
            rootPath: '/Users/user/projects/zizou-core',
        },
    ])
}

// ============================================================
// writeTextFile
// ============================================================

export const writeTextFile = async (path: string, contents: string): Promise<void> => {
    // グラフファイルは localStorage に書く
    if (isGraphFile(path)) {
        localStorage.setItem(path, contents)
        return
    }
    // project-detail-{id}.json は localStorage に書く
    if (isProjectDetailFile(path)) {
        localStorage.setItem(path, contents)
        return
    }
    // その他は no-op（projects.json 等）
}

// ============================================================
// 以下は変更なし
// ============================================================

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

export const watch = async (
    _path: string,
    _callback: () => void,
    _options?: { recursive?: boolean }
): Promise<() => void> => {
    return () => { }
}