/**
 * Slot 1: 発注用ヘッダー (JSDoc Metadata)
 * @context useProjectSave — SurrealDB 移行により廃止予定
 * @bom docs/bom/project.ts
 *
 * @note useProjectSave は Tauri fs（projects.json）依存のため SurrealDB 移行により廃止。
 *       プロジェクトの作成は ProjectGrid の onCreateProject（invoke('create_project')）に移行済み。
 *       このSpecは廃止対象。
 *
 * @output src/hooks/useProjectSave.ts
 */

import { describe, test } from 'vitest'

describe.skip('useProjectSave: logic', () => {
    test.todo('SurrealDB 移行により廃止。invoke("create_project") に移行済み。')
})