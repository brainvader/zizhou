/**
 * WorkspaceTopbar — Workspace の見出しを表示する
 *
 * @see docs/context/ContextMap.graph.html
 * @see docs/context/ContextMap.pipeline.html
 */
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'

import { WorkspaceTopbar } from './WorkspaceTopbar'

const StubLink = ({
    children,
    className,
    'data-testid': testId,
}: {
    to: string
    children: React.ReactNode
    className?: string
    'data-testid'?: string
}) => (
    <a href="/" className={className} data-testid={testId}>
        {children}
    </a>
)

describe('Workspace の見出しを表示する', () => {
    it('ロゴ・Zizou・「Context Graph Workspace」が表示される', () => {
        render(<WorkspaceTopbar LinkComponent={StubLink} />)
        expect(screen.getByText('地蔵')).toBeInTheDocument()
        expect(screen.getByText('Zizou')).toBeInTheDocument()
        expect(screen.getByText('Context Graph Workspace')).toBeInTheDocument()
    })

    it('Projects へ戻るリンクが表示される', () => {
        render(<WorkspaceTopbar LinkComponent={StubLink} />)
        const link = screen.getByTestId('back-to-projects')
        expect(link).toBeInTheDocument()
        expect(link).toHaveTextContent('Projects')
        expect(link).toHaveAttribute('href', '/')
    })
})
