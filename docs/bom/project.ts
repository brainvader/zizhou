import { z } from 'zod'

// ============================================================
// Project
// プロジェクト一覧画面で管理される、各アプリへの参照エントリ。
// id は nanoid() で生成する。
// ============================================================

export const ProjectSchema = z.object({
    id: z.string(),
    name: z.string().min(1, 'name は必須です').max(50),
    description: z.string().max(200).optional(),
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
})

export type NewProjectForm = z.infer<typeof NewProjectFormSchema>

// ============================================================
// ProjectStore
// Zustand global-store の型定義。
// routing は TanStack Router に委譲するため持たない。
// 永続化は useProjectFile hook に委譲する。
// ============================================================

export type ProjectStore = {
    // State
    projects: Project[]
    // Actions
    addProject: (project: Project) => void
    setProjects: (projects: Project[]) => void  // useProjectFile の loadProjects で使用
}

// ============================================================
// useProjectFile hook の責務（Tauri fs + sonner）
// Store から切り出した永続化ロジック。
// - loadProjects: 起動時に AppData/projects.json を読み込み setProjects を呼ぶ
// - saveProjects: projects[] 変化時に subscribe 経由で自動呼び出し
// - エラーは toast.error() で通知する（Store にエラー状態は持たない）
// ============================================================