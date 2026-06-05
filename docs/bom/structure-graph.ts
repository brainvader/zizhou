/**
 * docs/bom/structure-graph.ts
 *
 * @context CTX-20: Project Structure Graph
 *
 * プロジェクトのファイル間依存関係グラフ（structure graph）に関する型契約。
 * Rust 側の get_structure_graph / analyze_file / analyze_project / get_changed_files
 * との対応を定義する。
 */

import type { Node as RfNode, Edge as RfEdge } from '@xyflow/react'

// ============================================================
// データモデル
// ============================================================

/**
 * structure グラフのノード。
 * ReactFlow Node 形式に file_path / analyzed が乗る。
 * data.filePath / data.analyzed は Rust 側で camelCase 化されて渡される。
 */
export type StructureNodeData = {
    label: string
    nodeType?: string
    /** rootPath 相対 / forward slash */
    filePath?: string
    /** 'pending' | 'fresh' （'stale' はフロント描画時に動的判定） */
    analyzed?: 'pending' | 'fresh'
}

export type StructureNode = RfNode<StructureNodeData>

/**
 * structure グラフのエッジ。
 * kind = 'imports' （将来 'renders' 等を追加予定）。
 */
export type StructureEdgeKind = 'imports' | 'renders'

export type StructureEdge = RfEdge & {
    kind?: StructureEdgeKind
}

/**
 * get_structure_graph / load_graph_inner の戻り値。
 */
export type StructureGraph = {
    id: string
    nodes: StructureNode[]
    edges: StructureEdge[]
}

// ============================================================
// Stale 判定
// ============================================================

/**
 * 描画時の表示用ステータス。
 * 'stale' は DB に保存されず、changedFiles ∩ node.filePath の結果から動的に算出される。
 */
export type AnalyzedDisplay = 'pending' | 'fresh' | 'stale'

/**
 * node.analyzed と changedFiles から表示用ステータスを決定する。
 *   analyzed='fresh' かつ filePath ∈ changedFiles → 'stale'
 *   analyzed='fresh' かつ filePath ∉ changedFiles → 'fresh'
 *   analyzed='pending'                             → 'pending'
 *   analyzed が undefined                           → 'pending' 扱い
 */
export const computeAnalyzedDisplay = (
    analyzed: StructureNodeData['analyzed'] | undefined,
    filePath: string | undefined,
    changedFiles: ReadonlySet<string>,
): AnalyzedDisplay => {
    if (analyzed === 'fresh') {
        return filePath && changedFiles.has(filePath) ? 'stale' : 'fresh'
    }
    return 'pending'
}

// ============================================================
// Props DI 関数型
// ============================================================

/**
 * Tauri invoke('get_structure_graph') ラッパー。
 * Storybook / Vitest で差し替え可能にするため Props DI を許容する。
 */
export type GetStructureGraphFn = (projectId: string) => Promise<StructureGraph>

/**
 * Tauri invoke('analyze_file') ラッパー。
 */
export type AnalyzeFileFn = (projectId: string, filePath: string) => Promise<void>

/**
 * Tauri invoke('analyze_project') ラッパー。
 */
export type AnalyzeProjectFn = (projectId: string) => Promise<void>

/**
 * Tauri invoke('get_changed_files') ラッパー。
 * VcsProvider 抽象のフロント側等価物。将来 Git 以外への差し替えを Props DI で行う。
 */
export type GetChangedFilesFn = (rootPath: string) => Promise<string[]>