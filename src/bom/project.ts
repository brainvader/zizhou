import { z } from 'zod'

// ============================================================
// Project
// プロジェクト一覧画面で管理される、各アプリへの参照エントリ。
// id は SurrealDB が自動生成する（Thing 型: "project:xxxxx"）。
// ============================================================

export const ProjectSchema = z.object({
    id: z.string(),
    name: z.string().min(1, 'name は必須です').max(50),
    description: z.string().max(200).optional(),
    rootPath: z.string().min(1, 'root path は必須です'),
})

export type Project = z.infer<typeof ProjectSchema>

// ============================================================
// NewProjectForm
// New Project ダイアログのフォーム入力値。
// バリデーションは作成ボタン押下時に Zod で行う。
// ============================================================

export const NewProjectFormSchema = z.object({
    name: z.string().min(1, 'name は必須です'),
    description: z.string().max(200).optional(),
    rootPath: z.string().min(1, 'root path は必須です'),
})

export type NewProjectForm = z.infer<typeof NewProjectFormSchema>

// ============================================================
// ProjectStore
// Zustand global-store の型定義。
// routing は TanStack Router に委譲するため持たない。
// 永続化は SurrealDB embedded (Rust IPC) に委譲する。
// isHydrated: invoke('list_projects') 完了後に true になる。
// ============================================================

export type ProjectStore = {
    // State
    projects: Project[]
    isHydrated: boolean

    // Actions
    addProject: (project: Project) => void
    setProjects: (projects: Project[]) => void
    setHydrated: (value: boolean) => void
}

// ============================================================
// UseProjectLoadReturn
// useProjectLoad hook の戻り値型。
// __root.tsx で呼び出す。起動時の一度きりの読み込みに特化。
// invoke('list_projects') で SurrealDB から projects[] を取得する。
// ============================================================

export type UseProjectLoadReturn = {
    loadProjects: () => Promise<void>
}