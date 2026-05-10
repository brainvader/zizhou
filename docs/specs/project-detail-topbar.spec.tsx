/**
 * Slot 1: 発注用ヘッダー (JSDoc Metadata)
 *
 * @context  ProjectDetailTopbar
 * @bom      docs/bom/graph.ts  (InitStatus, ProjectDetailStore, graphFilePath)
 *           docs/bom/project.ts (Project, ProjectStore)
 *
 * @story
 * 【1. Breadcrumb 表示】
 * 1. project-detail 画面を開く（URL: /projects/:id）
 * 2. Topbar にロゴ（地蔵 / Zizou / Protocol v7.00）が表示される。
 * 3. ロゴの右に「/」セパレーターとプロジェクト名（breadcrumb）が表示される。
 *    プロジェクト名は useParams の id → useProjectStore で解決する。
 * 4. id に対応するプロジェクトが存在しない場合、breadcrumb は空文字（非表示）になる。
 *
 * 【2. New Graph ボタン — 活性/非活性】
 * 5. initStatus が 'ready' のとき、「＋」ボタンは有効（disabled でない）。
 * 6. initStatus が 'checking' のとき、「＋」ボタンは disabled になる。
 * 7. initStatus が 'uninitialized' のとき、「＋」ボタンは disabled になる。
 *
 * 【3. New Graph ロジック】
 * 8. 「＋」ボタンをクリックすると nanoid() で graphId が生成される。
 * 9. writeTextFile が graphFilePath(projectRootPath, graphId) に
 *    空の GraphFile（nodes: [], edges: []）を JSON 文字列で書き込む。
 * 10. 書き込み完了後、setActiveGraphId(graphId) が呼ばれる。
 * 11. writeTextFile が失敗した場合、toast.error が呼ばれ setActiveGraphId は呼ばれない。
 *
 * 【4. Settings ボタン（継承）】
 * 12. Settings ボタンをクリックすると onSettingsClick コールバックが呼ばれる。
 *
 * @output   src/components/ProjectDetailTopbar.tsx
 */

// =============================================================================
// Slot 2: Imports
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import type { InitStatus } from '@/bom/graph'
import type { Project } from '@/bom/project'
import { ProjectDetailTopbar } from '@/components/ProjectDetailTopbar'

// =============================================================================
// Slot 3: モック・セットアップ (Test Setup)
// =============================================================================

// --- vi.hoisted: モック関数を巻き上げ ---
const {
    mockWriteTextFile,
    mockToastError,
    mockSetActiveGraphId,
    mockUseParams,
    mockUseProjectDetailStore,
    mockUseProjectStore,
    mockOnSettingsClick,
} = vi.hoisted(() => ({
    mockWriteTextFile: vi.fn<() => Promise<void>>(),
    mockToastError: vi.fn(),
    mockSetActiveGraphId: vi.fn(),
    mockUseParams: vi.fn(),
    mockUseProjectDetailStore: vi.fn(),
    mockUseProjectStore: vi.fn(),
    mockOnSettingsClick: vi.fn(),
}))

// --- Tauri fs ---
vi.mock('@tauri-apps/plugin-fs', () => ({
    writeTextFile: mockWriteTextFile,
}))

// --- sonner ---
vi.mock('sonner', () => ({
    toast: { error: mockToastError },
}))

// --- nanoid ---
vi.mock('nanoid', () => ({
    nanoid: vi.fn(() => 'test-graph-id'),
}))

// --- TanStack Router useParams ---
vi.mock('@tanstack/react-router', () => ({
    useParams: mockUseParams,
}))

// --- Zustand stores ---
vi.mock('@/store/useProjectDetailStore', () => ({
    useProjectDetailStore: mockUseProjectDetailStore,
}))

vi.mock('@/store/useProjectStore', () => ({
    useProjectStore: mockUseProjectStore,
}))

// --- フィクスチャ ---
const MOCK_PROJECT: Project = {
    id: 'proj-001',
    name: '地蔵 Core',
    description: 'グラフベースのプロジェクト管理OS。',
    rootPath: '/Users/user/projects/zizou-core',
}

/**
 * ストアの初期状態をセットアップするヘルパー。
 * initStatus と projectRootPath を上書き可能にする。
 */
const setupMocks = (overrides: {
    initStatus?: InitStatus
    projectRootPath?: string
    project?: Project | undefined
} = {}) => {
    const {
        initStatus = 'ready',
        projectRootPath = MOCK_PROJECT.rootPath,
        project = MOCK_PROJECT,
    } = overrides

    mockUseParams.mockReturnValue({ id: project?.id ?? 'proj-001' })

    mockUseProjectDetailStore.mockImplementation((selector: (s: {
        initStatus: InitStatus
        projectRootPath: string
        setActiveGraphId: typeof mockSetActiveGraphId
    }) => unknown) =>
        selector({
            initStatus,
            projectRootPath,
            setActiveGraphId: mockSetActiveGraphId,
        })
    )

    mockUseProjectStore.mockImplementation((selector: (s: {
        projects: Project[]
    }) => unknown) =>
        selector({ projects: project ? [project] : [] })
    )
}

/** コンポーネントをレンダリングするヘルパー */
const setup = (props?: Partial<React.ComponentProps<typeof ProjectDetailTopbar>>) =>
    render(
        <ProjectDetailTopbar
            onSettingsClick={mockOnSettingsClick}
            {...props}
        />
    )

// =============================================================================
// Slot 4: 挙動の検証コード (Story Verification)
// =============================================================================

// --- 1. AIの内省 (Logic Verification) ---

describe('ProjectDetailTopbar — logic', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        setupMocks()
    })

    // ── 【1. Breadcrumb 表示】 ──

    it('logic: ロゴ漢字「地蔵」が表示される', () => {
        setup()
        expect(screen.getByText('地蔵')).toBeVisible()
    })

    it('logic: romaji「Zizou」が表示される', () => {
        setup()
        expect(screen.getByText(/zizou/i)).toBeVisible()
    })

    it('logic: バージョン文字列「Protocol v7.00」が表示される', () => {
        setup()
        expect(screen.getByText(/protocol v7\.00/i)).toBeVisible()
    })

    it('logic: breadcrumb にプロジェクト名が表示される', () => {
        setup()
        expect(screen.getByText('地蔵 Core')).toBeVisible()
    })

    it('logic: breadcrumb セパレーター「/」が表示される', () => {
        setup()
        expect(screen.getByTestId('breadcrumb-sep')).toBeVisible()
    })

    it('logic: 対応するプロジェクトが存在しない場合、breadcrumb は表示されない', () => {
        setupMocks({ project: undefined })
        setup()
        // breadcrumb-project 要素は存在しないかテキストが空
        expect(screen.queryByTestId('breadcrumb-project')).toBeNull()
    })

    // ── 【2. New Graph ボタン — 活性/非活性】 ──

    it('logic: initStatus が ready のとき New Graph ボタンは有効', () => {
        setupMocks({ initStatus: 'ready' })
        setup()
        expect(screen.getByRole('button', { name: /new graph/i })).not.toBeDisabled()
    })

    it('logic: initStatus が checking のとき New Graph ボタンは disabled', () => {
        setupMocks({ initStatus: 'checking' })
        setup()
        expect(screen.getByRole('button', { name: /new graph/i })).toBeDisabled()
    })

    it('logic: initStatus が uninitialized のとき New Graph ボタンは disabled', () => {
        setupMocks({ initStatus: 'uninitialized' })
        setup()
        expect(screen.getByRole('button', { name: /new graph/i })).toBeDisabled()
    })

    // ── 【3. New Graph ロジック】 ──

    it('logic: New Graph クリックで writeTextFile が正しいパスと内容で呼ばれる', async () => {
        mockWriteTextFile.mockResolvedValue(undefined)
        setup()

        fireEvent.click(screen.getByRole('button', { name: /new graph/i }))

        await waitFor(() => {
            expect(mockWriteTextFile).toHaveBeenCalledWith(
                '/Users/user/projects/zizou-core/graphs/test-graph-id.json',
                JSON.stringify({ id: 'test-graph-id', nodes: [], edges: [] }, null, 2)
            )
        })
    })

    it('logic: writeTextFile 完了後に setActiveGraphId が graphId で呼ばれる', async () => {
        mockWriteTextFile.mockResolvedValue(undefined)
        setup()

        fireEvent.click(screen.getByRole('button', { name: /new graph/i }))

        await waitFor(() => {
            expect(mockSetActiveGraphId).toHaveBeenCalledWith('test-graph-id')
        })
    })

    it('logic: writeTextFile 失敗時に toast.error が呼ばれ setActiveGraphId は呼ばれない', async () => {
        mockWriteTextFile.mockRejectedValue(new Error('fs error'))
        setup()

        fireEvent.click(screen.getByRole('button', { name: /new graph/i }))

        await waitFor(() => {
            expect(mockToastError).toHaveBeenCalledTimes(1)
        })
        expect(mockSetActiveGraphId).not.toHaveBeenCalled()
    })

    // ── 【4. Settings ボタン（継承）】 ──

    it('logic: Settings ボタンが表示される', () => {
        setup()
        expect(screen.getByRole('button', { name: /settings/i })).toBeVisible()
    })

    it('logic: Settings ボタンクリックで onSettingsClick が1回呼ばれる', () => {
        setup()
        fireEvent.click(screen.getByRole('button', { name: /settings/i }))
        expect(mockOnSettingsClick).toHaveBeenCalledTimes(1)
    })
})

// --- 2. 監督へのプレゼン (Visual Story) は project-detail-topbar.e2e.spec.ts で実施 ---