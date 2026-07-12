/**
 * Context Pipeline の静的ステージ SSOT。
 * ContextMap.pipeline.html のモックを定数化したもの。
 *
 * @see docs/context/ContextMap.pipeline.html
 * @see src/bom/workspace.ts
 */
import {
    WORKSPACE_SIDEBAR_ITEMS,
    type ContextNodeId,
    type ContextSection,
} from '@/bom/workspace'

export type PipelineStageStatus = 'done' | 'doing' | 'todo'

export type PipelineChecklistItem = {
    label: string
    done: boolean
}

export type PipelineStage = {
    id: string
    title: string
    status: PipelineStageStatus
    description: string
    checklist?: readonly PipelineChecklistItem[]
}

/** ContextMap モック相当の固定4ステージ */
export const CONTEXT_PIPELINE_STAGES: readonly PipelineStage[] = [
    {
        id: 'design',
        title: 'Design（設計）',
        status: 'done',
        description: '人間とSonnetの対話で要件を固める。',
    },
    {
        id: 'task-splitting',
        title: 'Task Splitting（契約定義）',
        status: 'doing',
        description: 'Sonnetがdescribe/criteriaを契約として書き出す。',
        checklist: [
            { label: 'SurrealDBのnode/edgeスキーマを定義する', done: true },
            { label: 'React Flowでグラフを描画する', done: false },
        ],
    },
    {
        id: 'execution',
        title: 'Execution（実装: Haiku）',
        status: 'todo',
        description: '契約（criteria）に基づいてHaikuが機械的に実装する。',
    },
    {
        id: 'failure-handling',
        title: 'Failure Handling（失敗対応）',
        status: 'todo',
        description: 'テスト失敗はSonnetへ、契約自体の誤りはDesignへ差し戻す。',
    },
] as const

function sectionOf(id: ContextNodeId): ContextSection {
    return WORKSPACE_SIDEBAR_ITEMS.find((item) => item.id === id)?.section ?? 'contexts'
}

/**
 * アクティブコンテキストを決定する。
 * Contexts セクションの可視 ID を優先し、なければ UI、なければ null。
 */
export function resolveActiveContextId(
    visibleIds: readonly ContextNodeId[],
): ContextNodeId | null {
    const fromContexts = visibleIds.find((id) => sectionOf(id) === 'contexts')
    if (fromContexts) return fromContexts
    const fromUi = visibleIds.find((id) => sectionOf(id) === 'ui')
    return fromUi ?? null
}

export function labelForContextId(id: ContextNodeId): string {
    return WORKSPACE_SIDEBAR_ITEMS.find((item) => item.id === id)?.label ?? id
}

export type PipelineFlowNodeData = { stage: PipelineStage }
export type PipelineFlowNode = {
    id: string
    type: 'stage'
    position: { x: number; y: number }
    data: PipelineFlowNodeData
    style: { width: number }
}
export type PipelineFlowEdge = { id: string; source: string; target: string }

const PIPELINE_NODE_WIDTH = 340
// タイトル行+description分のおおよその基礎高さ
const BASE_STAGE_HEIGHT = 90
// checklist 1件あたりのおおよその追加高さ（GraphNodeCard側の行の高さに近似）
const CHECKLIST_ITEM_HEIGHT = 34
// カード間の余白（重なり防止のため、見積もり高さに対して十分な余裕を持たせる）
const STAGE_GAP = 40

/** ステージの内容（description+checklist件数）からおおよその描画高さを見積もる */
function estimateStageHeight(stage: PipelineStage): number {
    return BASE_STAGE_HEIGHT + (stage.checklist?.length ?? 0) * CHECKLIST_ITEM_HEIGHT
}

/**
 * PipelineStage[] を React Flow の Node[]/Edge[] に変換する。
 * 段階は縦一列の固定レイアウト（x=0固定）とし、dagre等の自動レイアウトは使わない
 * （並び順自体がパイプラインの意味そのものであり、依存関係グラフのような自動配置は
 * 不要なため）。ただしy座標は「インデックス×固定値」ではなく、各ステージの
 * checklist件数から見積もった高さを累積して決める（固定値だとchecklistが多い
 * ステージの直後のノードと重なってしまうため）。隣接ステージ間に1本ずつedgeを張る。
 * width は React Flow公式の推奨に合わせ data ではなく style 経由で渡す
 * （src/bom/graph-editor.ts の toReactFlowNodes と同じ理由。無いとノードが
 * 既定の極小サイズで描画され、枠が壊れて見える）。
 */
export function toPipelineFlow(stages: readonly PipelineStage[]): {
    nodes: PipelineFlowNode[]
    edges: PipelineFlowEdge[]
} {
    const nodes: PipelineFlowNode[] = []
    let y = 0
    for (const stage of stages) {
        nodes.push({
            id: stage.id,
            type: 'stage',
            position: { x: 0, y },
            data: { stage },
            style: { width: PIPELINE_NODE_WIDTH },
        })
        y += estimateStageHeight(stage) + STAGE_GAP
    }
    const edges: PipelineFlowEdge[] = stages.slice(1).map((stage, index) => ({
        id: `${stages[index].id}-${stage.id}`,
        source: stages[index].id,
        target: stage.id,
    }))
    return { nodes, edges }
}