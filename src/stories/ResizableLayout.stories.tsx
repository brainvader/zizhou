import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, within } from 'storybook/test'
import {
    ResizablePanelGroup,
    ResizablePanel,
    ResizableHandle,
} from '@/components/ui/resizable'
import { FILE_TREE_PANEL, GRAPH_EDITOR_PANEL, NODE_PROPERTY_PANEL } from '@/bom/layout'

// ── Story 用ダミーペイン ──────────────────────────────────────────────────────
const PaneStub = ({ label, testId }: { label: string; testId: string }) => (
    <div
        data-testid={testId}
        style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--card)',
            color: 'var(--muted-foreground)',
            fontSize: '11px',
            fontFamily: 'var(--font-mono)',
        }}
    >
        {label}
    </div>
)

// ── ハンドル取得ヘルパー ──────────────────────────────────────────────────────
// react-resizable-panels v4: data-separator 属性でセパレーターを特定する。
const getHandles = (canvasElement: HTMLElement) =>
    canvasElement.querySelectorAll<HTMLElement>('[data-separator]')

const meta: Meta = {
    title: 'Layout/ResizableLayout',
    parameters: { layout: 'fullscreen' },
    decorators: [
        (Story) => (
            // react-resizable-panels v4 は style を上書きするため className で高さを渡す
            <div className="w-full h-screen">
                <Story />
            </div>
        ),
    ],
}
export default meta
type Story = StoryObj

// @story 状態 1–3: 初期表示（3ペイン + 2ハンドル）
// @story 4–5 はドラッグ操作のため Playwright E2E に委譲
export const Default: Story = {
    render: () => (
        <ResizablePanelGroup orientation="horizontal" className="h-full">
            <ResizablePanel
                defaultSize={FILE_TREE_PANEL.defaultSize}
                minSize={FILE_TREE_PANEL.minSize}
                maxSize={FILE_TREE_PANEL.maxSize}
            >
                <PaneStub label="FileTree" testId="file-tree" />
            </ResizablePanel>

            <ResizableHandle withHandle />

            <ResizablePanel
                defaultSize={GRAPH_EDITOR_PANEL.defaultSize}
                minSize={GRAPH_EDITOR_PANEL.minSize}
            >
                <PaneStub label="GraphEditor" testId="graph-editor" />
            </ResizablePanel>

            <ResizableHandle withHandle />

            <ResizablePanel
                defaultSize={NODE_PROPERTY_PANEL.defaultSize}
                minSize={NODE_PROPERTY_PANEL.minSize}
                maxSize={NODE_PROPERTY_PANEL.maxSize}
            >
                <PaneStub label="NodeProperty" testId="node-property" />
            </ResizablePanel>
        </ResizablePanelGroup>
    ),
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement)

        // @story 1: 3ペインが表示される
        await expect(canvas.getByTestId('file-tree')).toBeVisible()
        await expect(canvas.getByTestId('graph-editor')).toBeVisible()
        await expect(canvas.getByTestId('node-property')).toBeVisible()

        // @story 2–3: 2つのハンドルが存在する
        const handles = getHandles(canvasElement)
        await expect(handles.length).toBe(2)
    },
}