/**
 * @context SourceGraphView / SourceNode / TestNode
 * @context CTX-22: Subflow Display / TestNode 統合表示
 * @context CTX-22b: Test as a Context (TaaC) — オンデマンドグラフ表示
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
 * 8. [CTX-22b] テストファイルが未選択のとき空グラフと案内メッセージが表示される（Empty State）
 * 9. [CTX-22b] テストファイルを選択すると onGetRelatedNodes が呼ばれグラフが表示される
 * 10. [CTX-22b] 依存先ノード（dependencies）が選択ノードの左側に配置される
 * 11. [CTX-22b] 利用先ノード（dependents）が選択ノードの右側に配置される
 * 12. [CTX-22b] 依存先のみのケースで右側が空になる
 * 13. [CTX-22b] 利用先のみのケースで左側が空になる
 * 14. [CTX-22b] 依存先・利用先ともに 0 件のとき選択ノードのみ表示される
 * 15. [CTX-22b] テストファイル以外が selectedFilePath に渡されてもグラフは更新されない
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
import type { SourceContext } from '@/bom/source-context'

// ============================================================
// フィクスチャ — CTX-21 / CTX-22
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
    play: async ({ canvasElement, args }: { canvasElement: HTMLElement; args: any }) => {
        const canvas = within(canvasElement)
        // onGetRelatedNodes が呼ばれる
        await expect(args.onGetRelatedNodes).toHaveBeenCalledWith(
            expect.any(String),
            'src/components/App.test.tsx',
        )
        // center ノードが表示される
        await expect(
            await canvas.findByTestId('test-node-src-components-App.test.tsx', {}, { timeout: 3000 }),
        ).toBeVisible()
        // 空状態メッセージが消える
        await expect(canvas.queryByTestId('taac-empty-state')).not.toBeInTheDocument()
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
        onGetRelatedNodes: fn().mockResolvedValue({
            ...FULL_RELATED,
            dependents: [],
        }),
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
        onGetRelatedNodes: fn().mockResolvedValue({
            ...FULL_RELATED,
            dependencies: [],
        }),
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
        onGetRelatedNodes: fn().mockResolvedValue({
            center: CENTER_NODE,
            dependencies: [],
            dependents: [],
        }),
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
        // onGetRelatedNodes は呼ばれない
        await expect(args.onGetRelatedNodes).not.toHaveBeenCalled()
        // 空状態メッセージが表示されたまま
        await expect(canvas.getByTestId('taac-empty-state')).toBeVisible()
    },
}