/**
 * Slot 1: 発注用ヘッダー
 * @context useGraphInit — GraphEditor から切り出した初期化・ロード hook
 * @bom docs/bom/graph.ts
 * @story
 * 1. projectRootPath が設定されると setInitStatus('ready') が呼ばれる
 * 2. activeGraphId が変化したとき readTextFile でグラフを読み込み loadGraph が呼ばれる
 * 3. グラフファイルが存在しない場合 resetGraph が呼ばれる
 * 4. setHydrated が false → true の順で呼ばれる
 * @output src/hooks/useGraphInit.ts
 */

import { describe, test, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import type { InitStatus } from '@/bom/graph'
import type { UseGraphInitOptions } from '@/hooks/useGraphInit'
import { useGraphInit } from '@/hooks/useGraphInit'

const MOCK_ROOT = '/Users/user/projects/zizou-core'
const MOCK_GRAPH = 'graph-01'
const MOCK_GRAPHS_DIR = `${MOCK_ROOT}/graphs`
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
    mockSetHydrated,
} = vi.hoisted(() => ({
    mockExists: vi.fn(),
    mockReadTextFile: vi.fn(),
    mockUseProjectDetailStore: vi.fn(),
    mockUseGraphStore: vi.fn(),
    mockSetHydrated: vi.fn(),
}))

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

vi.mock('@/hooks/useGraphFile', () => ({
    useGraphFile: () => ({ setHydrated: mockSetHydrated }),
}))

const makeDetailStoreState = (overrides: Partial<{
    initStatus: InitStatus
    projectRootPath: string
    activeGraphId: string | null
    setInitStatus: ReturnType<typeof vi.fn>
}> = {}) => ({
    initStatus: 'checking' as InitStatus,
    projectRootPath: MOCK_ROOT,
    activeGraphId: null,
    setInitStatus: vi.fn(),
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

describe('useGraphInit: Init Check logic', () => {
    test('projectRootPath が設定されると setInitStatus("ready") が呼ばれる', async () => {
        const setInitStatus = vi.fn()

        mockUseProjectDetailStore.mockImplementation(
            (selector: (s: ReturnType<typeof makeDetailStoreState>) => unknown) =>
                selector(makeDetailStoreState({ setInitStatus })),
        )

        renderHook(() =>
            useGraphInit({
                projectRootPath: MOCK_ROOT,
                onExists: existsMock,
                onReadTextFile: readTextFileMock,
                setHydrated: mockSetHydrated,
            }),
        )

        await waitFor(() => expect(setInitStatus).toHaveBeenCalledWith('ready'))
    })
})

describe('useGraphInit: Load Graph logic', () => {
    test('initStatus が ready かつ activeGraphId があると readTextFile が呼ばれる', async () => {
        mockExists.mockResolvedValue(true)
        mockReadTextFile.mockResolvedValue(mockGraphJson)
        const loadGraph = vi.fn()

        mockUseProjectDetailStore.mockImplementation(
            (selector: (s: ReturnType<typeof makeDetailStoreState>) => unknown) =>
                selector(makeDetailStoreState({ initStatus: 'ready', activeGraphId: MOCK_GRAPH })),
        )
        mockUseGraphStore.mockImplementation(
            (selector: (s: ReturnType<typeof makeGraphStoreState>) => unknown) =>
                selector(makeGraphStoreState({ loadGraph })),
        )

        renderHook(() =>
            useGraphInit({
                projectRootPath: MOCK_ROOT,
                initStatus: 'ready',
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
        mockExists.mockImplementation(async (path: string) =>
            path === MOCK_GRAPHS_DIR,
        )
        const resetGraph = vi.fn()

        renderHook(() =>
            useGraphInit({
                projectRootPath: MOCK_ROOT,
                initStatus: 'ready',
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
                initStatus: 'ready',
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