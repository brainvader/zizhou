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
import { RootPathInput } from '@/components/RootPathInput'

const INITIAL_FORM: NewProjectForm = { name: '', description: '', rootPath: '' }
const INITIAL_ERRORS = { name: null as string | null, description: null as string | null, rootPath: null as string | null }

type CreateProjectFn = (name: string, description?: string, rootPath?: string) => Promise<Project>
type StubLinkProps = { to: string; params?: Record<string, string>; search?: Record<string, unknown>; children: React.ReactNode; className?: string; 'data-testid'?: string }

type ProjectGridProps = {
    onCreateProject?: CreateProjectFn
    LinkComponent?: React.ComponentType<StubLinkProps>
}

const DefaultLink = ({ to, params, search, children, className, 'data-testid': testId }: StubLinkProps) => (
    <Link to={to} params={params} search={search} className={className} data-testid={testId}>
        {children}
    </Link>
)

export function ProjectGrid({ onCreateProject, LinkComponent }: ProjectGridProps) {
    const { projects, isHydrated } = useProjectStore()
    const [open, setOpen] = useState(false)
    const [form, setForm] = useState<NewProjectForm>(INITIAL_FORM)
    const [errors, setErrors] = useState(INITIAL_ERRORS)

    const CustomLink = LinkComponent ?? DefaultLink

    const handleCancel = () => {
        setOpen(false)
        setForm(INITIAL_FORM)
        setErrors(INITIAL_ERRORS)
    }

    const handleSubmit = async () => {
        const result = NewProjectFormSchema.safeParse(form)
        if (!result.success) {
            const fieldErrors = result.error.flatten().fieldErrors
            setErrors({
                name: fieldErrors.name?.[0] ?? null,
                description: fieldErrors.description?.[0] ?? null,
                rootPath: fieldErrors.rootPath?.[0] ?? null,
            })
            return // ✨【修正】バリデーションエラー時はここで処理を中断させる
        }

        try {
            const createFn =
                onCreateProject ??
                (async (name, desc, path) => invoke<Project>('create_project', { name, description: desc, rootPath: path }))
            const newProj = await createFn(form.name, form.description, form.rootPath)

            useProjectStore.setState((state) => ({
                projects: [...state.projects, newProj],
            }))

            toast.success(`プロジェクト「${newProj.name}」を作成しました`)
            setOpen(false)
            setForm(INITIAL_FORM)
            setErrors(INITIAL_ERRORS)
        } catch (e) {
            toast.error('プロジェクトの作成に失敗しました')
        }
    }

    return (
        <main className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {projects.map((project) => (
                    <CustomLink
                        key={project.id}
                        to="/projects/$id"
                        params={{ id: project.id }}
                        className="block p-4 border rounded-lg hover:border-foreground transition-colors"
                    >
                        <h2 className="font-bold text-lg truncate">{project.name}</h2>
                        {project.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                                {project.description}
                            </p>
                        )}
                        <p
                            data-testid="card-root-path"
                            className="font-mono text-[9px] text-muted-foreground/50 mt-auto truncate"
                        >
                            {project.rootPath}
                        </p>
                    </CustomLink>
                ))}

                <Button
                    onClick={() => setOpen(true)}
                    disabled={!isHydrated}
                    variant="outline"
                    className="h-full min-h-30 border-dashed flex flex-col gap-2 items-center justify-center text-muted-foreground hover:text-foreground"
                >
                    <span>＋ new project</span>
                </Button>
            </div>

            {open && (
                <Dialog open={open} onOpenChange={(v) => !v && handleCancel()}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create New Project</DialogTitle>
                            <DialogDescription>
                                新しいローカルプロジェクトを追加します。プロジェクト情報はローカルデータベースに保存されます。
                            </DialogDescription>
                        </DialogHeader>

                        <div className="flex flex-col gap-4 py-4">
                            <div className="flex flex-col gap-1.5">
                                <Label htmlFor="project-name" className="font-mono text-xs tracking-wide">
                                    name <span className="text-destructive">*</span>
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

                            <RootPathInput
                                value={form.rootPath}
                                onChange={(v) => setForm((f) => ({ ...f, rootPath: v }))}
                                error={errors.rootPath}
                            />
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