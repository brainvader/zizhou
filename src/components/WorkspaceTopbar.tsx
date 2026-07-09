import { Link } from '@tanstack/react-router'

type LinkProps = {
    to: string
    children: React.ReactNode
    className?: string
    'data-testid'?: string
}

export type WorkspaceTopbarProps = {
    /** props DI: Storybook / テスト用。省略時は TanStack Router の Link */
    LinkComponent?: React.ComponentType<LinkProps>
}

/**
 * WorkspaceTopbar
 * Workspace の見出しと Projects への戻りリンクを表示する。
 *
 * @see docs/context/ContextMap.graph.html
 * @see docs/context/ContextMap.pipeline.html
 */
export function WorkspaceTopbar({
    LinkComponent = DefaultLink,
}: WorkspaceTopbarProps = {}) {
    const NavLink = LinkComponent

    return (
        <header
            data-testid="workspace-topbar"
            className="h-13 bg-card border-b border-border flex items-center px-5 gap-3.5 shrink-0 shadow-[inset_0_1px_0_#c0392b28]"
        >
            <span
                className="text-[18px] tracking-[0.1em] text-foreground leading-none"
                style={{ fontFamily: "'Noto Serif JP', serif" }}
            >
                地蔵
            </span>
            <div className="w-px h-4 bg-border" />
            <span className="font-mono text-[9px] text-muted-foreground tracking-[0.2em] uppercase">
                Zizou
            </span>
            <div className="w-px h-4 bg-border" />
            <span className="text-xs text-muted-foreground">
                Context Graph Workspace
            </span>

            <div className="flex-1" />

            <NavLink
                to="/"
                data-testid="back-to-projects"
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
                ‹ Projects
            </NavLink>
        </header>
    )
}

function DefaultLink({ to, children, className, 'data-testid': testId }: LinkProps) {
    return (
        <Link to={to} search={{}} className={className} data-testid={testId}>
            {children}
        </Link>
    )
}
