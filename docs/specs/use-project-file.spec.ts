/**
 * Slot 1: 発注用ヘッダー (JSDoc Metadata)
 * @context useProjectFile — Tauri fs を使った projects.json の永続化 hook
 * @bom docs/bom/project.ts
 * @story
 * 1. loadProjects が呼び出される。
 *    AppData/projects.json が存在する場合、JSON をパースして Zustand の setProjects() に渡す。
 * 2. projects.json が存在しない場合、setProjects([]) で空配列を初期化する。
 *    エラーは発生しない。
 * 3. projects.json の JSON が不正な場合、setProjects([]) にフォールバックし、
 *    toast.error() でエラーを通知する。
 * 4. Zustand の projects[] が変化すると（subscribe で監視）、
 *    saveProjects が自動的に呼ばれ AppData/projects.json に上書き保存される。
 * 5. saveProjects が失敗した場合（fs エラー）、toast.error() でエラーを通知する。
 *    Store にエラー状態は持たない。
 * @output src/hooks/useProjectFile.ts
 */

/**
 * Slot 2: 外部依存のインポート (Imports)
 */
import { test, expect, describe, beforeEach, vi, type Mock } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { Project } from '../bom/project';
import { useProjectFile } from '@/hooks/useProjectFile';

/**
 * Slot 3: モック・セットアップ (Test Setup)
 * 実装と検証を切り離すための「独立した基準器」。
 * Tauri fs プラグインをモックする（[A] Hydration シーケンスの前提）。
 * vi.hoisted() で変数を vi.mock のホイストと同タイミングに初期化する。
 */

const {
    mockReadTextFile,
    mockWriteTextFile,
    mockExists,
    mockToastError,
    mockSetProjects,
    mockGetProjects,
} = vi.hoisted(() => ({
    mockReadTextFile: vi.fn<() => Promise<string>>(),
    mockWriteTextFile: vi.fn<() => Promise<void>>(),
    mockExists: vi.fn<() => Promise<boolean>>(),
    mockToastError: vi.fn<() => void>(),
    mockSetProjects: vi.fn<() => void>(),
    mockGetProjects: vi.fn(),
}));

vi.mock('@tauri-apps/plugin-fs', () => ({
    readTextFile: mockReadTextFile,
    writeTextFile: mockWriteTextFile,
    exists: mockExists,
    BaseDirectory: { AppData: 'AppData' },
}));

vi.mock('sonner', () => ({
    toast: { error: mockToastError },
}));

vi.mock('@/store/useProjectStore', () => ({
    useProjectStore: {
        getState: () => ({
            setProjects: mockSetProjects,
            setHydrated: vi.fn(),        // ← 追加
            projects: mockGetProjects(),
        }),
        subscribe: vi.fn(() => () => { }),
    },
}));

const fixtureProjects: Project[] = [
    { id: '1', name: '地蔵 Core', description: 'グラフベースのプロジェクト管理OS。', rootPath: '/Users/user/projects/zizou-core' },
    { id: '2', name: 'Graph Renderer', description: 'ノード・エッジの依存関係を可視化するビューエンジン。', rootPath: '/Users/user/projects/graph-renderer' },
]

/**
 * Slot 4: 挙動の検証コード (Story Verification)
 */

// --- 1. AIの内省 (Logic Verification) ---

describe('useProjectFile: logic', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // ── [A] loadProjects ──

    test('logic: [A] projects.json が存在する場合、パースして setProjects に渡す', async () => {
        mockExists.mockResolvedValue(true);
        mockReadTextFile.mockResolvedValue(JSON.stringify(fixtureProjects));

        const { result } = renderHook(() => useProjectFile());
        await act(() => result.current.loadProjects());

        expect(mockReadTextFile).toHaveBeenCalledWith(
            'projects.json',
            expect.objectContaining({ baseDir: 'AppData' })
        );
        expect(mockSetProjects).toHaveBeenCalledWith(fixtureProjects);
        expect(mockToastError).not.toHaveBeenCalled();
    });

    test('logic: [A] projects.json が存在しない場合、setProjects([]) を呼ぶ', async () => {
        mockExists.mockResolvedValue(false);

        const { result } = renderHook(() => useProjectFile());
        await act(() => result.current.loadProjects());

        expect(mockReadTextFile).not.toHaveBeenCalled();
        expect(mockSetProjects).toHaveBeenCalledWith([]);
        expect(mockToastError).not.toHaveBeenCalled();
    });

    test('logic: [A] projects.json の JSON が不正な場合、setProjects([]) にフォールバックし toast.error を呼ぶ', async () => {
        mockExists.mockResolvedValue(true);
        mockReadTextFile.mockResolvedValue('{ invalid json }');

        const { result } = renderHook(() => useProjectFile());
        await act(() => result.current.loadProjects());

        expect(mockSetProjects).toHaveBeenCalledWith([]);
        expect(mockToastError).toHaveBeenCalledTimes(1);
    });

    test('logic: [A] Zod バリデーション失敗の場合、setProjects([]) にフォールバックし toast.error を呼ぶ', async () => {
        mockExists.mockResolvedValue(true)
        // rootPath が欠けているため Zod バリデーションが失敗する
        mockReadTextFile.mockResolvedValue(JSON.stringify([
            { id: '1', name: '地蔵 Core' }
        ]))

        const { result } = renderHook(() => useProjectFile())
        await act(() => result.current.loadProjects())

        expect(mockSetProjects).toHaveBeenCalledWith([])
        expect(mockToastError).toHaveBeenCalledTimes(1)
    })

    // ── saveProjects ──

    test('logic: saveProjects が呼ばれると writeTextFile に JSON 文字列を渡す', async () => {
        mockWriteTextFile.mockResolvedValue(undefined);

        const { result } = renderHook(() => useProjectFile());
        await act(() => result.current.saveProjects(fixtureProjects));

        expect(mockWriteTextFile).toHaveBeenCalledWith(
            'projects.json',
            JSON.stringify(fixtureProjects, null, 2),
            expect.objectContaining({ baseDir: 'AppData' })
        );
        expect(mockToastError).not.toHaveBeenCalled();
    });

    test('logic: saveProjects が失敗した場合、toast.error を呼ぶ（Store にエラー状態は持たない）', async () => {
        mockWriteTextFile.mockRejectedValue(new Error('fs write failed'));

        const { result } = renderHook(() => useProjectFile());
        await act(() => result.current.saveProjects(fixtureProjects));

        expect(mockToastError).toHaveBeenCalledTimes(1);
        expect(mockSetProjects).not.toHaveBeenCalled();
    });

    test('logic: saving.current が true のとき重複保存をスキップする', async () => {
        let resolve: () => void
        mockWriteTextFile.mockImplementation(
            () => new Promise<void>((r) => { resolve = r })
        )

        const { result } = renderHook(() => useProjectFile())

        // 1回目（pending のまま）
        const first = act(() => result.current.saveProjects(fixtureProjects))
        // 2回目（saving.current === true なのでスキップ）
        await act(() => result.current.saveProjects(fixtureProjects))

        resolve!()
        await first

        expect(mockWriteTextFile).toHaveBeenCalledTimes(1)
    })

    // ── subscribe による自動保存 ──

    test('logic: subscribe で projects[] の変化を監視し saveProjects を自動呼び出しする', async () => {
        const { useProjectStore } = await import('@/store/useProjectStore');
        const subscribeMock = useProjectStore.subscribe as Mock;
        let subscribedCallback: ((state: { projects: Project[] }) => void) | null = null;

        subscribeMock.mockImplementation(
            (cb: (state: { projects: Project[] }) => void) => {
                subscribedCallback = cb;
                return () => { };
            }
        );
        mockWriteTextFile.mockResolvedValue(undefined);
        // hydrated.current を true にするため loadProjects を先に実行する
        mockExists.mockResolvedValue(false);

        const { result } = renderHook(() => useProjectFile());
        await act(() => result.current.loadProjects());

        await act(async () => {
            subscribedCallback?.({ projects: fixtureProjects });
        });

        expect(mockWriteTextFile).toHaveBeenCalledWith(
            'projects.json',
            JSON.stringify(fixtureProjects, null, 2),
            expect.objectContaining({ baseDir: 'AppData' })
        );
    });
});