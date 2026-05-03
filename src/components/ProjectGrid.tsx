import { useState } from 'react'
import { nanoid } from 'nanoid'
import { useProjectStore } from '@/store/useProjectStore'
import { NewProjectFormSchema, type NewProjectForm } from '@/bom/project'
import {
    Dialog,
    DialogContent,
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

/**
 * ProjectGrid
 * global-store の projects[] をカードグリッドで表示し、新規作成のエントリーポイントを提供する。
 *
 * [B] ダイアログ制御: isDialogOpen && <Dialog/> の条件付きレンダリング（shadcn Dialog）
 * [C] ID生成: 「作成」ボタン押下時に nanoid() を実行し Project に合成してから addProject を呼ぶ
 *
 * @see docs/bom/project.ts
 * @see docs/specs/project-list.spec.tsx
 */
export const ProjectGrid = () => {
    const { projects, addProject } = useProjectStore()
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [form, setForm] = useState<NewProjectForm>(INITIAL_FORM)
    const [errors, setErrors] = useState(INITIAL_ERRORS)

    /** ダイアログを開く */
    const handleOpenDialog = () => {
        setForm(INITIAL_FORM)
        setErrors(INITIAL_ERRORS)
        setIsDialogOpen(true)
    }

    /** ダイアログを閉じる（キャンセル） */
    const handleCancel = () => {
        setForm(INITIAL_FORM)
        setErrors(INITIAL_ERRORS)
        setIsDialogOpen(false)
    }

    /** 「作成」ボタン押下: Zod バリデーション → addProject → ダイアログを閉じる */
    const handleSubmit = () => {
        const result = NewProjectFormSchema.safeParse(form)
        if (!result.success) {
            const fieldErrors = result.error.flatten().fieldErrors
            setErrors({
                name: fieldErrors.name?.[0] ?? null,
                description: fieldErrors.description?.[0] ?? null,
            })
            return
        }
        // [C] ID生成: nanoid() で id を生成して Project に合成
        addProject({ id: nanoid(), ...result.data })
        setIsDialogOpen(false)
        setForm(INITIAL_FORM)
        setErrors(INITIAL_ERRORS)
    }

    return (
        <main className="p-6">
            {/* プロジェクトカードグリッド */}
            <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
                {projects.map((project) => (
                    <article
                        key={project.id}
                        className="rounded-md border border-border bg-card p-4 cursor-pointer hover:-translate-y-px transition-transform"
                    >
                        <div className="font-medium text-card-foreground text-sm">{project.name}</div>
                        {project.description && (
                            <div className="text-muted-foreground text-xs mt-1">{project.description}</div>
                        )}
                    </article>
                ))}

                {/* ＋ new project 破線カード */}
                <button
                    onClick={handleOpenDialog}
                    className="rounded-md border border-dashed border-border bg-transparent p-4 flex items-center justify-center hover:border-primary hover:shadow-[0_0_18px_var(--primary-glow)] transition-all cursor-pointer"
                >
                    <span className="font-mono text-xs text-muted-foreground tracking-wider">＋ new project</span>
                </button>
            </div>

            {/* [B] New Project ダイアログ */}
            {isDialogOpen && (
                <Dialog open={isDialogOpen} onOpenChange={(open) => !open && handleCancel()}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>New Project</DialogTitle>
                        </DialogHeader>

                        <div className="flex flex-col gap-4">
                            {/* name フィールド */}
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

                            {/* description フィールド */}
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