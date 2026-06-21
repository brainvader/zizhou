import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, within } from 'storybook/test'
import { ReactFlowProvider } from '@xyflow/react'
import { SourceNode } from '@/components/nodes/SourceNode'
import type { SourceNodeProps } from '@/bom/source-graph'

// ============================================================
// ReactFlow カスタムノードは Handle を使うため ReactFlowProvider が必要
// ============================================================

function SourceNodeWrapper(props: Partial<SourceNodeProps['data']> & { selected?: boolean }) {
    const { selected = false, ...data } = props
    const fullData: SourceNodeProps['data'] = {
        label: data.label ?? 'App.tsx',
        filePath: data.filePath ?? 'src/App.tsx',
        analyzed: data.analyzed ?? 'fresh',
        displayStatus: data.displayStatus ?? 'fresh',
        onReanalyze: data.onReanalyze,
    }
    return (
        <ReactFlowProvider>
            <div style={{ padding: 40, background: '#1c1e21', display: 'inline-block' }}>
                <SourceNode
                    id="source-node-1"
                    type="sourceNode"
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

const meta: Meta<typeof SourceNodeWrapper> = {
    component: SourceNodeWrapper,
    title: 'Project Detail/SourceNode',
    parameters: { layout: 'centered' },
}
export default meta
type Story = StoryObj<typeof SourceNodeWrapper>

// ============================================================
// 表示状態
// ============================================================

export const Fresh: Story = {
    args: {
        label: 'App.tsx',
        filePath: 'src/App.tsx',
        displayStatus: 'fresh',
        onReanalyze: fn(),
    },
}

export const Stale: Story = {
    args: {
        label: 'App.tsx',
        filePath: 'src/App.tsx',
        displayStatus: 'stale',
        onReanalyze: fn(),
    },
}

export const Pending: Story = {
    args: {
        label: 'utils.ts',
        filePath: 'src/utils.ts',
        displayStatus: 'pending',
        onReanalyze: fn(),
    },
}

export const Selected: Story = {
    args: {
        label: 'App.tsx',
        filePath: 'src/App.tsx',
        displayStatus: 'fresh',
        selected: true,
        onReanalyze: fn(),
    },
}

// ============================================================
// インタラクション
// ============================================================

