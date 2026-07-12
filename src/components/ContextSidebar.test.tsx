/**
 * ContextSidebar — コンテキストの表示を切り替える
 *
 * @see docs/context/ContextMap.graph.html
 * @see docs/context/ContextMap.pipeline.html
 * @see src/bom/workspace.ts
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { ContextSidebar } from '@/components/ContextSidebar'
import {
    WORKSPACE_SIDEBAR_ITEMS,
    DEFAULT_VISIBLE_CONTEXT_IDS,
    type ContextNodeId,
} from '@/bom/workspace'

function getRow(id: ContextNodeId) {
    return screen.getByTestId(`ctx-row-${id}`)
}

describe('コンテキストの表示を切り替える', () => {
    it('Contexts セクションにグラフ基盤・ソース解析・プロジェクト管理が表示される', () => {
        render(<ContextSidebar />)
        expect(screen.getByText('グラフ基盤')).toBeInTheDocument()
        expect(screen.getByText('ソース解析')).toBeInTheDocument()
        expect(screen.getByText('プロジェクト管理')).toBeInTheDocument()
    })

    it('UI セクションに Todo・設定画面・ログイン画面が表示される', () => {
        render(<ContextSidebar />)
        expect(screen.getByText('Todo')).toBeInTheDocument()
        expect(screen.getByText('設定画面')).toBeInTheDocument()
        expect(screen.getByText('ログイン画面')).toBeInTheDocument()
    })

    it('Contexts は独立トグル（複数同時 ON 可）', async () => {
        const user = userEvent.setup()
        render(
            <ContextSidebar
                items={[...WORKSPACE_SIDEBAR_ITEMS]}
                defaultVisibleIds={[...DEFAULT_VISIBLE_CONTEXT_IDS]}
            />,
        )

        await user.click(getRow('source'))

        expect(getRow('foundation')).toHaveAttribute('data-visible', 'true')
        expect(getRow('source')).toHaveAttribute('data-visible', 'true')
        expect(getRow('project')).toHaveAttribute('data-visible', 'false')
    })

    it('UI は排他選択（1つ選ぶと他が OFF）', async () => {
        const user = userEvent.setup()
        render(<ContextSidebar defaultVisibleIds={[]} />)

        await user.click(getRow('todo'))
        expect(getRow('todo')).toHaveAttribute('data-visible', 'true')

        await user.click(getRow('settings'))
        expect(getRow('settings')).toHaveAttribute('data-visible', 'true')
        expect(getRow('todo')).toHaveAttribute('data-visible', 'false')
        expect(getRow('login')).toHaveAttribute('data-visible', 'false')
    })

    it('Contexts を ON にすると UI は全 OFF', async () => {
        const user = userEvent.setup()
        render(<ContextSidebar defaultVisibleIds={[]} />)

        await user.click(getRow('todo'))
        expect(getRow('todo')).toHaveAttribute('data-visible', 'true')

        await user.click(getRow('foundation'))
        expect(getRow('foundation')).toHaveAttribute('data-visible', 'true')
        expect(getRow('todo')).toHaveAttribute('data-visible', 'false')
        expect(getRow('settings')).toHaveAttribute('data-visible', 'false')
        expect(getRow('login')).toHaveAttribute('data-visible', 'false')
    })

    it('UI を選ぶと Contexts は全 OFF', async () => {
        const user = userEvent.setup()
        render(
            <ContextSidebar defaultVisibleIds={[...DEFAULT_VISIBLE_CONTEXT_IDS]} />,
        )

        expect(getRow('foundation')).toHaveAttribute('data-visible', 'true')

        await user.click(getRow('login'))
        expect(getRow('login')).toHaveAttribute('data-visible', 'true')
        expect(getRow('foundation')).toHaveAttribute('data-visible', 'false')
        expect(getRow('source')).toHaveAttribute('data-visible', 'false')
        expect(getRow('project')).toHaveAttribute('data-visible', 'false')
    })

    it('可視行は data-visible="true" と開いた目アイコン、非可視は false と閉じた目', () => {
        render(
            <ContextSidebar defaultVisibleIds={[...DEFAULT_VISIBLE_CONTEXT_IDS]} />,
        )

        const visible = getRow('foundation')
        const hidden = getRow('source')

        expect(visible).toHaveAttribute('data-visible', 'true')
        expect(visible.querySelector('[data-eye="open"]')).toBeInTheDocument()
        expect(visible.querySelector('[data-eye="closed"]')).not.toBeInTheDocument()

        expect(hidden).toHaveAttribute('data-visible', 'false')
        expect(hidden.querySelector('[data-eye="closed"]')).toBeInTheDocument()
        expect(hidden.querySelector('[data-eye="open"]')).not.toBeInTheDocument()
    })

    it('items に contexts セクションの項目が無くても、CONTEXTSラベルは常に表示する', () => {
        render(
            <ContextSidebar
                items={[{ id: 'todo', section: 'ui', label: 'Todo' }]}
                defaultVisibleIds={['todo']}
            />,
        )
        expect(screen.getByText('Contexts')).toBeInTheDocument()
        expect(screen.getByText('Todo')).toBeInTheDocument()
    })

    it('可視変化で onVisibilityChange(visibleIds) が呼ばれる', async () => {
        const user = userEvent.setup()
        const onVisibilityChange = vi.fn()
        render(
            <ContextSidebar
                defaultVisibleIds={[...DEFAULT_VISIBLE_CONTEXT_IDS]}
                onVisibilityChange={onVisibilityChange}
            />,
        )

        await user.click(getRow('source'))

        expect(onVisibilityChange).toHaveBeenCalled()
        const calls = onVisibilityChange.mock.calls
        const last = calls[calls.length - 1]?.[0] as ContextNodeId[]
        expect(last).toEqual(expect.arrayContaining(['foundation', 'source']))
        expect(last).toHaveLength(2)
    })
})