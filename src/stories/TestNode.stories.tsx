import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, within } from 'storybook/test'
import { ReactFlowProvider } from '@xyflow/react'
import { TestNode } from '@/components/nodes/TestNode'
import type { TestNodeProps } from '@/bom/source-graph'

// ============================================================
// ReactFlow カスタムノードは Handle を使うため ReactFlowProvider が必要
// ============================================================

function TestNodeWrapper(props: Partial<TestNodeProps['data']> & { selected?: boolean }) {
    const { selected = false, ...data } = props
    const fullData: TestNodeProps['data'] = {
        label: data.label ?? 'App.test.tsx',
        filePath: data.filePath ?? 'src/App.test.tsx',
        analyzed: data.analyzed ?? 'fresh',
        nodeType: 'test',
        displayStatus: data.displayStatus ?? 'fresh',
        suiteCount: data.suiteCount,
        onReanalyze: data.onReanalyze,
        onRunTest: data.onRunTest,
    }
    return (
        <ReactFlowProvider>
            <div style={{ padding: 40, background: '#1c1e21', display: 'inline-block' }}>
                <TestNode
                    id="test-node-1"
                    type="testNode"
                    data={fullData}
                    selected={selected}
                    dragging={false}
                    draggable={true}
                    selectable={true}
                    deletable={true}
                    isConnectable={true}
                    positionAbsoluteX={0}
                    positionAbsoluteY={0}
                    zIndex={0}
                />
            </div>
        </ReactFlowProvider>
    )
}

const meta: Meta<typeof TestNodeWrapper> = {
    component: TestNodeWrapper,
    title: 'Project Detail/TestNode',
    parameters: { layout: 'centered' },
}
export default meta
type Story = StoryObj<typeof TestNodeWrapper>

// ============================================================
// 表示状態
// ============================================================

export const Fresh: Story = {
    args: {
        label: 'App.test.tsx',
        filePath: 'src/App.test.tsx',
        displayStatus: 'fresh',
        suiteCount: 2,
        onReanalyze: fn(),
    },
}

export const Stale: Story = {
    args: {
        label: 'App.test.tsx',
        filePath: 'src/App.test.tsx',
        displayStatus: 'stale',
        suiteCount: 2,
        onReanalyze: fn(),
    },
}

export const Pending: Story = {
    args: {
        label: 'utils.test.ts',
        filePath: 'src/utils.test.ts',
        displayStatus: 'pending',
        suiteCount: undefined,
        onReanalyze: fn(),
    },
}

export const Selected: Story = {
    args: {
        label: 'App.test.tsx',
        filePath: 'src/App.test.tsx',
        displayStatus: 'fresh',
        suiteCount: 3,
        selected: true,
        onReanalyze: fn(),
    },
}

export const WithSuiteCount: Story = {
    args: {
        label: 'App.test.tsx',
        filePath: 'src/App.test.tsx',
        displayStatus: 'fresh',
        suiteCount: 5,
        onReanalyze: fn(),
    },
    play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
        const canvas = within(canvasElement)
        const node = await canvas.findByTestId('test-node-src-App.test.tsx')
        await expect(node).toBeVisible()
    },
}

export const NoSuiteCount: Story = {
    args: {
        label: 'App.test.tsx',
        filePath: 'src/App.test.tsx',
        displayStatus: 'fresh',
        suiteCount: 0,
        onReanalyze: fn(),
    },
}

// ============================================================
// インタラクション
// ============================================================

