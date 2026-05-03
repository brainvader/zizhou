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
// id は含まない。「作成」ボタン押下時に nanoid() で生成して Project に合成する。
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
// 依存: @tauri-apps/plugin-fs / sonner
//
// [A] 起動時の Hydration シーケンス
//   main.tsx または App.tsx の useEffect で loadProjects を一度だけ呼ぶ。
//   projects.json が存在しない場合は空配列 [] で初期化する。
//
// [B] Dialog の制御
//   <dialog> 要素は使わず isDialogOpen && <Dialog/> の形式で制御する。
//   shadcn Dialog コンポーネントを使用する。
//
// [C] ID 生成のタイミング
//   「作成」ボタン押下時に nanoid() を実行し、
//   NewProjectForm に id を合成してから addProject を呼ぶ。
//     const project: Project = { id: nanoid(), ...form }
//     addProject(project)
//
// [永続化]
//   projects[] の変化を subscribe で監視して saveProjects を自動呼び出し。
//   エラーは toast.error() で通知する（Store にエラー状態は持たない）。
// ============================================================

export type UseProjectFileReturn = {
    loadProjects: () => Promise<void>
    saveProjects: (projects: Project[]) => Promise<void>
}