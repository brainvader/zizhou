/**
 * NotFound
 * 不明なルートを表示する。
 *
 * @see docs/context/ContextMap.projects.html
 * @see src/router.tsx
 */
export function NotFound() {
    return (
        <div
            data-testid="not-found"
            className="flex items-center justify-center h-screen bg-background text-foreground"
        >
            <p className="font-mono text-sm text-muted-foreground">Not Found</p>
        </div>
    )
}
