// docs/bom/project.ts

import { z } from 'zod'

/**
 * Project
 * プロジェクト一覧画面で管理される、各アプリへの参照エントリ。
 */
export const ProjectSchema = z.object({
    id: z.string().uuid(),
    name: z.string().min(1).max(50),
    description: z.string().max(200),
})

export type Project = z.infer<typeof ProjectSchema>

/**
 * ProjectStore
 * Zustand global-store の型定義。
 */
export const ProjectStoreSchema = z.object({
    projects: z.array(ProjectSchema),
})

export type ProjectStore = z.infer<typeof ProjectStoreSchema>