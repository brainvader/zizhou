/**
 * Extractor（extractor.rs / extractor.mjs）の出力を、
 * ContextGraphNode/ContextGraphEdge（React Flow描画用の型）に変換する層。
 *
 * ContextMapは座標情報を持たないため、dagreによる自動レイアウトを介する。
 * NodeKind に無いExtractor由来のkind（service/schema）は、既存のCustomNode資産を
 * 再利用する形で見た目上マッピングする（service→external, schema→state）。
 * 新しい種別の見た目が必要になったら NodeKind とCustomNode側の対応拡張を検討する。
 *
 * @see src/bom/context-graph.ts
 * @see src/bom/graph-layout.ts
 */
import type {
    ContextGraphNode,
    ContextGraphEdge,
    ContextGraphChecklistItem,
    NodeKind,
} from '@/bom/context-graph'
import type { ContextSidebarItem } from '@/bom/workspace'
import { layoutWithDagre } from '@/bom/graph-layout'

export type ExtractedCriteriaItem = { label: string; done: boolean }

export type ExtractedNode = {
    id: string
    kind?: string
    file?: string
    context?: string
    describe?: string
    criteria?: readonly ExtractedCriteriaItem[]
    deps?: readonly string[]
    sourceContextMap: string
}

export type ExtractedEdge = {
    source: string
    target: string
}

export type ExtractResult = {
    nodes: readonly ExtractedNode[]
    edges: readonly ExtractedEdge[]
}

/** contextを持たないノードの受け皿。基本的には来ないはず（ContextMap側の記述漏れを示す） */
const DEFAULT_CONTEXT_ID = 'unknown'
const DEFAULT_NODE_WIDTH = 170
const DEFAULT_NODE_HEIGHT = 90

/** Extractorのkind文字列 → 既存NodeKindへのマッピング。未知kindは 'external' にフォールバックする。 */
const KIND_MAP: Record<string, NodeKind> = {
    component: 'component',
    hook: 'hook',
    service: 'external',
    schema: 'state',
}

function resolveKind(kind: string | undefined): NodeKind {
    if (!kind) return 'external'
    return KIND_MAP[kind] ?? 'external'
}

/**
 * file（例: "src/components/AddTodoForm.tsx"）からbasename（拡張子抜き）をlabelとして導出する。
 * fileが無ければidをそのままlabelとして使う。
 */
function labelFromFile(node: ExtractedNode): string {
    if (!node.file) return node.id
    const basename = node.file.split('/').pop() ?? node.file
    return basename.replace(/\.(tsx?|jsx?)$/, '')
}

/** criteria（Extractor由来）→ checklist（ContextGraphNode用）。criteriaが無い/空なら undefined を返す。 */
function toChecklist(
    criteria: readonly ExtractedCriteriaItem[] | undefined,
): readonly ContextGraphChecklistItem[] | undefined {
    if (!criteria || criteria.length === 0) return undefined
    return criteria.map((c) => ({ label: c.label, done: c.done }))
}

/**
 * Extractorの出力を ContextGraphNode[]/ContextGraphEdge[] に変換する。
 * 座標はdagreで自動計算する（ContextMap自体は座標情報を持たないため）。
 * ノード幅は種別によらず一律 DEFAULT_NODE_WIDTH を使う（現状の簡易実装）。
 */
export function toContextGraph(result: ExtractResult): {
    nodes: ContextGraphNode[]
    edges: ContextGraphEdge[]
} {
    const layout = layoutWithDagre(
        result.nodes.map((n) => ({
            id: n.id,
            width: DEFAULT_NODE_WIDTH,
            height: DEFAULT_NODE_HEIGHT,
        })),
        result.edges,
    )

    const nodes: ContextGraphNode[] = result.nodes.map((n) => ({
        id: n.id,
        contextId: n.context ?? DEFAULT_CONTEXT_ID,
        label: labelFromFile(n),
        kind: resolveKind(n.kind),
        checklist: toChecklist(n.criteria),
        describe: n.describe,
        position: layout[n.id] ?? { x: 0, y: 0 },
        width: DEFAULT_NODE_WIDTH,
        accent: n.kind === 'service' || n.kind === 'schema' ? 'dashed' : undefined,
    }))

    const edges: ContextGraphEdge[] = result.edges.map((e) => ({
        id: `${e.source}-${e.target}`,
        source: e.source,
        target: e.target,
    }))

    return { nodes, edges }
}

/**
 * Extractorの出力から、ユニークな context（data-context値）ごとに
 * UIセクションのサイドバー項目を導出する。
 * ラベルは context id の先頭文字を大文字化した程度の簡易整形に留める。
 */
export function sidebarItemsFromExtracted(result: ExtractResult): ContextSidebarItem[] {
    const contextIds = [
        ...new Set(
            result.nodes.map((n) => n.context).filter((c): c is string => Boolean(c)),
        ),
    ]
    return contextIds.map((id) => ({
        id,
        section: 'ui' as const,
        label: id.charAt(0).toUpperCase() + id.slice(1),
    }))
}