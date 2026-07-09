import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent } from 'storybook/test'
import { ProjectContextSetup } from '@/components/ProjectContextSetup'

const meta: Meta<typeof ProjectContextSetup> = {
    component: ProjectContextSetup,
    title: 'Projects/ProjectContextSetup',
    parameters: { layout: 'fullscreen' },
    args: {
        projectName: '地蔵 Core',
        rootPath: '/Users/user/projects/zizhou',
        onCreate: fn(),
        onBack: fn(),
    },
}
export default meta
type Story = StoryObj<typeof ProjectContextSetup>

/** @story 作成を促す UI */
export const NeedsSetup: Story = {
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
