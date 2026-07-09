import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import { WorkspaceTopbar } from '@/components/WorkspaceTopbar'
import { ContextSidebar } from '@/components/ContextSidebar'
import {
    WORKSPACE_SIDEBAR_ITEMS,
    DEFAULT_VISIBLE_CONTEXT_IDS,
} from '@/bom/workspace'
import type { WorkspaceView } from '@/bom/workspace'

type WorkspaceShellProps = {
    view?: WorkspaceView
}

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

/**
 * Workspace 第1スライスのシェル合成。
 * Route 本体は Router context が必要なため、Story では見た目相当を組み立てる。
 *
 * @see docs/context/ContextMap.graph.html
 * @see docs/context/ContextMap.pipeline.html
 */
function WorkspaceShell({ view = 'graph' }: WorkspaceShellProps) {
    return (
        <div
            data-testid="workspace-route"
            className="flex flex-col h-screen bg-background text-foreground"
        >
            <WorkspaceTopbar LinkComponent={StubLink} />
            <div className="flex flex-1 min-h-0 items-start p-6 gap-6">
                <ContextSidebar
                    items={[...WORKSPACE_SIDEBAR_ITEMS]}
                    defaultVisibleIds={[...DEFAULT_VISIBLE_CONTEXT_IDS]}
                />
                {view === 'pipeline' ? (
                    <div
                        data-testid="workspace-view-pipeline"
                        className="flex-1 min-h-[240px] rounded-md border border-dashed border-border"
                    />
                ) : (
                    <div
                        data-testid="workspace-view-graph"
                        className="flex-1 min-h-[240px] rounded-md border border-dashed border-border"
                    />
                )}
            </div>
        </div>
    )
}

const meta: Meta<typeof WorkspaceShell> = {
    component: WorkspaceShell,
    title: 'Workspace/Shell',
    parameters: { layout: 'fullscreen' },
}
export default meta
type Story = StoryObj<typeof WorkspaceShell>

/** @story view 未指定相当（graph） */
export const Graph: Story = {
    args: { view: 'graph' },
    play: async ({ canvas }) => {
        await expect(canvas.getByTestId('workspace-route')).toBeVisible()
        await expect(canvas.getByText('Context Graph Workspace')).toBeVisible()
        await expect(canvas.getByText('グラフ基盤')).toBeVisible()
        await expect(canvas.getByTestId('workspace-view-graph')).toBeVisible()
        await expect(
            canvas.queryByTestId('workspace-view-pipeline'),
        ).not.toBeInTheDocument()
    },
}

/** @story view=pipeline */
export const Pipeline: Story = {
    args: { view: 'pipeline' },
    play: async ({ canvas }) => {
        await expect(canvas.getByTestId('workspace-view-pipeline')).toBeVisible()
        await expect(
            canvas.queryByTestId('workspace-view-graph'),
        ).not.toBeInTheDocument()
    },
}
