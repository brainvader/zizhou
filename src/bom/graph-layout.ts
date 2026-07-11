/**
 * dagre による自動レイアウト。
 * Extractor由来のノードは座標情報を持たないため、React Flow に渡す前に
 * dagreで機械的にx/y位置を計算する。
 *
 * @see src/bom/extracted-graph.ts
 */
import dagre from 'dagre'

export type LayoutInput = {
    id: string
    width: number
    height: number
}

export type LayoutEdge = {
    source: string
    target: string
}

export type LayoutResult = Record<string, { x: number; y: number }>

const DEFAULT_RANK_SEP = 80
const DEFAULT_NODE_SEP = 40

/**
 * dagreはノード中心座標を返すため、React Flow（左上原点）に合わせて
 * width/height の半分を引いて返す。
 * source/targetの一方がnodes集合に無いエッジは無視する（dagreがエラーになるため）。
 */
export function layoutWithDagre(
    nodes: readonly LayoutInput[],
    edges: readonly LayoutEdge[],
    direction: 'TB' | 'LR' = 'TB',
): LayoutResult {
    const g = new dagre.graphlib.Graph()
    g.setGraph({ rankdir: direction, ranksep: DEFAULT_RANK_SEP, nodesep: DEFAULT_NODE_SEP })
    g.setDefaultEdgeLabel(() => ({}))

    for (const node of nodes) {
        g.setNode(node.id, { width: node.width, height: node.height })
    }
    for (const edge of edges) {
        if (g.hasNode(edge.source) && g.hasNode(edge.target)) {
            g.setEdge(edge.source, edge.target)
        }
    }

    dagre.layout(g)

    const result: LayoutResult = {}
    for (const node of nodes) {
        const pos = g.node(node.id)
        result[node.id] = {
            x: pos.x - node.width / 2,
            y: pos.y - node.height / 2,
        }
    }
    return result
}