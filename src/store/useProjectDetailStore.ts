import { create } from 'zustand'

// ============================================================
// Types
// ============================================================

// 【修正点】@/bom/graph から InitStatus がエクスポートされていないため、
// 外部からのインポートを削除し、ここで直接型を定義してエラーを解消します。
export type InitStatus = 'checking' | 'ready'

export type ProjectDetailStoreState = {
    activeGraphId: string | null
    initStatus: InitStatus
    projectRootPath: string
    isDetailHydrated: boolean
    /** [CTX-22] 最後に選択したテストファイルパス。TaaC グラフのキャッシュに使用。 */
    selectedTestFilePath: string | null
}

export type ProjectDetailStoreActions = {
    setActiveGraphId: (id: string | null) => void
    setInitStatus: (status: InitStatus) => void
    setProjectRootPath: (path: string) => void
    setDetailHydrated: (value: boolean) => void
    /** [CTX-22] 選択テストファイルパスを更新する。 */
    setSelectedTestFilePath: (filePath: string | null) => void
}

export type ProjectDetailStore = ProjectDetailStoreState & ProjectDetailStoreActions

/**
 * useProjectDetailStore
 *
 * project-detail 画面のグローバル状態。
 * activeProjectId は TanStack Router の useParams から取得する。
 * projectRootPath / activeGraphId は:
 * 1. useProjectDetailLoad が AppData/project-detail-{id}.json から復元する（直アクセス時）
 * 2. projects.$id.tsx の useEffect が project?.rootPath / URL ?graph= から注入する（通常遷移時）
 *
 * isDetailHydrated:
 * useProjectDetailLoad 完了後に true になる。
 *
 * @see src/hooks/useProjectDetailLoad.ts
 * @see src/hooks/useProjectDetailSave.ts
 * @see docs/bom/graph.ts
 */
export const useProjectDetailStore = create<ProjectDetailStore>((set) => ({
    // State
    activeGraphId: null,
    initStatus: 'checking',
    projectRootPath: '',
    isDetailHydrated: false,
    selectedTestFilePath: null,

    // Actions
    setActiveGraphId: (id: string | null) => set({ activeGraphId: id }),
    setInitStatus: (status: InitStatus) => set({ initStatus: status }),
    setProjectRootPath: (path: string) => set({ projectRootPath: path }),
    setDetailHydrated: (value: boolean) => set({ isDetailHydrated: value }),
    setSelectedTestFilePath: (filePath: string | null) => set({ selectedTestFilePath: filePath }),
}))