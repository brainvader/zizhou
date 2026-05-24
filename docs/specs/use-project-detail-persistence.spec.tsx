/**
 * Slot 1: 発注用ヘッダー (JSDoc Metadata)
 *
 * @context CTX-12: useProjectDetailLoad / useProjectDetailSave
 * @bom     docs/bom/graph.ts
 *
 * @story
 * 1. ユーザーが /projects/:id に直アクセスする。
 * 2. useProjectDetailLoad が AppData/project-detail-{projectId}.json を読み込み、
 *    useProjectDetailStore に projectRootPath / activeGraphId を注入する。
 * 3. projectRootPath が即座に store にセットされるため、
 *    projects.json の hydration を待たずに FileTree が Loading… を抜ける。
 * 4. useProjectDetailSave が useProjectDetailStore の変化を subscribe し、
 *    projectRootPath / activeGraphId が変わるたびに自動保存する。
 * 5. isHydrated が false の間は保存をスキップする（save-before-load 防止）。
 *
 * @output src/hooks/useProjectDetailLoad.ts
 * @output src/hooks/useProjectDetailSave.ts
 */

import { describe, test, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import type { ProjectDetailSnapshot } from '@/bom/graph'
import { useProjectDetailLoad } from '@/hooks/useProjectDetailLoad'
import { useProjectDetailSave } from '@/hooks/useProjectDetailSave'

// =============================================================================
// Slot 3: モック・セットアップ
// =============================================================================

type StoreState = {
    projectRootPath: string
    activeGraphId: string | null
    isDetailHydrated: boolean
}

type SubscribeCallback = (state: StoreState) => void

const {
    mockReadTextFile,
    mockWriteTextFile,
    mockExists,
    mockMkdir,
    mockToastError,
    mockSetProjectRootPath,
    mockSetActiveGraphId,
    mockSetDetailHydrated,
    mockSubscribe,
} = vi.hoisted(() => ({
    mockReadTextFile: vi.fn<() => Promise<string>>(),
    mockWriteTextFile: vi.fn<(path: string, content: string, opts: { baseDir: string }) => Promise<void>>(),
    mockExists: vi.fn<() => Promise<boolean>>(),
    mockMkdir: vi.fn<() => Promise<void>>(),
    mockToastError: vi.fn<() => void>(),
    mockSetProjectRootPath: vi.fn<() => void>(),
    mockSetActiveGraphId: vi.fn<() => void>(),
    mockSetDetailHydrated: vi.fn<() => void>(),
    mockSubscribe: vi.fn<(cb: SubscribeCallback) => () => void>(),
}))

vi.mock('@tauri-apps/plugin-fs', () => ({
    readTextFile: mockReadTextFile,
    writeTextFile: mockWriteTextFile,
    exists: mockExists,
    mkdir: mockMkdir,
    BaseDirectory: { AppData: 'AppData' },
}))

vi.mock('sonner', () => ({
    toast: { error: mockToastError },
}))

vi.mock('@/store/useProjectDetailStore', () => ({
    useProjectDetailStore: {
        getState: () => ({
            setProjectRootPath: mockSetProjectRootPath,
            setActiveGraphId: mockSetActiveGraphId,
            setDetailHydrated: mockSetDetailHydrated,
        }),
        subscribe: mockSubscribe,
    },
}))

const fixtureSnapshot: ProjectDetailSnapshot = {
    projectId: 'proj-001',
    projectRootPath: '/Users/user/projects/zizou-core',
    activeGraphId: 'graph-01',
}

// =============================================================================
// Slot 4: useProjectDetailLoad
// =============================================================================

describe('useProjectDetailLoad: logic', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    test('logic: project-detail-{id}.json が存在する場合、パースして store に注入する', async () => {
        mockExists.mockResolvedValue(true)
        mockReadTextFile.mockResolvedValue(JSON.stringify(fixtureSnapshot))

        const { result } = renderHook(() => useProjectDetailLoad())
        await act(() => result.current.loadProjectDetail('proj-001'))

        expect(mockReadTextFile).toHaveBeenCalledWith(
            'project-detail-proj-001.json',
            expect.objectContaining({ baseDir: 'AppData' }),
        )
        expect(mockSetProjectRootPath).toHaveBeenCalledWith('/Users/user/projects/zizou-core')
        expect(mockSetActiveGraphId).toHaveBeenCalledWith('graph-01')
        expect(mockToastError).not.toHaveBeenCalled()
    })

    test('logic: ファイルが存在しない場合、store を変更せずに完了する', async () => {
        mockExists.mockResolvedValue(false)

        const { result } = renderHook(() => useProjectDetailLoad())
        await act(() => result.current.loadProjectDetail('proj-001'))

        expect(mockReadTextFile).not.toHaveBeenCalled()
        expect(mockSetProjectRootPath).not.toHaveBeenCalled()
        expect(mockSetActiveGraphId).not.toHaveBeenCalled()
        expect(mockToastError).not.toHaveBeenCalled()
    })

    test('logic: JSON が不正な場合、store を変更せずに toast.error を呼ぶ', async () => {
        mockExists.mockResolvedValue(true)
        mockReadTextFile.mockResolvedValue('{ invalid json }')

        const { result } = renderHook(() => useProjectDetailLoad())
        await act(() => result.current.loadProjectDetail('proj-001'))

        expect(mockSetProjectRootPath).not.toHaveBeenCalled()
        expect(mockToastError).toHaveBeenCalledTimes(1)
    })

    test('logic: Zod バリデーション失敗の場合、store を変更せずに toast.error を呼ぶ', async () => {
        mockExists.mockResolvedValue(true)
        mockReadTextFile.mockResolvedValue(JSON.stringify({ projectId: 'proj-001' })) // rootPath なし

        const { result } = renderHook(() => useProjectDetailLoad())
        await act(() => result.current.loadProjectDetail('proj-001'))

        expect(mockSetProjectRootPath).not.toHaveBeenCalled()
        expect(mockToastError).toHaveBeenCalledTimes(1)
    })

    test('logic: 完了後に setDetailHydrated(true) を呼ぶ', async () => {
        mockExists.mockResolvedValue(false)

        const { result } = renderHook(() => useProjectDetailLoad())
        await act(() => result.current.loadProjectDetail('proj-001'))

        expect(mockSetDetailHydrated).toHaveBeenCalledWith(true)
    })
})

// =============================================================================
// Slot 4: useProjectDetailSave
// =============================================================================

describe('useProjectDetailSave: logic', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockSubscribe.mockImplementation(() => () => { })
        mockExists.mockResolvedValue(true)
    })

    test('logic: マウント時に subscribe が呼ばれ、アンマウント時に unsubscribe が呼ばれる', () => {
        const mockUnsubscribe = vi.fn()
        mockSubscribe.mockReturnValue(mockUnsubscribe)

        const { unmount } = renderHook(() => useProjectDetailSave('proj-001'))

        expect(mockSubscribe).toHaveBeenCalledTimes(1)
        unmount()
        expect(mockUnsubscribe).toHaveBeenCalledTimes(1)
    })

    test('logic: isDetailHydrated が false の間は writeTextFile を呼ばない', async () => {
        let cb: SubscribeCallback | null = null
        mockSubscribe.mockImplementation((fn) => { cb = fn; return () => { } })

        renderHook(() => useProjectDetailSave('proj-001'))

        await act(async () => {
            cb?.({
                projectRootPath: '/Users/user/projects/zizou-core',
                activeGraphId: 'graph-01',
                isDetailHydrated: false,
            })
        })

        expect(mockWriteTextFile).not.toHaveBeenCalled()
    })

    test('logic: isDetailHydrated が true かつ projectRootPath が空でない場合に writeTextFile を呼ぶ', async () => {
        let cb: SubscribeCallback | null = null
        mockSubscribe.mockImplementation((fn) => { cb = fn; return () => { } })

        renderHook(() => useProjectDetailSave('proj-001'))

        await act(async () => {
            cb?.({
                projectRootPath: '/Users/user/projects/zizou-core',
                activeGraphId: 'graph-01',
                isDetailHydrated: true,
            })
        })

        expect(mockWriteTextFile).toHaveBeenCalledTimes(1)
        expect(mockWriteTextFile).toHaveBeenCalledWith(
            'project-detail-proj-001.json',
            expect.any(String),
            expect.objectContaining({ baseDir: 'AppData' }),
        )
        // JSON の中身を詳細検証
        const calledContent = mockWriteTextFile.mock.calls[0][1]
        const parsed = JSON.parse(calledContent)
        expect(parsed).toMatchObject({
            projectId: 'proj-001',
            projectRootPath: '/Users/user/projects/zizou-core',
            activeGraphId: 'graph-01',
        })
    })

    test('logic: projectRootPath が空の場合は保存をスキップする', async () => {
        let cb: SubscribeCallback | null = null
        mockSubscribe.mockImplementation((fn) => { cb = fn; return () => { } })

        renderHook(() => useProjectDetailSave('proj-001'))

        await act(async () => {
            cb?.({
                projectRootPath: '',
                activeGraphId: null,
                isDetailHydrated: true,
            })
        })

        expect(mockWriteTextFile).not.toHaveBeenCalled()
    })

    test('logic: AppData ディレクトリが存在しない場合、mkdir してから writeTextFile を呼ぶ', async () => {
        mockExists.mockResolvedValue(false)
        let cb: SubscribeCallback | null = null
        mockSubscribe.mockImplementation((fn) => { cb = fn; return () => { } })

        renderHook(() => useProjectDetailSave('proj-001'))

        await act(async () => {
            cb?.({
                projectRootPath: '/Users/user/projects/zizou-core',
                activeGraphId: 'graph-01',
                isDetailHydrated: true,
            })
        })

        expect(mockMkdir).toHaveBeenCalledTimes(1)
        expect(mockWriteTextFile).toHaveBeenCalledTimes(1)
    })

    test('logic: writeTextFile が失敗した場合、toast.error を呼ぶ', async () => {
        mockWriteTextFile.mockRejectedValue(new Error('fs error'))
        let cb: SubscribeCallback | null = null
        mockSubscribe.mockImplementation((fn) => { cb = fn; return () => { } })

        renderHook(() => useProjectDetailSave('proj-001'))

        await act(async () => {
            cb?.({
                projectRootPath: '/Users/user/projects/zizou-core',
                activeGraphId: 'graph-01',
                isDetailHydrated: true,
            })
        })

        expect(mockToastError).toHaveBeenCalledTimes(1)
    })

    test('logic: saving.current が true の間は重複保存をスキップする（Race Condition 対策）', async () => {
        let cb: SubscribeCallback | null = null
        mockSubscribe.mockImplementation((fn) => { cb = fn; return () => { } })

        // writeTextFile を遅延させて saving 中に再度 subscribe を発火させる
        let resolveFirst!: () => void
        mockWriteTextFile.mockImplementationOnce(
            () => new Promise<void>((res) => { resolveFirst = res }),
        )

        renderHook(() => useProjectDetailSave('proj-001'))

        const state = {
            projectRootPath: '/Users/user/projects/zizou-core',
            activeGraphId: 'graph-01',
            isDetailHydrated: true,
        }

        await act(async () => {
            cb?.(state) // 1回目: saving = true になる
            cb?.(state) // 2回目: saving = true のためスキップ
        })

        resolveFirst()
        await act(async () => { }) // flush

        expect(mockWriteTextFile).toHaveBeenCalledTimes(1)
    })
})