/**
 * ComponentGraphEditor — React Flow ベースでグラフを表示する
 *
 * @see src/bom/graph-editor.ts
 * @see src/bom/graph-node-types.ts
 */
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'

import { ComponentGraphEditor } from './ComponentGraphEditor'

describe('React Flow ベースでグラフを表示する', () => {
    it('visibleIds に含まれるノードが表示される', () => {
        render(<ComponentGraphEditor visibleIds={['foundation']} />)
        expect(screen.getByTestId('graph-node-foundation')).toBeInTheDocument()
    })

    it('visibleIds に含まれないノードは表示されない', () => {
        render(<ComponentGraphEditor visibleIds={['foundation']} />)
        expect(screen.queryByTestId('graph-node-source')).not.toBeInTheDocument()
    })

    it('todo グループが可視のとき todo 配下のノードが表示される', () => {
        render(<ComponentGraphEditor visibleIds={['todo']} />)
        expect(screen.getByTestId('graph-node-add-todo-form')).toBeInTheDocument()
        expect(screen.getByTestId('graph-node-use-todo-store')).toBeInTheDocument()
    })

    it('可視ノードが無いとき空状態メッセージを表示する', () => {
        render(<ComponentGraphEditor visibleIds={[]} />)
        expect(screen.getByTestId('component-graph-empty')).toHaveTextContent(
            '表示中のコンテクストがありません',
        )
    })
})
