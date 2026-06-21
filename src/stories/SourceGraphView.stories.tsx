import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, within } from 'storybook/test'
import { SourceGraphView } from '@/components/SourceGraphView'
import type { SourceNode, SourceEdge, TestNode, RelatedNodes } from '@/bom/source-graph'

// ============================================================
// フィクスチャ — 基本
// ============================================================

const SOURCE_NODES: SourceNode[] = [
    {
        id: 'node-1',
        type: 'sourceNode',
        position: { x: 100, y: 100 },
        data: { label: 'main.ts', filePath: 'src/main.ts', analyzed: 'fresh' },
    },
    {
        id: 'node-2',
        type: 'sourceNode',
        position: { x: 300, y: 100 },
        data: { label: 'App.tsx', filePath: 'src/App.tsx', analyzed: 'fresh' },
    },
    {
        id: 'node-3',
        type: 'sourceNode',
        position: { x: 500, y: 100 },
        data: { label: 'utils.ts', filePath: 'src/utils.ts', analyzed: 'pending' },
    },
]

const TEST_NODES: TestNode[] = [
    {
        id: 'test-node-1',
        type: 'testNode',
        position: { x: 100, y: 280 },
        data: {
            label: 'App.test.tsx',
            filePath: 'src/App.test.tsx',
            analyzed: 'fresh',
            nodeType: 'test',
            suiteCount: 2,
        },
    },
    {
        id: 'test-node-2',
        type: 'testNode',
        position: { x: 400, y: 280 },
        data: {
            label: 'utils.test.ts',
            filePath: 'src/utils.test.ts',
            analyzed: 'pending',
            nodeType: 'test',
            suiteCount: 0,
        },
    },
]

const ALL_NODES: (SourceNode | TestNode)[] = [...SOURCE_NODES, ...TEST_NODES]

const EDGES: SourceEdge[] = [
    { id: 'e1-2', source: 'node-1', target: 'node-2', kind: 'imports' },
    { id: 'e2-3', source: 'node-2', target: 'node-3', kind: 'renders' },
    { id: 'e-test-1', source: 'test-node-1', target: 'node-2', kind: 'tested-by' },
    { id: 'e-test-2', source: 'test-node-2', target: 'node-3', kind: 'tested-by' },
]

// ============================================================
// フィクスチャ — CTX-22b TaaC
// ============================================================

const CENTER_NODE: RelatedNodes['center'] = {
    id: 'node:src/components/App.test.tsx',
    type: 'testNode',
    position: { x: 0, y: 0 },
    data: {
        label: 'App.test.tsx',
        filePath: 'src/components/App.test.tsx',
        analyzed: 'fresh',
        nodeType: 'test',
    },
}

const DEP_NODES: RelatedNodes['dependencies'] = [
    {
        id: 'node:src/components/App.tsx',
        type: 'sourceNode',
        position: { x: 0, y: 0 },
        data: { label: 'App.tsx', filePath: 'src/components/App.tsx', analyzed: 'fresh' },
    },
    {
        id: 'node:src/lib/utils.ts',
        type: 'sourceNode',
        position: { x: 0, y: 0 },
        data: { label: 'utils.ts', filePath: 'src/lib/utils.ts', analyzed: 'fresh' },
    },
]

const DEPENDENT_NODES: RelatedNodes['dependents'] = [
    {
        id: 'node:src/index.ts',
        type: 'sourceNode',
        position: { x: 0, y: 0 },
        data: { label: 'index.ts', filePath: 'src/index.ts', analyzed: 'fresh' },
    },
]

const ISOLATED_RELATED: RelatedNodes = {
    center: CENTER_NODE,
    dependencies: [],
    dependents: [],
}

const EMPTY_STALE_FILES = new Set<string>()

const FULL_RELATED: RelatedNodes = {
    center: CENTER_NODE,
    dependencies: DEP_NODES,
    dependents: DEPENDENT_NODES,
}

const DEPS_ONLY_RELATED: RelatedNodes = {
    center: CENTER_NODE,
    dependencies: DEP_NODES,
    dependents: [],
}

const DEPENDENTS_ONLY_RELATED: RelatedNodes = {
    center: CENTER_NODE,
    dependencies: [],
    dependents: DEPENDENT_NODES,
}

// ============================================================
// Meta
// ============================================================

const meta: Meta<typeof SourceGraphView> = {
    component: SourceGraphView,
    title: 'Project Detail/SourceGraphView',
    parameters: { layout: 'fullscreen' },
    decorators: [
        (Story) => (
            <div style={{ width: '100%', height: '600px' }}>
                <Story />
            </div>
        ),
    ],
}
export default meta
type Story = StoryObj<typeof SourceGraphView>

// ============================================================
// 基本表示
// ============================================================

