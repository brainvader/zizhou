import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { invoke } from '@tauri-apps/api/core'
import { toast } from 'sonner'
import { useProjectStore } from '@/store/useProjectStore'
import { NewProjectFormSchema, type NewProjectForm, type Project } from '@/bom/project'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

/** フォームの初期状態 */
const INITIAL_FORM: NewProjectForm = { name: '', description: '' }
const INITIAL_ERRORS = { name: null as string | null, description: null as string | null }

type CreateProjectFn = (name: string, description?: string) => Promise<Project>
type StubLinkProps = { to: string; params?: Record<string, string>; search?: Record<string, unknown>; children: React.ReactNode; className?: string; 'data-testid'?: string }

type ProjectGridProps = {
    /** props DI: Storybook / テスト用。省略時は invoke('create_project') を使用 */
    onCreateProject?: CreateProjectFn
    /** props DI: Storybook / テスト用。省略時は TanStack Router の Link を使用 */
    LinkComponent?: React.ComponentType<StubLinkProps>
}

const defaultCreateProject: CreateProjectFn = (name, description) =>
    invoke('create_project', { name, description })

/**
 * ProjectGrid
 * SurrealDB から取得した projects[] をカードグリッドで表示し、新規作成のエントリーポイントを提供する。
 *
 * @see docs/bom/project.ts
 * @see docs/specs/project-list.spec.tsx
 */
export const ProjectGrid = ({
    onCreateProject = defaultCreateProject,
    LinkComponent,
}: ProjectGridProps) => {
    const { projects, addProject, isHydrated } = useProjectStore()
    const NavLink = LinkComponent ?? Link
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [form, setForm] = useState<NewProjectForm>(INITIAL_FORM)
    const [errors, setErrors] = useState(INITIAL_ERRORS)

    const handleOpenDialog = () => {
        setForm(INITIAL_FORM)
        setErrors(INITIAL_ERRORS)
        setIsDialogOpen(true)
    }

    const handleCancel = () => {
        setForm(INITIAL_FORM)
        setErrors(INITIAL_ERRORS)
        setIsDialogOpen(false)
    }

    const handleSubmit = async () => {
        const result = NewProjectFormSchema.safeParse(form)
        if (!result.success) {
            const fieldErrors = result.error.flatten().fieldErrors
            setErrors({
                name: fieldErrors.name?.[0] ?? null,
                description: fieldErrors.description?.[0] ?? null,
            })
            return
        }
        try {
            const project = await onCreateProject(result.data.name, result.data.description)
            addProject(project)
            setIsDialogOpen(false)
            setForm(INITIAL_FORM)
            setErrors(INITIAL_ERRORS)
        } catch {
            toast.error('プロジェクトの作成に失敗しました')
        }
    }

    return (
        <main data-testid="project-grid" className="p-6">
            <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
                {projects.map((project) => (
                    <NavLink
                        key={project.id}
                        to="/projects/$id"
                        params={{ id: project.id }}
                        search={{ graph: undefined }}
                        data-testid={`card-${project.id}`}
                        className="rounded-md border border-border bg-card p-4 cursor-pointer hover:-translate-y-px transition-transform block no-underline"
                    >
                        <div className="font-medium text-card-foreground text-sm">{project.name}</div>
                        {project.description && (
                            <div className="text-muted-foreground text-xs mt-1">{project.description}</div>
                        )}
                    </NavLink>
                ))}

                {/* ＋ new project 破線カード — loadProjects 完了前は disabled */}
                <button
                    onClick={handleOpenDialog}
                    disabled={!isHydrated}
                    className="rounded-md border border-dashed border-border bg-transparent p-4 flex items-center justify-center hover:border-primary hover:shadow-[0_0_18px_var(--primary-glow)] transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-border disabled:hover:shadow-none"
                >
                    <span className="font-mono text-xs text-muted-foreground tracking-wider">＋ new project</span>
                </button>
            </div>

            {isDialogOpen && (
                <Dialog open={isDialogOpen} onOpenChange={(open) => !open && handleCancel()}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>New Project</DialogTitle>
                            <DialogDescription className="sr-only">
                                新しいプロジェクトを作成します
                            </DialogDescription>
                        </DialogHeader>

                        <div className="flex flex-col gap-4">
                            <div className="flex flex-col gap-1.5">
                                <Label htmlFor="project-name" className="font-mono text-xs tracking-wide">
                                    name *
                                </Label>
                                <Input
                                    id="project-name"
                                    placeholder="My Awesome App"
                                    value={form.name}
                                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                                    className={errors.name ? 'border-destructive' : ''}
                                />
                                {errors.name && (
                                    <span className="font-mono text-xs text-destructive">{errors.name}</span>
                                )}
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <Label htmlFor="project-description" className="font-mono text-xs tracking-wide">
                                    description
                                </Label>
                                <Input
                                    id="project-description"
                                    placeholder="このプロジェクトの説明（任意）"
                                    value={form.description ?? ''}
                                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                                    className={errors.description ? 'border-destructive' : ''}
                                />
                                {errors.description && (
                                    <span className="font-mono text-xs text-destructive">{errors.description}</span>
                                )}
                            </div>
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={handleCancel}>
                                キャンセル
                            </Button>
                            <Button onClick={handleSubmit}>作成</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </main>
    )
}