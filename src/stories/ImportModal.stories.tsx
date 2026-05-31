/**
 * @context CTX-10: ImportModal — 視覚・インタラクション検証
 * @bom docs/bom/llm-export.ts
 * @story
 * 6.  テキストエリアに JSON をペーストできる
 * 7.  「インポート」ボタンクリックで Zod バリデーションが走る
 * 8.  バリデーション成功時に onImport が呼ばれる（payload を引数として渡す）
 * 9.  バリデーション失敗時にエラーメッセージが表示される
 * 10. 入力が空のとき「インポート」ボタンは disabled
 * 11. 「閉じる」ボタンクリックで onClose が呼ばれる
 * @output src/components/ImportModal.tsx
 */

import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, within } from 'storybook/test'
import { ImportModal } from '@/components/ImportModal'

const validJson = JSON.stringify({
    graph: {
        nodes: [
            { id: 'a', label: 'Node A', nodeType: 'git' },
            { id: 'b', label: 'Node B', nodeType: 'llm' },
        ],
        edges: [{ source: 'a', target: 'b' }],
    },
}, null, 2)

const invalidJson = JSON.stringify({ nodes: [] }, null, 2) // graph キーなし → Zod 失敗

const meta: Meta<typeof ImportModal> = {
    component: ImportModal,
    title: 'Project Detail/ImportModal',
    parameters: { layout: 'centered' },
    args: {
        onImport: fn(),
        onClose: fn(),
    },
}
export default meta
type Story = StoryObj<typeof ImportModal>

// @story 10: 空入力のとき Import ボタンは disabled
export const EmptyInput: Story = {
    play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
        const canvas = within(canvasElement)
        const btn = canvas.getByTestId('import-submit-btn')
        await expect(btn).toBeDisabled()
    },
}

// @story 8: 有効JSONで onImport が呼ばれる
export const ValidImport: Story = {
    play: async ({ canvasElement, args }: { canvasElement: HTMLElement; args: any }) => {
        const canvas = within(canvasElement)
        const textarea = canvas.getByTestId('import-textarea')
        await userEvent.clear(textarea)
        await userEvent.type(textarea, validJson)
        await userEvent.click(canvas.getByTestId('import-submit-btn'))
        await expect(args.onImport).toHaveBeenCalledOnce()
        const payload = (args.onImport as ReturnType<typeof fn>).mock.calls[0][0]
        await expect(payload.graph.nodes).toHaveLength(2)
    },
}

// @story 9: 無効JSONでエラーメッセージが表示される
export const InvalidJson: Story = {
    play: async ({ canvasElement, args }: { canvasElement: HTMLElement; args: any }) => {
        const canvas = within(canvasElement)
        const textarea = canvas.getByTestId('import-textarea')
        await userEvent.clear(textarea)
        await userEvent.type(textarea, invalidJson)
        await userEvent.click(canvas.getByTestId('import-submit-btn'))
        await expect(args.onImport).not.toHaveBeenCalled()
        await expect(canvas.getByTestId('import-error')).toBeVisible()
    },
}

// @story 9b: JSON 構文エラー（parse 失敗）
export const MalformedJson: Story = {
    play: async ({ canvasElement, args }: { canvasElement: HTMLElement; args: any }) => {
        const canvas = within(canvasElement)
        const textarea = canvas.getByTestId('import-textarea')
        await userEvent.clear(textarea)
        await userEvent.type(textarea, '{ invalid json }')
        await userEvent.click(canvas.getByTestId('import-submit-btn'))
        await expect(args.onImport).not.toHaveBeenCalled()
        await expect(canvas.getByTestId('import-error')).toBeVisible()
    },
}

// @story 11: 閉じるボタン
export const CloseButton: Story = {
    play: async ({ canvasElement, args }: { canvasElement: HTMLElement; args: any }) => {
        const canvas = within(canvasElement)
        await userEvent.click(canvas.getByTestId('import-close-btn'))
        await expect(args.onClose).toHaveBeenCalledOnce()
    },
}