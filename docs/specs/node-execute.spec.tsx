/**
 * Slot 1: 発注用ヘッダー (JSDoc Metadata)
 * @context  CTX-14: NODE EXECUTE DISPATCH — ロジック検証
 * @bom      docs/bom/execute.ts (ExecuteRequest, ExecuteResponse, UseNodeExecuteOptions)
 *           docs/bom/graph.ts   (GraphNodeData)
 * @story
 *   1. [useNodeExecute] execute() 呼び出し中は runningNodeId がノードIDになる
 *   2. [useNodeExecute] execute() 成功後に runningNodeId が null に戻る
 *   3. [useNodeExecute] execute() 開始時に updateNodeData({ status: 'doing' }) が呼ばれる
 *   4. [useNodeExecute] execute() 成功時に updateNodeData({ status: 'done' }) が呼ばれる
 *   5. [useNodeExecute] execute() 失敗時に updateNodeData({ status: 'todo' }) に戻され sonner toast.error が呼ばれる
 *   6. [useNodeExecute] onExecute が成功でも success:false を返したとき失敗として扱う
 *   7. [EditableNode]   service が存在するとき "▶ Run" ボタンが表示される
 *   8. [EditableNode]   service が null/undefined のとき "▶ Run" ボタンが表示されない
 *   9. [EditableNode]   "▶ Run" ボタンクリックで onRun が呼ばれる
 *  10. [EditableNode]   isRunning=true のとき "▶ Run" ボタンが "⟳ Running…" になり非活性になる
 * @output
 *   src/hooks/useNodeExecute.ts
 *   src/components/nodes/EditableNode.tsx — onRun prop 追加 / Run ボタン表示
 *   src/components/GraphEditor.tsx        — useNodeExecute マウント / onRun 注入
 */

// =============================================================================
// Slot 2: Imports
// =============================================================================

import { describe, test, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, render, screen, fireEvent } from '@testing-library/react'
import type { ExecuteRequest, ExecuteResponse } from '@/bom/execute'
import type { GraphNodeData } from '@/bom/graph'

// =============================================================================
// Slot 3: モック・セットアップ
// =============================================================================

const { mockUpdateNodeData, mockToastError } = vi.hoisted(() => ({
    mockUpdateNodeData: vi.fn(),
    mockToastError: vi.fn(),
}))

vi.mock('@/store/useGraphStore', () => ({
    useGraphStore: vi.fn((selector: (s: any) => any) =>
        selector({ updateNodeData: mockUpdateNodeData })
    ),
}))

vi.mock('sonner', () => ({
    toast: { error: mockToastError },
}))

vi.mock('@xyflow/react', () => ({
    Handle: () => null,
    Position: { Left: 'left', Right: 'right' },
}))

import { useNodeExecute } from '@/hooks/useNodeExecute'
import { EditableNode } from '@/components/nodes/EditableNode'

// ヘルパー: 成功レスポンスを生成
const makeSuccess = (stdout = 'ok'): ExecuteResponse => ({
    success: true,
    output: { stdout, stderr: '' },
    error: null,
})

// ヘルパー: 失敗レスポンス（success:false）を生成
const makeFailure = (code = 'CLI_EXECUTION_FAILED'): ExecuteResponse => ({
    success: false,
    output: null,
    error: { code, message: `${code}: process exited with non-zero` },
})

// ヘルパー: ExecuteRequest を生成
const makeRequest = (): ExecuteRequest => ({
    service: 'git',
    provider: 'local',
    cwd: '/mock/project',
    input: { subcommand: 'status' },
})

// ヘルパー: EditableNode の最小 props
const makeNodeProps = (overrides: Partial<React.ComponentProps<typeof EditableNode>> = {}) => ({
    id: 'node-001',
    type: 'editableNode' as const,
    positionAbsoluteX: 0,
    positionAbsoluteY: 0,
    zIndex: 0,
    dragging: false,
    draggable: true,
    selectable: true,
    deletable: true,
    parentId: undefined,
    selected: false,
    isConnectable: true,
    data: { label: 'Node A' } as GraphNodeData,
    ...overrides,
})

beforeEach(() => {
    vi.clearAllMocks()
})

// =============================================================================
// Slot 4: 挙動の検証
// =============================================================================

describe('useNodeExecute', () => {

    // -------------------------------------------------------------------------
    // @story 1: execute() 中は runningNodeId がノードIDになる
    // -------------------------------------------------------------------------
    test('logic: execute() 呼び出し中は runningNodeId がノードIDになる', async () => {
        let resolve!: (v: ExecuteResponse) => void
        const onExecute = vi.fn(() => new Promise<ExecuteResponse>((r) => { resolve = r }))

        const { result } = renderHook(() => useNodeExecute({ onExecute }))

        act(() => {
            result.current.execute('node-001', makeRequest())
        })

        expect(result.current.runningNodeId).toBe('node-001')

        await act(async () => { resolve(makeSuccess()) })
    })

    // -------------------------------------------------------------------------
    // @story 2: execute() 成功後に runningNodeId が null に戻る
    // -------------------------------------------------------------------------
    test('logic: execute() 成功後に runningNodeId が null に戻る', async () => {
        const onExecute = vi.fn().mockResolvedValue(makeSuccess())

        const { result } = renderHook(() => useNodeExecute({ onExecute }))

        await act(async () => {
            await result.current.execute('node-001', makeRequest())
        })

        expect(result.current.runningNodeId).toBeNull()
    })

    // -------------------------------------------------------------------------
    // @story 3: execute() 開始時に updateNodeData({ status: 'doing' }) が呼ばれる
    // -------------------------------------------------------------------------
    test('logic: execute() 開始時に updateNodeData({ status: "doing" }) が呼ばれる', async () => {
        const onExecute = vi.fn().mockResolvedValue(makeSuccess())

        const { result } = renderHook(() => useNodeExecute({ onExecute }))

        await act(async () => {
            await result.current.execute('node-001', makeRequest())
        })

        expect(mockUpdateNodeData).toHaveBeenNthCalledWith(1, 'node-001', { status: 'doing' })
    })

    // -------------------------------------------------------------------------
    // @story 4: execute() 成功時に updateNodeData({ status: 'done' }) が呼ばれる
    // -------------------------------------------------------------------------
    test('logic: execute() 成功時に updateNodeData({ status: "done" }) が呼ばれる', async () => {
        const onExecute = vi.fn().mockResolvedValue(makeSuccess())

        const { result } = renderHook(() => useNodeExecute({ onExecute }))

        await act(async () => {
            await result.current.execute('node-001', makeRequest())
        })

        expect(mockUpdateNodeData).toHaveBeenNthCalledWith(2, 'node-001', { status: 'done' })
    })

    // -------------------------------------------------------------------------
    // @story 5: execute() 失敗時（reject）に status:'todo' に戻り toast.error が呼ばれる
    // -------------------------------------------------------------------------
    test('logic: onExecute が reject したとき status を "todo" に戻して toast.error を呼ぶ', async () => {
        const onExecute = vi.fn().mockRejectedValue(new Error('connection refused'))

        const { result } = renderHook(() => useNodeExecute({ onExecute }))

        await act(async () => {
            await result.current.execute('node-001', makeRequest())
        })

        expect(mockUpdateNodeData).toHaveBeenNthCalledWith(2, 'node-001', { status: 'todo' })
        expect(mockToastError).toHaveBeenCalledOnce()
        expect(result.current.runningNodeId).toBeNull()
    })

    // -------------------------------------------------------------------------
    // @story 6: success:false を返したとき失敗として扱う
    // -------------------------------------------------------------------------
    test('logic: onExecute が success:false を返したとき status を "todo" に戻して toast.error を呼ぶ', async () => {
        const onExecute = vi.fn().mockResolvedValue(makeFailure())

        const { result } = renderHook(() => useNodeExecute({ onExecute }))

        await act(async () => {
            await result.current.execute('node-001', makeRequest())
        })

        expect(mockUpdateNodeData).toHaveBeenNthCalledWith(2, 'node-001', { status: 'todo' })
        expect(mockToastError).toHaveBeenCalledOnce()
    })

})

// =============================================================================
// EditableNode: Run ボタン表示制御
// =============================================================================

describe('EditableNode: Run Button [CTX-14]', () => {

    // -------------------------------------------------------------------------
    // @story 7: service が存在するとき "▶ Run" ボタンが表示される
    // -------------------------------------------------------------------------
    test('feature: service が存在するとき run ボタンが表示される', () => {
        render(
            <EditableNode
                {...makeNodeProps({
                    data: { label: 'Git Status', service: 'git', provider: 'local' },
                })}
            />
        )
        expect(screen.getByTestId('btn-run-node')).toBeInTheDocument()
    })

    // -------------------------------------------------------------------------
    // @story 8: service が null/undefined のとき "▶ Run" ボタンが表示されない
    // -------------------------------------------------------------------------
    test('feature: service が null のとき run ボタンが表示されない', () => {
        render(
            <EditableNode
                {...makeNodeProps({
                    data: { label: 'Plain Node' },
                })}
            />
        )
        expect(screen.queryByTestId('btn-run-node')).not.toBeInTheDocument()
    })

    // -------------------------------------------------------------------------
    // @story 9: "▶ Run" ボタンクリックで onRun が呼ばれる
    // -------------------------------------------------------------------------
    test('feature: run ボタンクリックで onRun が呼ばれる', () => {
        const onRun = vi.fn()
        render(
            <EditableNode
                {...makeNodeProps({
                    data: { label: 'Git Status', service: 'git', provider: 'local' },
                    onRun,
                })}
            />
        )
        fireEvent.click(screen.getByTestId('btn-run-node'))
        expect(onRun).toHaveBeenCalledOnce()
    })

    // -------------------------------------------------------------------------
    // @story 10: isRunning=true のとき Running… 表示かつ非活性
    // -------------------------------------------------------------------------
    test('feature: isRunning=true のとき Running… 表示になる', () => {
        render(
            <EditableNode
                {...makeNodeProps({
                    data: { label: 'Git Status', service: 'git', provider: 'local' },
                    isRunning: true,
                })}
            />
        )
        const btn = screen.getByTestId('btn-run-node')
        expect(btn).toHaveAttribute('data-running', 'true')
    })

})