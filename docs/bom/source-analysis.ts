/**
 * docs/bom/source-analysis.ts
 *
 * @context CTX-21: Source Graph
 *
 * ソースファイル解析状態に関する型契約。
 * Rust 側の analyze_file / analyze_project / get_changed_files との対応を定義する。
 *
 * 命名規則:
 *   AnalyzedStatus  — DB 保存値（'pending' | 'fresh'）
 *   AnalyzedDisplay — 描画時の表示用ステータス（'pending' | 'fresh' | 'stale'）
 *   AnalysisFn      — analyze_file / analyze_project / get_changed_files の関数型
 */

// ============================================================
// AnalyzedStatus
// ============================================================

/**
 * DB 保存値。
 * 'stale' はフロント描画時に動的算出するため DB には存在しない。
 */
export type AnalyzedStatus = 'pending' | 'fresh'

// ============================================================
// AnalyzedDisplay
// ============================================================

/**
 * 描画時の表示用ステータス。
 * 'stale' は DB に保存されず、changedFiles ∩ node.filePath の結果から動的に算出する。
 */
export type AnalyzedDisplay = 'pending' | 'fresh' | 'stale'

/**
 * node.analyzed と changedFiles から表示用ステータスを決定する。
 *
 *   analyzed='fresh' かつ filePath ∈ changedFiles → 'stale'
 *   analyzed='fresh' かつ filePath ∉ changedFiles → 'fresh'
 *   analyzed='pending' / undefined                → 'pending'
 *
 * @param analyzed    DB 保存値
 * @param filePath    rootPath 相対パス（forward slash）
 * @param changedFiles git で変更検出されたファイルの集合
 * @returns           描画用ステータス
 */
export const computeAnalyzedDisplay = (
    analyzed: AnalyzedStatus | undefined,
    filePath: string | undefined,
    changedFiles: ReadonlySet<string>,
): AnalyzedDisplay => {
    if (analyzed === 'fresh') {
        return filePath && changedFiles.has(filePath) ? 'stale' : 'fresh'
    }
    return 'pending'
}

// ============================================================
// 解析関数型
// ============================================================

/**
 * analyze_file Tauri コマンドの関数型。
 * @param projectId プロジェクト ID
 * @param filePath  rootPath 相対パス（forward slash）
 */
export type AnalyzeFileFn = (projectId: string, filePath: string) => Promise<void>

/**
 * analyze_project Tauri コマンドの関数型。
 * @param projectId プロジェクト ID
 */
export type AnalyzeProjectFn = (projectId: string) => Promise<void>

/**
 * get_changed_files Tauri コマンドの関数型。
 * @param rootPath プロジェクトルートの絶対パス
 * @returns rootPath 相対パスの配列（forward slash）
 */
export type GetChangedFilesFn = (rootPath: string) => Promise<string[]>