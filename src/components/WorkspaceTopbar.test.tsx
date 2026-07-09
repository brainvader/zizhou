/**
 * WorkspaceTopbar — Workspace の見出しを表示する
 *
 * @see docs/context/ContextMap.graph.html
 * @see docs/context/ContextMap.pipeline.html
 */
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'

import { WorkspaceTopbar } from './WorkspaceTopbar'

describe('Workspace の見出しを表示する', () => {
    it('ロゴ・Zizou・「Context Graph Workspace」が表示される', () => {
        render(<WorkspaceTopbar />)
        expect(screen.getByText('地蔵')).toBeInTheDocument()
        expect(screen.getByText('Zizou')).toBeInTheDocument()
        expect(screen.getByText('Context Graph Workspace')).toBeInTheDocument()
    })
})
