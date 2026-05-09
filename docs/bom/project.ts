import { z } from 'zod'

// ============================================================
// Project
// プロジェクト一覧画面で管理される、各アプリへの参照エントリ。
// id は nanoid() で生成する。
// rootPath はプロジェクトのルートディレクトリの絶対パス。
// ============================================================

export const ProjectSchema = z.object({
    id: z.string(),
    name: z.string().min(1, 'name は必須です').max(50),
    description: z.string().max(200).optional(),
    rootPath: z.string().min(1, 'rootPath は必須です'),  // 追加
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
    rootPath: z.string().min(1, 'rootPath は必須です'),  // 追加
})

export type NewProjectForm = z.infer<typeof NewProjectFormSchema>

// ============================================================
// ProjectStore
// Zustand global-store の型定義。
// routing は TanStack Router に委譲するため持たない。
// 永続化は useProjectFile hook に委譲する（subscribe ベース）。
// isHydrated: Tauri fs からの初回ロード完了フラグ。
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