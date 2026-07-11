/**
 * Slot 1: 発注用ヘッダー (JSDoc Metadata)
 * @context useContextGraph — extract_context_graph を invoke し、
 *          toContextGraph() で ContextGraphNode[]/ContextGraphEdge[] に変換して保持する hook
 * @bom src/bom/extracted-graph.ts (ExtractResult, toContextGraph)
 * @bom src/bom/context-graph.ts (ContextGraphNode, ContextGraphEdge)
 * @story
 * 1. extractContextGraph(rootPath) を呼ぶと、onExtractContextGraph(rootPath) が呼ばれる。
 *    成功したら、結果を toContextGraph() で変換した nodes/edges を state にセットする。
 * 2. 呼び出し中は isLoading が true になり、完了後 false に戻る。
 * 3. onExtractContextGraph が失敗した場合、nodes/edges を空配列にフォールバックし、
 *    error にメッセージをセットし toast.error() で通知する。
 * 4. extractContextGraph の呼び出し前は nodes/edges が空配列、error が null。
 * @output src/hooks/useContextGraph.ts
 * @note 変換(toContextGraph)は hook 内で行う（useProjectLoad方式）。
 *       発火タイミング（いつ extractContextGraph を呼ぶか）はこの hook の責務外
 *       （呼び出し側 = WorkspaceRoute が needsSetup 解消後に呼ぶ）。
 */

import { describe, test, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import type { ExtractResult } from '@/bom/extracted-graph'
import { useContextGraph } from '@/hooks/useContextGraph'

const { mockToastError } = vi.hoisted(() => ({
    mockToastError: vi.fn<() => void>(),
}))

vi.mock('sonner', () => ({
    toast: { error: mockToastError },
}))

const fixtureResult: ExtractResult = {
    nodes: [
        {
            id: 'add-todo-form',
            kind: 'component',
            file: 'src/components/AddTodoForm.tsx',
            context: 'todo',
            describe: 'テキストを入力してTodoを追加する',
            criteria: [{ label: 'Enterキーで追加できる', done: true }],
            sourceContextMap: 'ContextMap.todo.html',
        },
        {
            id: 'use-todo-store',
            kind: 'hook',
            file: 'src/hooks/useTodoStore.ts',
            context: 'todo',
            describe: 'Todo一覧を保持する',
            criteria: [],
            sourceContextMap: 'ContextMap.todo.html',
        },
    ],
    edges: [{ source: 'add-todo-form', target: 'use-todo-store' }],
}

describe('useContextGraph: logic', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    test('logic: 呼び出し前は nodes/edges が空配列、error が null', () => {
        const mockExtract = vi.fn().mockResolvedValue(fixtureResult)
        const { result } = renderHook(() => useContextGraph(mockExtract))

        expect(result.current.nodes).toEqual([])
        expect(result.current.edges).toEqual([])
        expect(result.current.error).toBeNull()
        expect(mockExtract).not.toHaveBeenCalled()
    })

    test('logic: 引数省略（デフォルト値使用）時、再レンダーしても extractContextGraph の参照は変わらない', () => {
        // 呼び出し側（WorkspaceRoute）は extractContextGraph を useEffect の依存配列に含める。
        // デフォルト引数がレンダーごとに新しい関数として評価されると、
        // extractContextGraph の参照も毎回変わり、useEffect が無限に再発火する
        // （実際に起きた回帰: デフォルト値がインライン関数リテラルだった）。
        const { result, rerender } = renderHook(() => useContextGraph())
        const first = result.current.extractContextGraph

        rerender()

        expect(result.current.extractContextGraph).toBe(first)
    })

    test('logic: extractContextGraph(rootPath) は onExtractContextGraph に rootPath を渡す', async () => {
        const mockExtract = vi.fn().mockResolvedValue(fixtureResult)
        const { result } = renderHook(() => useContextGraph(mockExtract))

        await act(() => result.current.extractContextGraph('/projects/todo-app'))

        expect(mockExtract).toHaveBeenCalledWith('/projects/todo-app')
    })

    test('logic: 成功時、toContextGraph() で変換した nodes/edges を state にセットする', async () => {
        const mockExtract = vi.fn().mockResolvedValue(fixtureResult)
        const { result } = renderHook(() => useContextGraph(mockExtract))

        await act(() => result.current.extractContextGraph('/projects/todo-app'))

        expect(result.current.nodes).toHaveLength(2)
        expect(result.current.nodes.find((n) => n.id === 'add-todo-form')).toMatchObject({
            id: 'add-todo-form',
            label: 'AddTodoForm',
            kind: 'component',
            contextId: 'todo',
        })
        expect(result.current.edges).toEqual([
            { id: 'add-todo-form-use-todo-store', source: 'add-todo-form', target: 'use-todo-store' },
        ])
        expect(result.current.error).toBeNull()
    })

    test('logic: 呼び出し中は isLoading が true になり、完了後 false に戻る', async () => {
        let resolveExtract: (value: ExtractResult) => void = () => {}
        const pending = new Promise<ExtractResult>((resolve) => {
            resolveExtract = resolve
        })
        const mockExtract = vi.fn().mockReturnValue(pending)
        const { result } = renderHook(() => useContextGraph(mockExtract))

        let call: Promise<void>
        act(() => {
            call = result.current.extractContextGraph('/projects/todo-app')
        })
        expect(result.current.isLoading).toBe(true)

        await act(async () => {
            resolveExtract(fixtureResult)
            await call
        })
        expect(result.current.isLoading).toBe(false)
    })

    test('logic: 失敗時、nodes/edges を空配列にフォールバックし error をセットし toast.error を呼ぶ', async () => {
        const mockExtract = vi.fn().mockRejectedValue(new Error('extract failed'))
        const { result } = renderHook(() => useContextGraph(mockExtract))

        await act(() => result.current.extractContextGraph('/projects/todo-app'))

        expect(result.current.nodes).toEqual([])
        expect(result.current.edges).toEqual([])
        expect(result.current.error).not.toBeNull()
        expect(mockToastError).toHaveBeenCalledTimes(1)
    })
})