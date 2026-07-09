/**
 * WorkspaceTopbar
 * Workspace の見出しを表示するヘッダー。
 *
 * @see docs/context/ContextMap.graph.html
 * @see docs/context/ContextMap.pipeline.html
 */
export function WorkspaceTopbar() {
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
        </header>
    )
}
