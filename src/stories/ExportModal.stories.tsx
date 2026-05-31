/**
 * @context CTX-10: ExportModal — 視覚・インタラクション検証
 * @bom docs/bom/llm-export.ts
 * @story
 * 1. JSON テキストエリアにエクスポート内容が表示される
 * 2. 「コピー」ボタンクリックで onCopy が呼ばれる
 * 3. 「保存」ボタンクリックで onSave が呼ばれる
 * 4. 「閉じる」ボタンクリックで onClose が呼ばれる
 * 5. nodes=[] のとき空グラフのJSONが表示される
 * @output src/components/ExportModal.tsx
 */

import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, within } from 'storybook/test'
import { ExportModal } from '@/components/ExportModal'
import type { LlmExportPayload } from '@/bom/llm-export'

const mockPayload: LlmExportPayload = {
    exported_at: '2026-05-31T00:00:00.000Z',
    project: { id: 'proj-1', name: 'My Project' },
    graph: {
        id: 'graph-1',
        nodes: [
            { id: 'node-001', label: 'Git Status', nodeType: 'git', status: 'done' },
            { id: 'node-002', label: 'Analyze', nodeType: 'llm', status: 'doing' },
        ],
        edges: [{ source: 'node-001', target: 'node-002' }],
    },
    catalog: [],
    progress: { current: ['node-002'], completed: ['node-001'] },
}

const meta: Meta<typeof ExportModal> = {
    component: ExportModal,
    title: 'Project Detail/ExportModal',
    parameters: { layout: 'centered' },
    args: {
        payload: mockPayload,
        onCopy: fn(),
        onSave: fn(),
        onClose: fn(),
    },
}
export default meta
type Story = StoryObj<typeof ExportModal>

// @story 1: JSONが表示される
export const Default: Story = {
    play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
        const canvas = within(canvasElement)
        const textarea = canvas.getByTestId('export-textarea') as HTMLTextAreaElement
        await expect(textarea.value).toContain('graph-1')
        await expect(textarea.value).toContain('Git Status')
    },
}

// @story 2: コピーボタン
export const CopyButton: Story = {
    play: async ({ canvasElement, args }: { canvasElement: HTMLElement; args: any }) => {
        const canvas = within(canvasElement)
        await userEvent.click(canvas.getByTestId('export-copy-btn'))
        await expect(args.onCopy).toHaveBeenCalledOnce()
    },
}

// @story 3: 保存ボタン
export const SaveButton: Story = {
    play: async ({ canvasElement, args }: { canvasElement: HTMLElement; args: any }) => {
        const canvas = within(canvasElement)
        await userEvent.click(canvas.getByTestId('export-save-btn'))
        await expect(args.onSave).toHaveBeenCalledOnce()
    },
}

// @story 4: 閉じるボタン
export const CloseButton: Story = {
    play: async ({ canvasElement, args }: { canvasElement: HTMLElement; args: any }) => {
        const canvas = within(canvasElement)
        await userEvent.click(canvas.getByTestId('export-close-btn'))
        await expect(args.onClose).toHaveBeenCalledOnce()
    },
}

// @story 5: 空グラフ
export const EmptyGraph: Story = {
    args: {
        payload: {
            ...mockPayload,
            graph: { id: 'empty', nodes: [], edges: [] },
            progress: { current: [], completed: [] },
        },
    },
    play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
        const canvas = within(canvasElement)
        const textarea = canvas.getByTestId('export-textarea') as HTMLTextAreaElement
        await expect(textarea.value).toContain('"nodes": []')
    },
}