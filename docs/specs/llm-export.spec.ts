/**
 * @context CTX-10: Graph Export / Import — ロジック検証
 * @bom docs/bom/llm-export.ts
 * @story
 * 1. Export: nodes/edges/catalog から LlmExportPayload が組み立てられる
 * 2. Export: status=doing のノードが progress.current に含まれる
 * 3. Export: status=done  のノードが progress.completed に含まれる
 * 4. Export: status=todo  のノードは progress に含まれない
 * 5. Export: エッジは source/target のみを持つ（id/position を含まない）
 * 6. Import: LlmImportPayload が GraphFile に変換される
 * 7. Import: position 未指定ノードはグリッドレイアウトで配置される
 * 8. Import: エッジの source/target が新しいノードIDにマッピングされる
 * 9. Import: 存在しないノードIDを参照するエッジは除外される
 * 10. Import: Zod バリデーション失敗時はエラーが返る
 * @output src/hooks/useGraphExport.ts, src/hooks/useGraphImport.ts
 *         src/components/ExportModal.tsx, src/components/ImportModal.tsx
 */

import { describe, test, expect } from 'vitest'
import type { Node, Edge } from '@xyflow/react'
import type { GraphNodeData } from '@/bom/graph'
import {
    buildLlmExport,
    importToGraphFile,
    LlmImportPayloadSchema,
    type BuildLlmExportOptions,
    type LlmImportPayload,
} from '@/bom/llm-export'

// ============================================================
// テストデータ
// ============================================================

const makeNodes = (): Node<GraphNodeData>[] => [
    {
        id: 'node-001',
        type: 'editableNode',
        position: { x: 0, y: 0 },
        data: {
            label: 'Git Status',
            nodeType: 'git',
            status: 'done',
            service: 'git',
            provider: 'local',
            input: { subcommand: 'status' },
        },
    },
    {
        id: 'node-002',
        type: 'editableNode',
        position: { x: 200, y: 0 },
        data: {
            label: 'Analyze Changes',
            nodeType: 'llm',
            status: 'doing',
            service: 'llm',
            provider: 'claude',
            input: { prompt: '変更点を要約してください' },
        },
    },
    {
        id: 'node-003',
        type: 'editableNode',
        position: { x: 400, y: 0 },
        data: {
            label: 'Review',
            nodeType: 'validate',
            status: 'todo',
            service: null,
            provider: null,
        },
    },
]

const makeEdges = (): Edge[] => [
    { id: 'edge-001', source: 'node-001', target: 'node-002' },
    { id: 'edge-002', source: 'node-002', target: 'node-003' },
]

const baseOpts = (): BuildLlmExportOptions => ({
    projectId: 'proj-1',
    projectName: 'My Project',
    graphId: 'graph-1',
    nodes: makeNodes(),
    edges: makeEdges(),
    catalog: [],
})

// ============================================================
// buildLlmExport
// ============================================================

describe('buildLlmExport', () => {

    test('logic: LlmExportPayload が組み立てられる', () => {
        const result = buildLlmExport(baseOpts())
        expect(result.project.id).toBe('proj-1')
        expect(result.graph.id).toBe('graph-1')
        expect(result.graph.nodes).toHaveLength(3)
        expect(result.graph.edges).toHaveLength(2)
        expect(result.exported_at).toBeTruthy()
    })

    test('logic: status=doing のノードが progress.current に含まれる', () => {
        const result = buildLlmExport(baseOpts())
        expect(result.progress.current).toContain('node-002')
        expect(result.progress.current).not.toContain('node-001')
        expect(result.progress.current).not.toContain('node-003')
    })

    test('logic: status=done のノードが progress.completed に含まれる', () => {
        const result = buildLlmExport(baseOpts())
        expect(result.progress.completed).toContain('node-001')
        expect(result.progress.completed).not.toContain('node-002')
        expect(result.progress.completed).not.toContain('node-003')
    })

    test('logic: status=todo のノードは progress に含まれない', () => {
        const result = buildLlmExport(baseOpts())
        expect(result.progress.current).not.toContain('node-003')
        expect(result.progress.completed).not.toContain('node-003')
    })

    test('logic: エクスポートエッジは source/target のみを持つ', () => {
        const result = buildLlmExport(baseOpts())
        const edge = result.graph.edges[0]
        expect(edge.source).toBe('node-001')
        expect(edge.target).toBe('node-002')
        expect((edge as any).id).toBeUndefined()
    })

    test('logic: ノードの label/nodeType/service/provider/input が保持される', () => {
        const result = buildLlmExport(baseOpts())
        const node = result.graph.nodes[0]
        expect(node.label).toBe('Git Status')
        expect(node.nodeType).toBe('git')
        expect(node.service).toBe('git')
        expect(node.provider).toBe('local')
        expect(node.input).toEqual({ subcommand: 'status' })
    })

    test('logic: ノード数ゼロでも正常に組み立てられる', () => {
        const opts = { ...baseOpts(), nodes: [], edges: [] }
        const result = buildLlmExport(opts)
        expect(result.graph.nodes).toHaveLength(0)
        expect(result.graph.edges).toHaveLength(0)
        expect(result.progress.current).toHaveLength(0)
        expect(result.progress.completed).toHaveLength(0)
    })

})

// ============================================================
// importToGraphFile
// ============================================================

describe('importToGraphFile', () => {

    const makeImportPayload = (): LlmImportPayload => ({
        graph: {
            nodes: [
                { id: 'a', label: 'Node A', nodeType: 'git', status: 'done' },
                { id: 'b', label: 'Node B', nodeType: 'llm', status: 'todo' },
                { id: 'c', label: 'Node C' },
            ],
            edges: [
                { source: 'a', target: 'b' },
                { source: 'b', target: 'c' },
            ],
        },
    })

    test('logic: GraphFile に変換される', () => {
        const result = importToGraphFile(makeImportPayload(), 'new-graph')
        expect(result.id).toBe('new-graph')
        expect(result.nodes).toHaveLength(3)
        expect(result.edges).toHaveLength(2)
    })

    test('logic: 全ノードが type="editableNode" になる', () => {
        const result = importToGraphFile(makeImportPayload(), 'g')
        result.nodes.forEach((n) => expect(n.type).toBe('editableNode'))
    })

    test('logic: position 未指定ノードはグリッド座標で配置される', () => {
        const result = importToGraphFile(makeImportPayload(), 'g')
        // 1つ目: col=0, row=0 → x=80, y=80
        expect(result.nodes[0].position.x).toBe(80)
        expect(result.nodes[0].position.y).toBe(80)
        // 2つ目: col=1, row=0 → x=280, y=80
        expect(result.nodes[1].position.x).toBe(280)
        expect(result.nodes[1].position.y).toBe(80)
    })

    test('logic: position 指定ノードはその座標で配置される', () => {
        const payload: LlmImportPayload = {
            graph: {
                nodes: [{ id: 'x', label: 'X', position: { x: 500, y: 300 } }],
                edges: [],
            },
        }
        const result = importToGraphFile(payload, 'g')
        expect(result.nodes[0].position).toEqual({ x: 500, y: 300 })
    })

    test('logic: エッジの source/target が新しい nanoid にマッピングされる', () => {
        const result = importToGraphFile(makeImportPayload(), 'g')
        // エッジの source/target はすべて result.nodes の id のいずれかである
        const nodeIds = new Set(result.nodes.map((n) => n.id))
        result.edges.forEach((e) => {
            expect(nodeIds.has(e.source)).toBe(true)
            expect(nodeIds.has(e.target)).toBe(true)
        })
    })

    test('logic: 存在しないノードIDを参照するエッジは除外される', () => {
        const payload: LlmImportPayload = {
            graph: {
                nodes: [{ id: 'a', label: 'A' }],
                edges: [
                    { source: 'a', target: 'UNKNOWN' },
                    { source: 'UNKNOWN', target: 'a' },
                ],
            },
        }
        const result = importToGraphFile(payload, 'g')
        expect(result.edges).toHaveLength(0)
    })

    test('logic: ノードの label/nodeType/service/provider/input/description が保持される', () => {
        const payload: LlmImportPayload = {
            graph: {
                nodes: [{
                    id: 'z',
                    label: 'My Node',
                    nodeType: 'custom',
                    status: 'doing',
                    service: 'git',
                    provider: 'local',
                    input: { subcommand: 'status' },
                    description: 'test desc',
                }],
                edges: [],
            },
        }
        const result = importToGraphFile(payload, 'g')
        const d = result.nodes[0].data
        expect(d.label).toBe('My Node')
        expect(d.nodeType).toBe('custom')
        expect(d.status).toBe('doing')
        expect(d.service).toBe('git')
        expect(d.description).toBe('test desc')
    })

})

// ============================================================
// LlmImportPayloadSchema (Zod バリデーション)
// ============================================================

describe('LlmImportPayloadSchema', () => {

    test('logic: 最小構造（graph.nodes/edges のみ）でバリデーション成功', () => {
        const result = LlmImportPayloadSchema.safeParse({
            graph: { nodes: [{ id: 'a', label: 'A' }], edges: [] },
        })
        expect(result.success).toBe(true)
    })

    test('logic: label が空文字のノードはバリデーション失敗', () => {
        const result = LlmImportPayloadSchema.safeParse({
            graph: { nodes: [{ id: 'a', label: '' }], edges: [] },
        })
        expect(result.success).toBe(false)
    })

    test('logic: graph キーがないとバリデーション失敗', () => {
        const result = LlmImportPayloadSchema.safeParse({ nodes: [] })
        expect(result.success).toBe(false)
    })

    test('logic: 不正な nodeType はバリデーション失敗', () => {
        const result = LlmImportPayloadSchema.safeParse({
            graph: {
                nodes: [{ id: 'a', label: 'A', nodeType: 'invalid-type' }],
                edges: [],
            },
        })
        expect(result.success).toBe(false)
    })

    test('logic: project / catalog / progress は optional', () => {
        const result = LlmImportPayloadSchema.safeParse({
            graph: { nodes: [], edges: [] },
            project: { id: 'p1', name: 'P' },
            progress: { current: [], completed: [] },
        })
        expect(result.success).toBe(true)
    })

})