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
 *   7. [ContextMenu]   type='node' かつ service が存在するとき "Run Node" メニュー項目が表示される
 *   8. [ContextMenu]   type='node' かつ service が null のとき "Run Node" が表示されない
 *   9. [ContextMenu]   type='edge' のとき "Run Node" が表示されない
 * @output
 *   src/hooks/useNodeExecute.ts
 *   src/components/ContextMenu.tsx  — onRunNode prop 追加 / "Run Node" 項目追加
 *   src/components/GraphEditor.tsx  — handleRunNode 追加
 *   src-tauri/src/lib.rs            — execute_node コマンド追加
 *   src/__mocks__/api-core.ts       — execute_node モック追加
 */

// =============================================================================
// Slot 2: Imports
// =============================================================================

import { describe, test, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import type { ExecuteRequest, ExecuteResponse } from '@/bom/execute'

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

import { useNodeExecute } from '@/hooks/useNodeExecute'

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
// ContextMenu: Run Node 表示制御
// =============================================================================

import { render, screen } from '@testing-library/react'
import { ContextMenu } from '@/components/ContextMenu'

describe('ContextMenu: Run Node 表示制御', () => {

    // -------------------------------------------------------------------------
    // @story 7: type='node' かつ service が存在するとき "Run Node" が表示される
    // -------------------------------------------------------------------------
    test('feature: type="node" かつ service が存在するとき "Run Node" が表示される', () => {
        render(
            <ContextMenu
                type="node"
                x={0} y={0}
                service="git"
                onDelete={vi.fn()}
                onClose={vi.fn()}
                onRunNode={vi.fn()}
            />
        )
        expect(screen.getByTestId('menu-item-run-node')).toBeInTheDocument()
    })

    // -------------------------------------------------------------------------
    // @story 8: type='node' かつ service が null のとき "Run Node" が表示されない
    // -------------------------------------------------------------------------
    test('feature: type="node" かつ service が null のとき "Run Node" が表示されない', () => {
        render(
            <ContextMenu
                type="node"
                x={0} y={0}
                service={null}
                onDelete={vi.fn()}
                onClose={vi.fn()}
            />
        )
        expect(screen.queryByTestId('menu-item-run-node')).not.toBeInTheDocument()
    })

    // -------------------------------------------------------------------------
    // @story 9: type='edge' のとき "Run Node" が表示されない
    // -------------------------------------------------------------------------
    test('feature: type="edge" のとき "Run Node" が表示されない', () => {
        render(
            <ContextMenu
                type="edge"
                x={0} y={0}
                service="git"
                onDelete={vi.fn()}
                onClose={vi.fn()}
            />
        )
        expect(screen.queryByTestId('menu-item-run-node')).not.toBeInTheDocument()
    })

})