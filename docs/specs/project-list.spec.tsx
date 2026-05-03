/**
 * Slot 1: 発注用ヘッダー (JSDoc Metadata)
 * @context ProjectGrid — プロジェクト一覧画面
 * @bom docs/bom/project.ts
 * @story
 * 1. アプリ起動時、useProjectFile の loadProjects が projects.json を読み込み、
 *    Zustand の projects[] にセットする。
 * 2. ProjectGrid は projects[] をカードグリッドで表示する。
 *    projects[] が空のとき「＋ new project」破線カードのみを表示する（Empty State）。
 * 3. ユーザーが「＋ new project」破線カードをクリックする。
 * 4. New Project ダイアログが開く（isDialogOpen: true）。
 * 5. ユーザーが name を空のまま「作成」ボタンを押す。
 * 6. Zod バリデーションが失敗し、「name は必須です」エラーメッセージが表示される。
 *    ダイアログは開いたまま。
 * 7. ユーザーが name に「地蔵 Core」と入力し、description に「グラフベースの管理OS。」と入力して「作成」を押す。
 * 8. Zod バリデーションが通過し、nanoid() で id が生成される。
 *    Zustand の addProject() が呼ばれ、projects[] に新規プロジェクトが追加される。
 *    ダイアログが閉じる（isDialogOpen: false）。
 *    グリッドに「地蔵 Core」カードが表示される。
 * 9. ユーザーが「キャンセル」ボタンを押す。
 * 10. ダイアログが閉じる（isDialogOpen: false）。form は初期状態にリセットされる。
 * @output src/components/ProjectGrid.tsx
 */

/**
 * Slot 2: 外部依存のインポート (Imports)
 */
import { test, expect, describe, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Project } from '../bom/project';
import { ProjectGrid } from '@/components/ProjectGrid';

/**
 * Slot 3: モック・セットアップ (Test Setup)
 * 実装と検証を切り離すための「独立した基準器」。
 */

/** Tauri fs プラグインを完全にモックする（[A] Hydration シーケンスの前提） */
vi.mock('@tauri-apps/plugin-fs', () => ({
    readTextFile: vi.fn(),
    writeTextFile: vi.fn(),
    exists: vi.fn(),
    BaseDirectory: { AppData: 'AppData' },
}));

/** nanoid をモックして deterministic な id を生成する */
vi.mock('nanoid', () => ({
    nanoid: vi.fn(() => 'test-id-001'),
}));

/**
 * Zustand ストアをモックする。
 * ProjectGrid は useProjectStore から projects[] と addProject を取得する。
 * mockStoreState を書き換えることでテストごとの初期状態を制御する。
 */
const mockAddProject = vi.fn();
const mockStoreState = {
    projects: [] as Project[],
    addProject: mockAddProject,
};

vi.mock('@/store/useProjectStore', () => ({
    useProjectStore: vi.fn(() => mockStoreState),
}));

const setupStore = (initialProjects: Project[] = []) => {
    mockStoreState.projects = initialProjects;
};

const mockProjects: Project[] = [
    { id: '1', name: '地蔵 Core', description: 'グラフベースのプロジェクト管理OS。' },
    { id: '2', name: 'Graph Renderer', description: 'ノード・エッジの依存関係を可視化するビューエンジン。' },
    { id: '3', name: 'HITL Gate', description: 'Human-in-the-loop の承認フロー制御モジュール。' },
];

/**
 * Slot 4: 挙動の検証コード (Story Verification)
 */

// --- 1. AIの内省 (Logic Verification) ---

describe('ProjectGrid: logic', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        setupStore([]);
    });

    test('logic: Empty State — projects[] が空のとき破線カードのみを表示する', () => {
        render(<ProjectGrid />);
        expect(screen.getByText('＋ new project')).toBeInTheDocument();
        expect(screen.queryByRole('article')).toBeNull();
    });

    test('logic: projects[] を受け取りカードを描画する', () => {
        setupStore(mockProjects);
        render(<ProjectGrid />);
        expect(screen.getByText('地蔵 Core')).toBeInTheDocument();
        expect(screen.getByText('Graph Renderer')).toBeInTheDocument();
        expect(screen.getByText('HITL Gate')).toBeInTheDocument();
        expect(screen.getByText('＋ new project')).toBeInTheDocument();
    });

    test('logic: 破線カードクリックでダイアログが開く（isDialogOpen: true）', async () => {
        render(<ProjectGrid />);
        await userEvent.click(screen.getByText('＋ new project'));
        expect(screen.getByRole('dialog')).toBeVisible();
        expect(screen.getByText('New Project')).toBeInTheDocument();
    });

    test('logic: name 空で「作成」を押すとエラーが表示されダイアログは閉じない', async () => {
        render(<ProjectGrid />);
        await userEvent.click(screen.getByText('＋ new project'));
        await userEvent.click(screen.getByText('作成'));
        expect(await screen.findByText('name は必須です')).toBeInTheDocument();
        expect(screen.getByRole('dialog')).toBeVisible();
    });

    test('logic: バリデーション通過後に addProject が呼ばれ、ダイアログが閉じる', async () => {
        render(<ProjectGrid />);
        await userEvent.click(screen.getByText('＋ new project'));
        await userEvent.type(screen.getByPlaceholderText('My Awesome App'), '地蔵 Core');
        await userEvent.type(
            screen.getByPlaceholderText('このプロジェクトの説明（任意）'),
            'グラフベースの管理OS。'
        );
        await userEvent.click(screen.getByText('作成'));
        await waitFor(() => {
            expect(mockAddProject).toHaveBeenCalledWith({
                id: 'test-id-001',
                name: '地蔵 Core',
                description: 'グラフベースの管理OS。',
            });
        });
        expect(screen.queryByRole('dialog')).toBeNull();
    });

    test('logic: 「キャンセル」でダイアログが閉じ form がリセットされる', async () => {
        render(<ProjectGrid />);
        await userEvent.click(screen.getByText('＋ new project'));
        await userEvent.type(screen.getByPlaceholderText('My Awesome App'), 'Draft Name');
        await userEvent.click(screen.getByText('キャンセル'));
        expect(screen.queryByRole('dialog')).toBeNull();
        await userEvent.click(screen.getByText('＋ new project'));
        expect(screen.getByPlaceholderText('My Awesome App')).toHaveValue('');
    });
});