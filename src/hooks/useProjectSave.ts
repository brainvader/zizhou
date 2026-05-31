/**
 * useProjectSave
 *
 * @deprecated SurrealDB 移行により廃止予定。
 *             プロジェクトの永続化は invoke('create_project') に移行済み。
 *             このhookは削除対象。呼び出し元から外してください。
 *
 * @see src/hooks/useProjectLoad.ts — 読み込み側
 * @see src-tauri/src/lib.rs — create_project コマンド
 */
export const useProjectSave = () => {
    return {}
}