import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import { WorkspaceTopbar } from '@/components/WorkspaceTopbar'

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

const meta: Meta<typeof WorkspaceTopbar> = {
    component: WorkspaceTopbar,
    title: 'Workspace/WorkspaceTopbar',
    parameters: { layout: 'fullscreen' },
    args: { LinkComponent: StubLink },
}
export default meta
type Story = StoryObj<typeof WorkspaceTopbar>

/** @story ロゴ・Zizou・「Context Graph Workspace」・Projects 戻りリンク */
export const Default: Story = {
    play: async ({ canvas }) => {
        await expect(canvas.getByText('地蔵')).toBeVisible()
        await expect(canvas.getByText('Zizou')).toBeVisible()
        await expect(canvas.getByText('Context Graph Workspace')).toBeVisible()
        await expect(canvas.getByTestId('back-to-projects')).toBeVisible()
        await expect(canvas.getByTestId('back-to-projects')).toHaveTextContent(
            'Projects',
        )
    },
}
