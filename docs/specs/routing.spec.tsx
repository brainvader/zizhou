/**
 * Slot 1: 発注用ヘッダー (JSDoc Metadata)
 *
 * @context CTX-5: ROUTING
 * @bom     docs/bom/project.ts
 *
 * @story
 * 1. ユーザーがホーム画面（`/`）を開くと ProjectGrid が表示される
 * 2. ユーザーがプロジェクトカードをクリックすると `/projects/:id` へ遷移する
 * 3. `/projects/:id` ページに、その id が表示される（プレースホルダー）
 * 4. ブラウザの「戻る」操作で ProjectGrid に戻れる
 *
 * @output
 *   src/router.tsx
 *   src/routes/index.tsx
 *   src/routes/projects.$id.tsx
 */

// =============================================================================
// Slot 2: 外部依存のインポート (Imports)
// =============================================================================
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
    createMemoryHistory,
    createRouter,
    createRootRoute,
    createRoute,
    RouterProvider,
    Link,
} from '@tanstack/react-router';
import type { Project } from '../../docs/bom/project';

// =============================================================================
// Slot 3: モック・セットアップ (Test Setup)
// =============================================================================

/**
 * Zustand ストアモック。
 * - vi.hoisted() で巻き上げ、vi.mock() より先に評価させる。
 * - BOM の ProjectStore 準拠: isHydrated は useProjectFile の責務のため持たない。
 * - useProjectFile の isHydrated は別途モックする。
 */
const { mockProjects, mockUseProjectStore, mockUseProjectFile } = vi.hoisted(() => {
    const mockProjects: Project[] = [
        { id: 'proj-001', name: '地蔵 Core', description: 'グラフベースのプロジェクト管理OS。', rootPath: '/projects/zizou-core' },
        { id: 'proj-002', name: 'Graph Renderer', description: 'ノード・エッジの依存関係を可視化するビューエンジン。', rootPath: '/projects/graph-renderer' },
    ];

    const mockUseProjectStore = vi.fn(() => ({
        projects: mockProjects,
        addProject: vi.fn() as unknown as (p: Project) => void,
        setProjects: vi.fn() as unknown as (ps: Project[]) => void,
    }));

    const mockUseProjectFile = vi.fn(() => ({
        isHydrated: true,
        loadProjects: vi.fn() as unknown as () => Promise<void>,
        saveProjects: vi.fn() as unknown as (ps: Project[]) => Promise<void>,
    }));

    return { mockProjects, mockUseProjectStore, mockUseProjectFile };
});

vi.mock('@/store/useProjectStore', () => ({
    useProjectStore: mockUseProjectStore,
}));

vi.mock('@/hooks/useProjectFile', () => ({
    useProjectFile: mockUseProjectFile,
}));

// ---------------------------------------------------------------------------
// インメモリルーターファクトリ
// 実際の src/router.tsx と同じルート構成を再現する。
// ---------------------------------------------------------------------------

/**
 * ProjectGrid の最小スタブ。
 * 各カードを <Link to="/projects/$id"> でラップした形を再現する。
 * data-testid="card-{id}" は実装側のマーカーと一致させること。
 */
const ProjectGridStub = () => (
    <ul data-testid="project-grid">
        {mockProjects.map((p) => (
            <li key={p.id}>
                <Link
                    to="/projects/$id"
                    params={{ id: p.id }}
                    data-testid={`card-${p.id}`}
                >
                    {p.name}
                </Link>
            </li>
        ))}
    </ul>
);

const buildTestRouter = (initialPath = '/') => {
    const rootRoute = createRootRoute();

    const indexRoute = createRoute({
        getParentRoute: () => rootRoute,
        path: '/',
        component: ProjectGridStub,
    });

    // ルートオブジェクト参照で useParams を呼ぶ（TanStack Router 推奨パターン）
    const projectDetailRoute = createRoute({
        getParentRoute: () => rootRoute,
        path: '/projects/$id',
        component: function ProjectDetailPage() {
            const { id } = projectDetailRoute.useParams();
            return <div data-testid="project-detail-id">{id}</div>;
        },
    });

    const routeTree = rootRoute.addChildren([indexRoute, projectDetailRoute]);
    const history = createMemoryHistory({ initialEntries: [initialPath] });

    return createRouter({ routeTree, history });
};

// =============================================================================
// Slot 4: 挙動の検証コード (Story Verification)
// =============================================================================

// --- 1. AIの内省 (Logic Verification) ---
// 注: vi.hoisted() の初期返り値をそのまま使用する。
// mockUseProjectStore / mockUseProjectFile は vi.mock() 登録済みのため、
// 各テストは独立した router インスタンスを buildTestRouter() で生成して使う。

describe('logic: route tree', () => {
    it('should build without throwing for both routes', () => {
        expect(() => buildTestRouter('/')).not.toThrow();
        expect(() => buildTestRouter('/projects/proj-001')).not.toThrow();
    });

    it('should render ProjectGrid at "/"', async () => {
        const router = buildTestRouter('/');
        render(<RouterProvider router={router} />);
        await waitFor(() =>
            expect(screen.getByTestId('project-grid')).toBeInTheDocument(),
        );
    });

    it('should render detail page at "/projects/$id" and expose id param', async () => {
        const router = buildTestRouter('/projects/proj-abc');
        render(<RouterProvider router={router} />);
        await waitFor(() =>
            expect(screen.getByTestId('project-detail-id').textContent).toBe('proj-abc'),
        );
    });

    it('unknown route should not render project-grid', async () => {
        const router = buildTestRouter('/unknown');
        render(<RouterProvider router={router} />);
        await waitFor(() =>
            expect(screen.queryByTestId('project-grid')).not.toBeInTheDocument(),
        );
    });
});

describe('logic: card link href', () => {
    it('each card link should point to /projects/:id', async () => {
        const router = buildTestRouter('/');
        render(<RouterProvider router={router} />);

        await waitFor(() => screen.getByTestId('card-proj-001'));

        // <Link> は最終的に <a> としてレンダリングされる
        for (const p of mockProjects) {
            const anchor = screen.getByTestId(`card-${p.id}`) as HTMLAnchorElement;
            expect(anchor.tagName).toBe('A');
            expect(anchor.href).toContain(`/projects/${p.id}`);
        }
    });
});

// --- 2. 監督へのプレゼン (Visual Story — RTL レベル) ---

describe('CTX-5 ROUTING — Visual Story (RTL)', () => {
    beforeEach(() => {
        mockUseProjectStore.mockReturnValue({
            projects: mockProjects,
            addProject: vi.fn(),
            setProjects: vi.fn(),
        });
        mockUseProjectFile.mockReturnValue({
            isHydrated: true,
            loadProjects: vi.fn(),
            saveProjects: vi.fn(),
        });
    });

    it('step 1: "/" renders ProjectGrid with all project cards', async () => {
        const router = buildTestRouter('/');
        render(<RouterProvider router={router} />);

        await waitFor(() => expect(screen.getByTestId('project-grid')).toBeInTheDocument());

        for (const p of mockProjects) {
            expect(screen.getByTestId(`card-${p.id}`)).toBeInTheDocument();
        }
    });

    it('step 2-3: clicking a card navigates to /projects/:id and shows id', async () => {
        const user = userEvent.setup();
        const router = buildTestRouter('/');
        render(<RouterProvider router={router} />);

        // step 1: ProjectGrid 確認
        await waitFor(() => screen.getByTestId('project-grid'));

        // step 2: カードクリック
        await user.click(screen.getByTestId('card-proj-001'));

        // step 3: id がプレースホルダーとして表示される
        await waitFor(() => {
            expect(screen.getByTestId('project-detail-id')).toBeInTheDocument();
            expect(screen.getByTestId('project-detail-id').textContent).toBe('proj-001');
        });
    });

    it('step 3 (direct): direct access to /projects/:id shows id', async () => {
        const router = buildTestRouter('/projects/proj-002');
        render(<RouterProvider router={router} />);

        await waitFor(() =>
            expect(screen.getByTestId('project-detail-id').textContent).toBe('proj-002'),
        );
    });

    it('step 4: router.navigate("/") returns to ProjectGrid', async () => {
        // jsdom は history.back() をルーターに伝播しないため
        // router.navigate() で同等の「戻る」操作を代替する。
        // 実ブラウザでの history.back() 動作は E2E（Playwright）で保証する。
        const router = buildTestRouter('/projects/proj-001');
        render(<RouterProvider router={router} />);

        await waitFor(() => screen.getByTestId('project-detail-id'));

        await act(async () => {
            await router.navigate({ to: '/' });
        });

        await waitFor(() =>
            expect(screen.getByTestId('project-grid')).toBeInTheDocument(),
        );
    });
});