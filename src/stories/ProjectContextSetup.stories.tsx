import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent } from 'storybook/test'
import { ProjectContextSetup } from '@/components/ProjectContextSetup'

const meta: Meta<typeof ProjectContextSetup> = {
    component: ProjectContextSetup,
    title: 'Projects/ProjectContextSetup',
    parameters: { layout: 'centered' },
    args: {
        projectName: '地蔵 Core',
        rootPath: '/Users/user/projects/zizhou',
        onCreate: fn(),
        variant: 'inline',
    },
    decorators: [
        (Story) => (
            <div className="bg-background text-foreground p-4 w-[480px]">
                <Story />
            </div>
        ),
    ],
}
export default meta
type Story = StoryObj<typeof ProjectContextSetup>

/** @story グラフ上の作成バナー */
export const InlineBanner: Story = {
    play: async ({ canvas }) => {
        await expect(canvas.getByTestId('project-context-setup')).toBeVisible()
        await expect(canvas.getByTestId('ensure-zizhou-context')).toBeVisible()
        await expect(canvas.getByTestId('setup-target-path')).toHaveTextContent(
            '.zizhou/context',
        )
    },
}

/** @story 作成ボタンで onCreate */
export const ClickCreate: Story = {
    play: async ({ canvas, args }) => {
        await userEvent.click(canvas.getByTestId('ensure-zizhou-context'))
        await expect(args.onCreate).toHaveBeenCalledOnce()
    },
}
