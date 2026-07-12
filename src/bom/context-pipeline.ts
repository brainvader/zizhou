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
}
export type PipelineFlowEdge = { id: string; source: string; target: string }

const PIPELINE_NODE_HEIGHT = 160

/**
 * PipelineStage[] を React Flow の Node[]/Edge[] に変換する。
 * 段階は縦一列の固定レイアウト（x=0固定、yはインデックス×一定間隔）とし、
 * dagre等の自動レイアウトは使わない（並び順自体がパイプラインの意味そのものであり、
 * 依存関係グラフのような自動配置は不要なため）。隣接ステージ間に1本ずつedgeを張る。
 */
export function toPipelineFlow(stages: readonly PipelineStage[]): {
    nodes: PipelineFlowNode[]
    edges: PipelineFlowEdge[]
} {
    const nodes: PipelineFlowNode[] = stages.map((stage, index) => ({
        id: stage.id,
        type: 'stage',
        position: { x: 0, y: index * PIPELINE_NODE_HEIGHT },
        data: { stage },
    }))
    const edges: PipelineFlowEdge[] = stages.slice(1).map((stage, index) => ({
        id: `${stages[index].id}-${stage.id}`,
        source: stages[index].id,
        target: stage.id,
    }))
    return { nodes, edges }
}