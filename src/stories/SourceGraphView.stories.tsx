/**
 * @context SourceGraphView / SourceNode / TestNode
 * @context CTX-22: Subflow Display / TestNode 統合表示
 * @bom docs/bom/source-graph.ts
 * @story
 * 1. ノードが表示される（基本表示確認）
 * 2. ノードをクリックすると onNodeSelect が呼ばれる（Node→File 同期）
 * 3. [CTX-22] contexts を渡すとコンテナが表示され名前ラベルが見える
 * 4. [CTX-22] contexts が空のとき（省略）はコンテナが表示されない
 * 5. [CTX-22] ソースノードとテストノードが混在して表示される
 * 6. [CTX-22] テストノード選択時に関連ソースノードが Subflow で囲まれる
 *             FIXME: 自動連動実装後に書き直すこと
 * 7. 空状態のとき案内メッセージが表示される
 *
 * SourceNode 単体テスト（stale/fresh/pending・↺ボタン・選択）→ SourceNode.stories.tsx
 * TestNode 単体テスト（stale/fresh/pending・↺/▶ボタン・選択）→ TestNode.stories.tsx
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, within } from 'storybook/test'
import { SourceGraphView } from '@/components/SourceGraphView'
import type { SourceNode, SourceEdge, TestNode } from '@/bom/source-graph'
import type { SourceContext } from '@/bom/source-context'

// ============================================================
// フィクスチャ
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

const CONTEXTS: SourceContext[] = [
    {
        id: 'source_context:ctx-a',
        name: 'Entry Point',
        projectId: 'project:1',
        nodeIds: ['node-1', 'node-2'],
    },
]

/**
 * FIXME: 本来はテストノード選択時に analyze_tests の結果（import 解析）から
 * 自動生成されるべきコンテキスト。現在は手動で渡して視覚確認のみ。
 * CTX-22 Test Context Subflow / analyze_tests 実装後に自動連動に書き直すこと。
 */
const TEST_CONTEXTS: SourceContext[] = [
    {
        id: 'source_context:describe-app',
        name: 'App.test.tsx: Fix FileTree bug',
        projectId: 'project:1',
        nodeIds: ['node-1', 'node-2'],
    },
]

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

/** @story ノードが表示される */
export const Default: Story = {
    args: {
        nodes: SOURCE_NODES,
        edges: EDGES,
        staleFiles: new Set(),
        onNodeSelect: fn(),
        onReanalyze: fn(),
        onNodesChange: fn(),
    },
}

/** @story 空状態のとき案内メッセージが表示される */
export const Empty: Story = {
    args: {
        nodes: [],
        edges: [],
        staleFiles: new Set(),
        onNodeSelect: fn(),
        onReanalyze: fn(),
        onNodesChange: fn(),
    },
}

// ============================================================
// グラフ統合インタラクション
// ============================================================

/** @story ノードをクリックすると onNodeSelect が呼ばれる（Node→File 同期） */
export const NodeClick: Story = {
    args: {
        nodes: SOURCE_NODES,
        edges: EDGES,
        staleFiles: new Set(),
        onNodeSelect: fn(),
        onReanalyze: fn(),
        onNodesChange: fn(),
    },
    play: async ({ canvasElement, args }: { canvasElement: HTMLElement; args: any }) => {
        const canvas = within(canvasElement)
        const node = await canvas.findByTestId('source-node-src-App.tsx')
        await userEvent.click(node)
        await expect(args.onNodeSelect).toHaveBeenCalledWith('src/App.tsx')
    },
}

// ============================================================
// Subflow Display（CTX-22）
// ============================================================

/** @story contexts を渡すとコンテナが表示され名前ラベルが見える */
export const WithContexts: Story = {
    args: {
        nodes: SOURCE_NODES,
        edges: EDGES,
        staleFiles: new Set(),
        contexts: CONTEXTS,
        onNodeSelect: fn(),
        onReanalyze: fn(),
        onNodesChange: fn(),
    },
    play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
        const canvas = within(canvasElement)
        const label = await canvas.findByTestId('context-container-label-source_context:ctx-a')
        await expect(label).toBeVisible()
        await expect(label).toHaveTextContent('Entry Point')
        await expect(
            canvas.getByTestId('context-container-source_context:ctx-a')
        ).toBeInTheDocument()
    },
}

/** @story contexts が空のときコンテナが表示されない */
export const WithoutContexts: Story = {
    args: {
        nodes: SOURCE_NODES,
        edges: EDGES,
        staleFiles: new Set(),
        onNodeSelect: fn(),
        onReanalyze: fn(),
        onNodesChange: fn(),
    },
    play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
        const canvas = within(canvasElement)
        await expect(
            canvas.queryByTestId('context-container-source_context:ctx-a')
        ).not.toBeInTheDocument()
    },
}

// ============================================================
// TestNode 統合表示（CTX-22）
// ============================================================

/** @story ソースノードとテストノードが混在して表示される */
export const WithTestNodes: Story = {
    args: {
        nodes: ALL_NODES,
        edges: EDGES,
        staleFiles: new Set(),
        onNodeSelect: fn(),
        onReanalyze: fn(),
        onNodesChange: fn(),
    },
}

/**
 * @story [CTX-22] テストノード選択時に関連ソースノードが Subflow で囲まれる
 *
 * FIXME: 現在は contexts を手動で渡して視覚確認しているだけ。
 * 本来の動作:
 *   1. テストノード（App.test.tsx）を選択する
 *   2. analyze_tests の結果から import 先ノード群を自動解決する
 *   3. describe 名をラベルとした Subflow が自動的に表示される
 *
 * CTX-22 の以下が実装されたら書き直すこと:
 *   - analyze_tests コマンド
 *   - テストノード選択 → contexts 自動生成のロジック
 *   - play 関数を selectedFilePath ベースの検証に変更すること
 */
export const TestNodeWithContext: Story = {
    args: {
        nodes: ALL_NODES,
        edges: EDGES,
        staleFiles: new Set(),
        contexts: TEST_CONTEXTS,
        onNodeSelect: fn(),
        onReanalyze: fn(),
        onNodesChange: fn(),
    },
    // FIXME: 自動連動実装後は selectedFilePath でテストノードを選択し
    // Subflow が自動生成されることを検証するように書き直すこと
    play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
        const canvas = within(canvasElement)
        const label = await canvas.findByTestId(
            'context-container-label-source_context:describe-app'
        )
        await expect(label).toBeVisible()
        await expect(label).toHaveTextContent('App.test.tsx: Fix FileTree bug')
    },
}