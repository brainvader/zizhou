/**
 * @context RootPathInput
 * @bom docs/bom/project.ts
 * @story
 * 1. value が空のとき Input は空で表示される
 * 2. value があるとき Input にその値が表示される
 * 3. テキスト入力すると onChange が呼ばれる
 * 4. フォルダボタンをクリックすると onOpenDirectory が呼ばれ、戻り値が onChange に渡される
 * 5. onOpenDirectory が null を返したとき onChange は呼ばれない
 * 6. error があるときエラーメッセージが表示される
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn } from 'storybook/test'
import { RootPathInput } from '@/components/RootPathInput'

const meta: Meta<typeof RootPathInput> = {
    component: RootPathInput,
    title: 'Projects/RootPathInput',
    parameters: { layout: 'centered' },
    args: {
        value: '',
        onChange: fn(),
        onOpenDirectory: fn(async () => '/Users/user/projects/zizou-core'),
    },
    decorators: [
        (Story) => (
            <div style={{ width: 360 }}>
                <Story />
            </div>
        ),
    ],
}
export default meta
type Story = StoryObj<typeof RootPathInput>

// @story 状態 1: 空
export const Empty: Story = {
    args: { value: '' },
    play: async ({ canvas }) => {
        const input = canvas.getByPlaceholderText('/Users/user/projects/my-app')
        await expect(input).toBeVisible()
        await expect(input).toHaveValue('')
    },
}

// @story 状態 2: 値あり
export const WithValue: Story = {
    args: { value: '/Users/user/projects/zizou-core' },
    play: async ({ canvas }) => {
        const input = canvas.getByPlaceholderText('/Users/user/projects/my-app')
        await expect(input).toHaveValue('/Users/user/projects/zizou-core')
    },
}

// @story 状態 3: テキスト入力 → onChange が呼ばれる
export const TextInput: Story = {
    args: { value: '' },
    play: async ({ canvas, userEvent, args }) => {
        const input = canvas.getByPlaceholderText('/Users/user/projects/my-app')
        await userEvent.type(input, '/Users/user/projects/my-app')
        await expect(args.onChange).toHaveBeenCalled()
    },
}

// @story 状態 4: フォルダボタンクリック → onOpenDirectory が呼ばれ onChange に結果が渡される
export const FolderSelect: Story = {
    args: { value: '' },
    play: async ({ canvas, userEvent, args }) => {
        await userEvent.click(canvas.getByRole('button', { name: /フォルダを選択/ }))
        await expect(args.onOpenDirectory).toHaveBeenCalledTimes(1)
        await expect(args.onChange).toHaveBeenCalledWith('/Users/user/projects/zizou-core')
    },
}

// @story 状態 5: onOpenDirectory が null を返すとき onChange は呼ばれない
export const FolderSelectCancelled: Story = {
    args: {
        value: '',
        onOpenDirectory: fn(async () => null),
    },
    play: async ({ canvas, userEvent, args }) => {
        await userEvent.click(canvas.getByRole('button', { name: /フォルダを選択/ }))
        await expect(args.onOpenDirectory).toHaveBeenCalledTimes(1)
        await expect(args.onChange).not.toHaveBeenCalled()
    },
}

// @story 状態 6: エラー表示
export const WithError: Story = {
    args: {
        value: '',
        error: 'rootPath は必須です',
    },
    play: async ({ canvas }) => {
        await expect(canvas.getByText('rootPath は必須です')).toBeVisible()
        const input = canvas.getByPlaceholderText('/Users/user/projects/my-app')
        await expect(input).toHaveClass(/border-destructive/)
    },
}