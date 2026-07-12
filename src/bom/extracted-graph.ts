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
import { toContextsSectionId } from '@/bom/workspace'
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
 * Extractorの出力から、data-contextごとに集約した1ノードを作る（Contextsセクション用）。
 * UIセクション（構造グラフ、component/hook/external/state個別ノード）とは別物で、
 * 同じcontext配下の全ノードのcriteriaを、Zizhou自身のfeatureノード（foundation等）と
 * 同じ見た目（kind: 'feature'、checklist直付き）の1ノードに集約する。
 * どのノード由来か分かるよう、各criteriaラベルの先頭に元ノード名を添える。
 * ノード間の依存関係は表現しない（1 context = 1 node のため edges は無し）。
 */
export function toContextSummaryNodes(result: ExtractResult): ContextGraphNode[] {
    const byContext = new Map<string, ExtractedNode[]>()
    for (const n of result.nodes) {
        const ctx = n.context ?? DEFAULT_CONTEXT_ID
        const list = byContext.get(ctx)
        if (list) {
            list.push(n)
        } else {
            byContext.set(ctx, [n])
        }
    }

    return [...byContext.entries()].map(([ctx, nodesInContext], index) => {
        const checklist: ContextGraphChecklistItem[] = nodesInContext.flatMap((n) => {
            if (!n.criteria || n.criteria.length === 0) return []
            const nodeLabel = labelFromFile(n)
            return n.criteria.map((c) => ({ label: `${nodeLabel}: ${c.label}`, done: c.done }))
        })
        return {
            id: ctx,
            contextId: ctx,
            label: ctx.charAt(0).toUpperCase() + ctx.slice(1),
            kind: 'feature',
            checklist,
            position: { x: index * 220, y: 0 },
        }
    })
}

/**
 * UIセクション（依存関係グラフ全体）用の固定id。
 * data-context の値がノードごとにいくつあっても、UIは常にこの1件のみを指す
 * （「アプリ全体のつながり」と「1 data-context = 1管理単位」は別の軸のため）。
 */
export const UI_WHOLE_PROJECT_ID = '__structure__'

/**
 * 最頻出の sourceContextMap（例: "ContextMap.todo.html"）から、
 * UIセクションの表示ラベルを導出する（"ContextMap." と ".html" を除いて先頭大文字化）。
 * 同数タイの場合は先に出現したものを優先する。
 */
function deriveWholeProjectLabel(result: ExtractResult): string {
    const counts = new Map<string, number>()
    for (const n of result.nodes) {
        counts.set(n.sourceContextMap, (counts.get(n.sourceContextMap) ?? 0) + 1)
    }
    let best = ''
    let bestCount = -1
    for (const [key, count] of counts) {
        if (count > bestCount) {
            best = key
            bestCount = count
        }
    }
    const stripped = best.replace(/^ContextMap\./, '').replace(/\.html$/, '')
    return stripped.charAt(0).toUpperCase() + stripped.slice(1)
}

/**
 * Extractorの出力から、サイドバー項目を導出する。
 * UI（依存関係グラフ全体、Storybookで検証）は data-context の値によらず常に1件。
 * Contexts（ノード単位の管理単位、criteria/describeをVitest/RTLで検証）は
 * ユニークな data-context ごとに1件（サイドバー行として一意にするため
 * toContextsSectionId() で区別用idを付与する）。
 */
export function sidebarItemsFromExtracted(result: ExtractResult): ContextSidebarItem[] {
    if (result.nodes.length === 0) return []

    const contextIds = [
        ...new Set(
            result.nodes.map((n) => n.context).filter((c): c is string => Boolean(c)),
        ),
    ]

    const uiItem: ContextSidebarItem = {
        id: UI_WHOLE_PROJECT_ID,
        section: 'ui',
        label: deriveWholeProjectLabel(result),
    }
    const contextItems: ContextSidebarItem[] = contextIds.map((id) => ({
        id: toContextsSectionId(id),
        section: 'contexts' as const,
        label: id.charAt(0).toUpperCase() + id.slice(1),
    }))

    return [uiItem, ...contextItems]
}