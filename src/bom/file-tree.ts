/**
 * @bom      docs/bom/file-tree.ts
 * @context  CTX-19 / FileTree
 * @context  CTX-20 / Project Structure Graph 連携用 props 追加
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

/**
 * [CTX-20] ファイルクリック時に呼ばれるハンドラ。
 * 引数 filePath は rootPath 相対パス (forward slash)。
 */
export type OnFileClickFn = (filePath: string) => void

export type FileTreeProps = {
    /** プロジェクトの絶対パス。readDir に渡す */
    rootPath?: string
    /** Props DI: 省略時は @tauri-apps/plugin-fs の readDir にフォールバック */
    onReadDir?: ReadDirFn

    // ============================================================
    // [CTX-20] 構造グラフ連携用
    // ============================================================
    /** ファイルクリック時に呼ばれる。analyze_file 呼び出しや File↔Node 同期に使う */
    onFileClick?: OnFileClickFn
    /** 選択中ファイル（rootPath 相対 / forward slash）— ハイライト用 */
    selectedFilePath?: string | null
    /** stale 表示対象（rootPath 相対 / forward slash） */
    staleFiles?: ReadonlySet<string>
    /** 構造グラフに登録済みのファイル（rootPath 相対 / forward slash） */
    analyzedFiles?: ReadonlySet<string>
}