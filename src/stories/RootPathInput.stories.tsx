/**
 * @context CTX-16: RootPathInput — ディレクトリ選択付きパス入力コンポーネント
 * @bom     docs/bom/project.ts
 * @story
 * 1. 空状態: プレースホルダーとフォルダボタンが表示される
 * 2. 値あり: 入力済みのパスが表示される
 * 3. エラーあり: エラーメッセージが表示される
 * 4. フォルダボタンクリックで onOpenDirectory が呼ばれ、返ったパスが反映される
 * 5. onOpenDirectory が null を返したとき onChange は呼ばれない
 * 6. テキスト入力で onChange が呼ばれる
 * @output src/components/RootPathInput.tsx
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent } from 'storybook/test'
import { RootPathInput } from '@/components/RootPathInput'

const meta: Meta<typeof RootPathInput> = {
    component: RootPathInput,
    title: 'Projects/RootPathInput',
    parameters: { layout: 'centered' },
    decorators: [
        (Story) => (
            <div style={{ width: 360, padding: 24 }}>
                <Story />
            </div>
        ),
    ],
    args: {
        value: '',
        onChange: fn(),
        onOpenDirectory: fn(),
    },
}
export default meta
type Story = StoryObj<typeof RootPathInput>

// @story 状態 1: 空状態 — プレースホルダーとフォルダボタンが表示される
export const Empty: Story = {
    play: async ({ canvas }) => {
        await expect(canvas.getByPlaceholderText('/Users/user/projects/my-app')).toBeVisible()
        await expect(canvas.getByRole('button', { name: 'フォルダを選択' })).toBeVisible()
    },
}

// @story 状態 2: 値あり — 入力済みのパスが表示される
export const WithValue: Story = {
    args: {
        value: '/Users/user/projects/zizhou',
    },
    play: async ({ canvas }) => {
        const input = canvas.getByPlaceholderText('/Users/user/projects/my-app') as HTMLInputElement
        await expect(input.value).toBe('/Users/user/projects/zizhou')
    },
}

// @story 状態 3: エラーあり — エラーメッセージが表示される
export const WithError: Story = {
    args: {
        error: 'root path は必須です',
    },
    play: async ({ canvas }) => {
        await expect(canvas.getByText('root path は必須です')).toBeVisible()
    },
}

// @story 状態 4: フォルダボタンクリック → onOpenDirectory が呼ばれ onChange にパスが渡される
export const FolderPickerSuccess: Story = {
    args: {
        onOpenDirectory: fn(async () => '/selected/path'),
    },
    play: async ({ canvas, args }) => {
        await userEvent.click(canvas.getByRole('button', { name: 'フォルダを選択' }))
        await expect(args.onOpenDirectory).toHaveBeenCalledOnce()
        await expect(args.onChange).toHaveBeenCalledWith('/selected/path')
    },
}

// @story 状態 5: onOpenDirectory が null を返したとき onChange は呼ばれない
export const FolderPickerCancelled: Story = {
    args: {
        onOpenDirectory: fn(async () => null),
    },
    play: async ({ canvas, args }) => {
        await userEvent.click(canvas.getByRole('button', { name: 'フォルダを選択' }))
        await expect(args.onOpenDirectory).toHaveBeenCalledOnce()
        await expect(args.onChange).not.toHaveBeenCalled()
    },
}

// @story 状態 6: テキスト入力で onChange が呼ばれる
export const TextInput: Story = {
    play: async ({ canvas, args }) => {
        await userEvent.type(
            canvas.getByPlaceholderText('/Users/user/projects/my-app'),
            '/projects/my-app',
        )
        await expect(args.onChange).toHaveBeenCalled()
    },
}