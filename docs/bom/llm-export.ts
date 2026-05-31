import { z } from 'zod'
import { CatalogEntrySchema } from '@/bom/graph'

// ============================================================
// LlmExportNode                                      [CTX-10]
// エクスポートJSON内のノード表現。
// ReactFlow の position など UI 固有情報を除いたシンプルな形式。
// ============================================================

export const LlmExportNodeSchema = z.object({
    id: z.string(),
    label: z.string(),
    nodeType: z.string().optional(),
    status: z.enum(['todo', 'doing', 'done']).optional(),
    service: z.string().nullable().optional(),
    provider: z.string().nullable().optional(),
    input: z.record(z.string(), z.unknown()).optional(),
    description: z.string().optional(),
})

export type LlmExportNode = z.infer<typeof LlmExportNodeSchema>

// ============================================================
// LlmExportEdge                                      [CTX-10]
// エクスポートJSON内のエッジ表現。
// source → target の有向辺。手順の順序を表す。
// ============================================================

export const LlmExportEdgeSchema = z.object({
    source: z.string(),
    target: z.string(),
})

export type LlmExportEdge = z.infer<typeof LlmExportEdgeSchema>

// ============================================================
// LlmExportProgress                                  [CTX-10]
// 作業進捗サマリ。LLMへのコンテキストとして渡す。
// current:   status=doing のノードIDリスト（現在進行中のタスク）
// completed: status=done  のノードIDリスト（完了済みタスク）
// ============================================================

export const LlmExportProgressSchema = z.object({
    current: z.array(z.string()),
    completed: z.array(z.string()),
})

export type LlmExportProgress = z.infer<typeof LlmExportProgressSchema>

// ============================================================
// LlmExportPayload                                   [CTX-10]
// クリップボード / ファイルに書き出すトップレベルのJSON形式。
// LLMチャットに貼り付けてグラフ全体を伝えるための知識フォーマット。
// ============================================================

export const LlmExportPayloadSchema = z.object({
    exported_at: z.string(),               // ISO 8601
    project: z.object({
        id: z.string(),
        name: z.string(),
    }),
    graph: z.object({
        id: z.string(),
        nodes: z.array(LlmExportNodeSchema),
        edges: z.array(LlmExportEdgeSchema),
    }),
    catalog: z.array(CatalogEntrySchema),
    progress: LlmExportProgressSchema,
})

export type LlmExportPayload = z.infer<typeof LlmExportPayloadSchema>

// ============================================================
// LlmImportPayload                                   [CTX-10]
// Import で受け取るJSON形式。
// LLMがグラフを生成・編集して返してくる想定。
// 最低限 graph.nodes / graph.edges があればインポート可能。
// catalog / progress / project / exported_at は optional。
// ============================================================

export const LlmImportNodeSchema = z.object({
    id: z.string(),
    label: z.string().min(1).max(100),
    nodeType: z.enum(['git', 'validate', 'analyze', 'llm', 'custom']).optional(),
    status: z.enum(['todo', 'doing', 'done']).optional(),
    service: z.string().nullable().optional(),
    provider: z.string().nullable().optional(),
    input: z.record(z.string(), z.unknown()).optional(),
    description: z.string().max(500).optional(),
    // position はオプション。未指定時はグリッドレイアウトで自動配置する
    position: z.object({ x: z.number(), y: z.number() }).optional(),
})

export type LlmImportNode = z.infer<typeof LlmImportNodeSchema>

export const LlmImportPayloadSchema = z.object({
    graph: z.object({
        nodes: z.array(LlmImportNodeSchema),
        edges: z.array(LlmExportEdgeSchema),
    }),
    // 以下は optional（LLMが省略してもインポート可能）
    project: z.object({ id: z.string(), name: z.string() }).optional(),
    catalog: z.array(CatalogEntrySchema).optional(),
    progress: LlmExportProgressSchema.optional(),
    exported_at: z.string().optional(),
})

export type LlmImportPayload = z.infer<typeof LlmImportPayloadSchema>

// ============================================================
// buildLlmExport                                     [CTX-10]
// GraphStore の nodes/edges + カタログから LlmExportPayload を組み立てる。
// 純粋関数（副作用なし）。テスト容易。
// ============================================================

import type { Node, Edge } from '@xyflow/react'
import type { GraphNodeData, CatalogEntry } from '@/bom/graph'

export type BuildLlmExportOptions = {
    projectId: string
    projectName: string
    graphId: string
    nodes: Node<GraphNodeData>[]
    edges: Edge[]
    catalog: CatalogEntry[]
}

export function buildLlmExport(opts: BuildLlmExportOptions): LlmExportPayload {
    const { projectId, projectName, graphId, nodes, edges, catalog } = opts

    const exportNodes: LlmExportNode[] = nodes.map((n) => ({
        id: n.id,
        label: n.data.label,
        nodeType: n.data.nodeType,
        status: n.data.status,
        service: n.data.service,
        provider: n.data.provider,
        input: n.data.input,
        description: n.data.description,
    }))

    const exportEdges: LlmExportEdge[] = edges.map((e) => ({
        source: e.source,
        target: e.target,
    }))

    const progress: LlmExportProgress = {
        current: nodes.filter((n) => n.data.status === 'doing').map((n) => n.id),
        completed: nodes.filter((n) => n.data.status === 'done').map((n) => n.id),
    }

    return {
        exported_at: new Date().toISOString(),
        project: { id: projectId, name: projectName },
        graph: { id: graphId, nodes: exportNodes, edges: exportEdges },
        catalog,
        progress,
    }
}

// ============================================================
// importToGraphFile                                  [CTX-10]
// LlmImportPayload を GraphFile 形式に変換する。
// position が未指定のノードはグリッドレイアウト（200x120 間隔）で配置する。
// ============================================================

import { nanoid } from 'nanoid'
import type { GraphFile } from '@/bom/graph'

const GRID_COL_GAP = 200
const GRID_ROW_GAP = 120
const GRID_COLS = 4
const GRID_ORIGIN = { x: 80, y: 80 }

export function importToGraphFile(
    payload: LlmImportPayload,
    graphId: string,
): GraphFile {
    const nodeIdMap = new Map<string, string>() // importId → newId

    const nodes = payload.graph.nodes.map((n, i) => {
        const newId = nanoid()
        nodeIdMap.set(n.id, newId)

        const col = i % GRID_COLS
        const row = Math.floor(i / GRID_COLS)
        const position = n.position ?? {
            x: GRID_ORIGIN.x + col * GRID_COL_GAP,
            y: GRID_ORIGIN.y + row * GRID_ROW_GAP,
        }

        return {
            id: newId,
            type: 'editableNode' as const,
            position,
            data: {
                label: n.label,
                nodeType: n.nodeType,
                status: n.status,
                service: n.service ?? null,
                provider: n.provider ?? null,
                input: n.input,
                description: n.description,
            } satisfies GraphNodeData,
        }
    })

    const edges = payload.graph.edges
        .map((e) => {
            const sourceId = nodeIdMap.get(e.source)
            const targetId = nodeIdMap.get(e.target)
            if (!sourceId || !targetId) return null
            return { id: nanoid(), source: sourceId, target: targetId }
        })
        .filter((e): e is NonNullable<typeof e> => e !== null)

    return { id: graphId, nodes, edges }
}