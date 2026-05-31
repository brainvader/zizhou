/**
 * Slot 1: 発注用ヘッダー
 * @context useGraphInit — GraphEditor から切り出した初期化・ロード hook
 * @bom docs/bom/graph.ts
 * @story
 * 1. projectRootPath と activeGraphId が設定されると readTextFile でグラフを読み込み loadGraph が呼ばれる
 * 2. グラフファイルが存在しない場合 resetGraph が呼ばれる
 * 3. setHydrated が false → true の順で呼ばれる
 * @output src/hooks/useGraphInit.ts
 * @note initStatus / setInitStatus は SurrealDB 移行により廃止済み
 */

import { describe, test, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import type { UseGraphInitOptions } from '@/hooks/useGraphInit'
import { useGraphInit } from '@/hooks/useGraphInit'

const MOCK_ROOT = '/Users/user/projects/zizou-core'
const MOCK_GRAPH = 'graph-01'
const MOCK_FILE_PATH = `${MOCK_ROOT}/graphs/${MOCK_GRAPH}.json`

const mockGraphJson = JSON.stringify({
    id: MOCK_GRAPH,
    nodes: [{ id: 'node-1', position: { x: 0, y: 0 }, data: { label: 'Node 1' } }],
    edges: [],
})

const {
    mockExists,
    mockReadTextFile,
    mockUseProjectDetailStore,
    mockUseGraphStore,
} = vi.hoisted(() => ({
    mockExists: vi.fn(),
    mockReadTextFile: vi.fn(),
    mockUseProjectDetailStore: vi.fn(),
    mockUseGraphStore: vi.fn(),
}))

const mockSetHydrated = vi.fn()

type ExistsFn = NonNullable<UseGraphInitOptions['onExists']>
type ReadTextFileFn = NonNullable<UseGraphInitOptions['onReadTextFile']>

const existsMock = mockExists as unknown as ExistsFn
const readTextFileMock = mockReadTextFile as unknown as ReadTextFileFn

vi.mock('@tauri-apps/plugin-fs', () => ({
    exists: mockExists,
    readTextFile: mockReadTextFile,
}))

vi.mock('@/store/useProjectDetailStore', () => ({
    useProjectDetailStore: mockUseProjectDetailStore,
}))

vi.mock('@/store/useGraphStore', () => ({
    useGraphStore: mockUseGraphStore,
}))

const makeDetailStoreState = (overrides: Partial<{
    activeGraphId: string | null
}> = {}) => ({
    activeGraphId: null,
    ...overrides,
})

const makeGraphStoreState = (overrides: Partial<{
    loadGraph: ReturnType<typeof vi.fn>
    resetGraph: ReturnType<typeof vi.fn>
}> = {}) => ({
    loadGraph: vi.fn(),
    resetGraph: vi.fn(),
    ...overrides,
})

beforeEach(() => {
    vi.clearAllMocks()
    mockSetHydrated.mockReset()
    mockExists.mockResolvedValue(true)
    mockReadTextFile.mockResolvedValue(mockGraphJson)

    mockUseProjectDetailStore.mockImplementation(
        (selector: (s: ReturnType<typeof makeDetailStoreState>) => unknown) =>
            selector(makeDetailStoreState()),
    )
    mockUseGraphStore.mockImplementation(
        (selector: (s: ReturnType<typeof makeGraphStoreState>) => unknown) =>
            selector(makeGraphStoreState()),
    )
})

describe('useGraphInit: Load Graph logic', () => {
    test('projectRootPath と activeGraphId があると readTextFile が呼ばれ loadGraph が呼ばれる', async () => {
        mockExists.mockResolvedValue(true)
        mockReadTextFile.mockResolvedValue(mockGraphJson)
        const loadGraph = vi.fn()

        mockUseGraphStore.mockImplementation(
            (selector: (s: ReturnType<typeof makeGraphStoreState>) => unknown) =>
                selector(makeGraphStoreState({ loadGraph })),
        )

        renderHook(() =>
            useGraphInit({
                projectRootPath: MOCK_ROOT,
                activeGraphId: MOCK_GRAPH,
                onLoadGraph: loadGraph,
                onExists: existsMock,
                onReadTextFile: readTextFileMock,
                setHydrated: mockSetHydrated,
            }),
        )

        await waitFor(() => {
            expect(mockReadTextFile).toHaveBeenCalledWith(MOCK_FILE_PATH)
            expect(loadGraph).toHaveBeenCalledOnce()
        })
    })

    test('グラフファイルが存在しない場合 resetGraph が呼ばれる', async () => {
        mockExists.mockResolvedValue(false)
        const resetGraph = vi.fn()

        renderHook(() =>
            useGraphInit({
                projectRootPath: MOCK_ROOT,
                activeGraphId: MOCK_GRAPH,
                onResetGraph: resetGraph,
                onExists: existsMock,
                onReadTextFile: readTextFileMock,
                setHydrated: mockSetHydrated,
            }),
        )

        await waitFor(() => expect(resetGraph).toHaveBeenCalledOnce())
    })

    test('setHydrated が false → true の順で呼ばれる', async () => {
        mockExists.mockResolvedValue(true)
        mockReadTextFile.mockResolvedValue(mockGraphJson)
        const setHydrated = vi.fn()

        renderHook(() =>
            useGraphInit({
                projectRootPath: MOCK_ROOT,
                activeGraphId: MOCK_GRAPH,
                onExists: existsMock,
                onReadTextFile: readTextFileMock,
                setHydrated,
            }),
        )

        await waitFor(() => expect(setHydrated).toHaveBeenLastCalledWith(true))
        expect(setHydrated.mock.calls[0]).toEqual([false])
    })
})