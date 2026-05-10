/**
 * Slot 1: 発注用ヘッダー
 * @context useGraphInit — GraphEditor から切り出した初期化・ロード hook
 * @bom docs/bom/graph.ts
 * @story
 * 1. マウント時に exists({projectRootPath}/graphs/) が呼ばれ initStatus が更新される
 * 2. graphs/ が存在しない場合、setInitStatus('uninitialized') が呼ばれる
 * 3. graphs/ が存在する場合、setInitStatus('ready') が呼ばれる
 * 4. activeGraphId が変化したとき readTextFile でグラフを読み込み loadGraph が呼ばれる
 * 5. グラフファイルが存在しない場合 resetGraph が呼ばれる
 * 6. handleInit() を呼ぶと mkdir が呼ばれ setInitStatus('ready') が呼ばれる
 * @output src/hooks/useGraphInit.ts
 */

// =============================================================================
// Slot 2: インポート
// =============================================================================

import { describe, test, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import type { InitStatus } from '@/bom/graph'
import type { UseGraphInitOptions } from '@/hooks/useGraphInit'
import { useGraphInit } from '@/hooks/useGraphInit'

// =============================================================================
// Slot 3: モック・セットアップ
// =============================================================================

const MOCK_ROOT = '/Users/user/projects/zizou-core'
const MOCK_GRAPH = 'graph-01'
const MOCK_GRAPHS_DIR = `${MOCK_ROOT}/graphs`
const MOCK_FILE_PATH = `${MOCK_ROOT}/graphs/${MOCK_GRAPH}.json`

const mockGraphJson = JSON.stringify({
    id: MOCK_GRAPH,
    nodes: [{ id: 'node-1', position: { x: 0, y: 0 }, data: { label: 'Node 1' } }],
    edges: [],
})

// --- vi.hoisted() でモック変数をホイスト ---
// vi.fn() に型引数は付けず、使用箇所で UseGraphInitOptions の型にキャストする
const {
    mockExists,
    mockMkdir,
    mockReadTextFile,
    mockUseProjectDetailStore,
    mockUseGraphStore,
    mockSetHydrated,
} = vi.hoisted(() => ({
    mockExists: vi.fn(),
    mockMkdir: vi.fn(),
    mockReadTextFile: vi.fn(),
    mockUseProjectDetailStore: vi.fn(),
    mockUseGraphStore: vi.fn(),
    mockSetHydrated: vi.fn(),
}))

// props に渡す際に UseGraphInitOptions の型に合わせてキャスト
type ExistsFn = NonNullable<UseGraphInitOptions['onExists']>
type MkdirFn = NonNullable<UseGraphInitOptions['onMkdir']>
type ReadTextFileFn = NonNullable<UseGraphInitOptions['onReadTextFile']>

const existsMock = mockExists as unknown as ExistsFn
const mkdirMock = mockMkdir as unknown as MkdirFn
const readTextFileMock = mockReadTextFile as unknown as ReadTextFileFn

vi.mock('@tauri-apps/plugin-fs', () => ({
    exists: mockExists,
    mkdir: mockMkdir,
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

// --- store state ファクトリ ---
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
    mockExists.mockResolvedValue(false)
    mockMkdir.mockResolvedValue(undefined)
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

// =============================================================================
// Slot 4: 挙動の検証
// =============================================================================

describe('useGraphInit: Init Check logic', () => {
    test('マウント時に exists({projectRootPath}/graphs/) が呼ばれる', async () => {
        mockExists.mockResolvedValueOnce(true)

        renderHook(() =>
            useGraphInit({
                projectRootPath: MOCK_ROOT,
                onExists: existsMock,
                onMkdir: mkdirMock,
                onReadTextFile: readTextFileMock,
                setHydrated: mockSetHydrated,
            }),
        )

        await waitFor(() => {
            expect(mockExists).toHaveBeenCalledWith(MOCK_GRAPHS_DIR)
        })
    })

    test('graphs/ が存在しない場合、setInitStatus("uninitialized") が呼ばれる', async () => {
        mockExists.mockResolvedValue(false)
        const setInitStatus = vi.fn()

        mockUseProjectDetailStore.mockImplementation(
            (selector: (s: ReturnType<typeof makeDetailStoreState>) => unknown) =>
                selector(makeDetailStoreState({ setInitStatus })),
        )

        renderHook(() =>
            useGraphInit({
                projectRootPath: MOCK_ROOT,
                onExists: existsMock,
                onMkdir: mkdirMock,
                onReadTextFile: readTextFileMock,
                setHydrated: mockSetHydrated,
            }),
        )

        await waitFor(() => expect(setInitStatus).toHaveBeenCalledWith('uninitialized'))
    })

    test('graphs/ が存在する場合、setInitStatus("ready") が呼ばれる', async () => {
        mockExists.mockResolvedValue(true)
        const setInitStatus = vi.fn()

        mockUseProjectDetailStore.mockImplementation(
            (selector: (s: ReturnType<typeof makeDetailStoreState>) => unknown) =>
                selector(makeDetailStoreState({ setInitStatus })),
        )

        renderHook(() =>
            useGraphInit({
                projectRootPath: MOCK_ROOT,
                onExists: existsMock,
                onMkdir: mkdirMock,
                onReadTextFile: readTextFileMock,
                setHydrated: mockSetHydrated,
            }),
        )

        await waitFor(() => expect(setInitStatus).toHaveBeenCalledWith('ready'))
    })
})

describe('useGraphInit: Load Graph logic', () => {
    test('initStatus が ready かつ activeGraphId があると readTextFile が呼ばれる', async () => {
        // exists: graphs/dir=true, file=true
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
                onMkdir: mkdirMock,
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
            // graphs/dir は true, ファイルは false
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
                onMkdir: mkdirMock,
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
                onMkdir: mkdirMock,
                onReadTextFile: readTextFileMock,
                setHydrated,
            }),
        )

        await waitFor(() => expect(setHydrated).toHaveBeenLastCalledWith(true))
        expect(setHydrated.mock.calls[0]).toEqual([false])
    })
})

describe('useGraphInit: Init Dir logic (handleInit)', () => {
    test('handleInit() で mkdir が呼ばれ setInitStatus("ready") が呼ばれる', async () => {
        const setInitStatus = vi.fn()

        const { result } = renderHook(() =>
            useGraphInit({
                projectRootPath: MOCK_ROOT,
                onSetInitStatus: setInitStatus,
                onExists: existsMock,
                onMkdir: mkdirMock,
                onReadTextFile: readTextFileMock,
                setHydrated: mockSetHydrated,
            }),
        )

        await act(() => result.current.handleInit())

        expect(mockMkdir).toHaveBeenCalledWith(MOCK_GRAPHS_DIR, { recursive: true })
        expect(setInitStatus).toHaveBeenCalledWith('ready')
    })
})