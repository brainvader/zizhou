/**
 * @bom      docs/bom/file-tree.ts
 * @context  CTX-19 / FileTree
 *
 * ファイルシステムツリーの型定義。
 * @tauri-apps/plugin-fs の readDir が返す構造に対応する。
 */

// ============================================================
// FsEntry — ファイル / ディレクトリの1エントリ
// ============================================================

export type FsEntry = {
    /** ファイル / ディレクトリ名（末尾部分のみ） */
    name: string
    /** rootPath からの相対パス */
    path: string
    isDirectory: boolean
    /** isDirectory === true のとき存在。未ロードは undefined、空は [] */
    children?: FsEntry[]
}

// ============================================================
// Props DI 型
// ============================================================

export type ReadDirFn = (path: string) => Promise<FsEntry[]>

export type FileTreeProps = {
    /** プロジェクトの絶対パス。readDir に渡す */
    rootPath?: string
    /** Props DI: 省略時は @tauri-apps/plugin-fs の readDir にフォールバック */
    onReadDir?: ReadDirFn
}