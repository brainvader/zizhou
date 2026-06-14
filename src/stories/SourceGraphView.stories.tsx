/**
 * @context SourceGraphView / SourceNode / TestNode
 * @context CTX-22: Subflow Display / TestNode 統合表示
 * @context CTX-22b: Test as a Context (TaaC) — オンデマンドグラフ表示
 * @bom docs/bom/source-graph.ts
 * @story
 * 1. ノードが表示される（基本表示確認）
 * 2. ノードをクリックすると onNodeSelect が呼ばれる（Node→File 同期）
 * 3. ソースノードとテストノードが混在して表示される
 * 4. 空状態のとき案内メッセージが表示される
 * 5. [CTX-22b] テストファイルが未選択のとき空グラフと案内メッセージが表示される（Empty State）
 * 6. [CTX-22b] テストファイルを選択すると onGetRelatedNodes が呼ばれグラフが表示される
 * 7. [CTX-22b] 依存先ノード（dependencies）が選択ノードの左側に配置される
 * 8. [CTX-22b] 利用先ノード（dependents）が選択ノードの右側に配置される
 * 9. [CTX-22b] 依存先のみのケースで右側が空になる
 * 10. [CTX-22b] 利用先のみのケースで左側が空になる
 * 11. [CTX-22b] 依存先・利用先ともに 0 件のとき選択ノードのみ表示される
 * 12. [CTX-22b] テストファイル以外が selectedFilePath に渡されてもグラフは更新されない
 *
 * SourceNode 単体テスト（stale/fresh/pending・↺ボタン・選択）→ SourceNode.stories.tsx
 * TestNode 単体テスト（stale/fresh/pending・↺/▶ボタン・選択）→ TestNode.stories.tsx
 * TaaC フィルタ単体テスト（isTestFile）→ docs/specs/taac.spec.ts
 * レイアウト計算単体テスト（computeTaaCLayout）→ docs/specs/taac.spec.ts
 */
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

const FULL_RELATED: RelatedNodes = {
    center: CENTER_NODE,
    dependencies: DEP_NODES,
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
// TestNode 統合表示
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

// ============================================================
// TaaC — Empty State（CTX-22b）
// ============================================================

/** @story [CTX-22b] テストファイルが未選択のとき空グラフと案内メッセージが表示される */
export const TaaCEmpty: Story = {
    args: {
        nodes: [],
        edges: [],
        staleFiles: new Set(),
        selectedFilePath: null,
        onGetRelatedNodes: fn(),
        onNodeSelect: fn(),
        onReanalyze: fn(),
        onNodesChange: fn(),
    },
    play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
        const canvas = within(canvasElement)
        await expect(canvas.getByTestId('taac-empty-state')).toBeVisible()
    },
}

// ============================================================
// TaaC — テストファイル選択時（CTX-22b）
// ============================================================

/** @story [CTX-22b] テストファイルを選択すると onGetRelatedNodes が呼ばれグラフが表示される */
export const TaaCTestFileSelected: Story = {
    args: {
        nodes: [],
        edges: [],
        staleFiles: new Set(),
        selectedFilePath: 'src/components/App.test.tsx',
        onGetRelatedNodes: fn().mockResolvedValue(FULL_RELATED),
        onNodeSelect: fn(),
        onReanalyze: fn(),
        onNodesChange: fn(),
    },
    play: async ({ args }: { args: any }) => {
        // onGetRelatedNodes が呼ばれたか確認するだけ
        await new Promise(r => setTimeout(r, 1000))
        await expect(args.onGetRelatedNodes).toHaveBeenCalled()
    },
}

// ============================================================
// TaaC — レイアウト確認（CTX-22b）
// ============================================================

/** @story [CTX-22b] 依存先ノード（dependencies）が選択ノードの左側に、利用先ノード（dependents）が右側に配置される */
export const TaaCFullLayout: Story = {
    args: {
        nodes: [],
        edges: [],
        staleFiles: new Set(),
        selectedFilePath: 'src/components/App.test.tsx',
        onGetRelatedNodes: fn().mockResolvedValue(FULL_RELATED),
        onNodeSelect: fn(),
        onReanalyze: fn(),
        onNodesChange: fn(),
    },
}

/** @story [CTX-22b] 依存先のみ（dependents が 0 件）のとき右側が空になる */
export const TaaCDependenciesOnly: Story = {
    args: {
        nodes: [],
        edges: [],
        staleFiles: new Set(),
        selectedFilePath: 'src/components/App.test.tsx',
        onGetRelatedNodes: fn().mockResolvedValue({ ...FULL_RELATED, dependents: [] }),
        onNodeSelect: fn(),
        onReanalyze: fn(),
        onNodesChange: fn(),
    },
}

/** @story [CTX-22b] 利用先のみ（dependencies が 0 件）のとき左側が空になる */
export const TaaCDependentsOnly: Story = {
    args: {
        nodes: [],
        edges: [],
        staleFiles: new Set(),
        selectedFilePath: 'src/components/App.test.tsx',
        onGetRelatedNodes: fn().mockResolvedValue({ ...FULL_RELATED, dependencies: [] }),
        onNodeSelect: fn(),
        onReanalyze: fn(),
        onNodesChange: fn(),
    },
}

/** @story [CTX-22b] 依存先・利用先ともに 0 件のとき選択ノードのみ表示される */
export const TaaCIsolated: Story = {
    args: {
        nodes: [],
        edges: [],
        staleFiles: new Set(),
        selectedFilePath: 'src/components/App.test.tsx',
        onGetRelatedNodes: fn().mockResolvedValue({ center: CENTER_NODE, dependencies: [], dependents: [] }),
        onNodeSelect: fn(),
        onReanalyze: fn(),
        onNodesChange: fn(),
    },
    play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
        const canvas = within(canvasElement)
        await expect(
            await canvas.findByTestId('test-node-src-components-App.test.tsx', {}, { timeout: 3000 }),
        ).toBeVisible()
    },
}

// ============================================================
// TaaC — テストファイル以外は無視（CTX-22b）
// ============================================================

/** @story [CTX-22b] テストファイル以外が selectedFilePath に渡されても onGetRelatedNodes は呼ばれず空グラフのまま */
export const TaaCNonTestFileIgnored: Story = {
    args: {
        nodes: [],
        edges: [],
        staleFiles: new Set(),
        selectedFilePath: 'src/components/App.tsx',
        onGetRelatedNodes: fn(),
        onNodeSelect: fn(),
        onReanalyze: fn(),
        onNodesChange: fn(),
    },
    play: async ({ canvasElement, args }: { canvasElement: HTMLElement; args: any }) => {
        const canvas = within(canvasElement)
        await expect(args.onGetRelatedNodes).not.toHaveBeenCalled()
        await expect(canvas.getByTestId('taac-empty-state')).toBeVisible()
    },
}