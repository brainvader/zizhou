/**
 * toContextsSectionId / baseContextId — 同一contextId（例: "todo"）を
 * UI/Contexts 両セクションのサイドバー項目として区別可能にするための変換
 *
 * @see src/bom/workspace.ts
 */
import { describe, it, expect } from 'vitest'
import { toContextsSectionId, baseContextId } from './workspace'

describe('Contextsセクション用idの変換', () => {
    it('toContextsSectionId は元のidにサフィックスを付与する', () => {
        expect(toContextsSectionId('todo')).toBe('todo:ctx')
    })

    it('baseContextId はサフィックス付きidを元のidに戻す', () => {
        expect(baseContextId('todo:ctx')).toBe('todo')
    })

    it('baseContextId はサフィックスが無いidをそのまま返す（foundation等）', () => {
        expect(baseContextId('foundation')).toBe('foundation')
    })

    it('toContextsSectionId → baseContextId で元に戻る', () => {
        expect(baseContextId(toContextsSectionId('todo'))).toBe('todo')
    })
})