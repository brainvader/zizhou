/**
 * Slot 1: 発注用ヘッダー (JSDoc Metadata)
 * @context useProjectSave — subscribe ベースで projects.json に自動保存する hook
 * @bom docs/bom/project.ts
 * @story
 * 1. Zustand の projects[] が変化すると subscribe で検知し、
 *    saveProjects が自動的に呼ばれ AppData/projects.json に上書き保存される。
 * 2. isHydrated が false の間は保存をスキップする。
 * 3. saveProjects が失敗した場合（fs エラー）、toast.error() でエラーを通知する。
 *    Store にエラー状態は持たない。
 * 4. saving.current が true の間は重複保存をスキップする（Race Condition 対策）。
 * @output src/hooks/useProjectSave.ts
 */

import { describe, test, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import type { Project } from '@/bom/project'
import { useProjectSave } from '@/hooks/useProjectSave'

type SubscribeCallback = (state: { projects: Project[]; isHydrated: boolean }) => void

const {
    mockWriteTextFile,
    mockExists,
    mockMkdir,
    mockToastError,
    mockSubscribe,
} = vi.hoisted(() => ({
    mockWriteTextFile: vi.fn<() => Promise<void>>(),
    mockExists: vi.fn<() => Promise<boolean>>(),
    mockMkdir: vi.fn<() => Promise<void>>(),
    mockToastError: vi.fn<() => void>(),
    mockSubscribe: vi.fn<(cb: SubscribeCallback) => () => void>(),
}))

vi.mock('@tauri-apps/plugin-fs', () => ({
    writeTextFile: mockWriteTextFile,
    exists: mockExists,
    mkdir: mockMkdir,
    BaseDirectory: { AppData: 'AppData' },
}))

vi.mock('sonner', () => ({
    toast: { error: mockToastError },
}))

vi.mock('@/store/useProjectStore', () => ({
    useProjectStore: {
        subscribe: mockSubscribe,
    },
}))

const fixtureProjects: Project[] = [
    { id: '1', name: '地蔵 Core', description: 'グラフベースのプロジェクト管理OS。', rootPath: '/Users/user/projects/zizou-core' },
    { id: '2', name: 'Graph Renderer', description: 'ノード・エッジの依存関係を可視化するビューエンジン。', rootPath: '/Users/user/projects/graph-renderer' },
]

describe('useProjectSave: logic', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockSubscribe.mockImplementation(() => () => { })
        mockExists.mockResolvedValue(true)
    })

    test('logic: マウント時に subscribe が呼ばれ、アンマウント時に unsubscribe が呼ばれる', () => {
        const mockUnsubscribe = vi.fn()
        mockSubscribe.mockReturnValue(mockUnsubscribe)

        const { unmount } = renderHook(() => useProjectSave())

        expect(mockSubscribe).toHaveBeenCalledTimes(1)
        unmount()
        expect(mockUnsubscribe).toHaveBeenCalledTimes(1)
    })

    test('logic: isHydrated が false の間は subscribe が発火しても writeTextFile を呼ばない', async () => {
        let cb: SubscribeCallback | null = null
        mockSubscribe.mockImplementation((fn) => { cb = fn; return () => { } })

        renderHook(() => useProjectSave())

        await act(async () => {
            cb?.({ projects: fixtureProjects, isHydrated: false })
        })

        expect(mockWriteTextFile).not.toHaveBeenCalled()
    })

    test('logic: isHydrated が true のとき subscribe が発火すると writeTextFile を呼ぶ', async () => {
        let cb: SubscribeCallback | null = null
        mockSubscribe.mockImplementation((fn) => { cb = fn; return () => { } })
        mockWriteTextFile.mockResolvedValue(undefined)

        renderHook(() => useProjectSave())

        await act(async () => {
            cb?.({ projects: fixtureProjects, isHydrated: true })
        })

        expect(mockWriteTextFile).toHaveBeenCalledWith(
            'projects.json',
            JSON.stringify(fixtureProjects, null, 2),
            expect.objectContaining({ baseDir: 'AppData' })
        )
        expect(mockToastError).not.toHaveBeenCalled()
    })

    test('logic: saveProjects が失敗した場合、toast.error を呼ぶ', async () => {
        mockWriteTextFile.mockRejectedValue(new Error('fs write failed'))

        const { result } = renderHook(() => useProjectSave())
        await act(() => result.current.saveProjects(fixtureProjects))

        expect(mockToastError).toHaveBeenCalledTimes(1)
    })

    test('logic: saving.current が true のとき重複保存をスキップする', async () => {
        let resolve: () => void
        mockWriteTextFile.mockImplementation(
            () => new Promise<void>((r) => { resolve = r })
        )

        const { result } = renderHook(() => useProjectSave())

        const first = act(() => result.current.saveProjects(fixtureProjects))
        await act(() => result.current.saveProjects(fixtureProjects))

        resolve!()
        await first

        expect(mockWriteTextFile).toHaveBeenCalledTimes(1)
    })
})