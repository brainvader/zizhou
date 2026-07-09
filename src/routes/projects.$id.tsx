import { useCallback, useEffect, useState } from 'react'
import { useParams, useNavigate } from '@tanstack/react-router'
import { useProjectStore } from '@/store/useProjectStore'
import { ProjectContextSetup } from '@/components/ProjectContextSetup'
import {
    ensureZizhouContext,
    hasZizhouContext,
    type ExistsFn,
    type MkdirFn,
} from '@/lib/ensureZizhouContext'

export type ProjectDetailRouteProps = {
    onExists?: ExistsFn
    onMkdir?: MkdirFn
}

type GateState = 'loading' | 'needs-setup' | 'ready' | 'missing-project'

/**
 * ProjectDetailRoute
 * "/projects/$id" — ContextMap 置き場ゲート。
 * .zizhou/context が無ければ作成 UI、あれば Workspace へ遷移する。
 *
 * @see docs/context/ContextMap.projects.html
 * @see src/lib/ensureZizhouContext.ts
 */
export function ProjectDetailRoute({
    onExists,
    onMkdir,
}: ProjectDetailRouteProps = {}) {
    const { id } = useParams({ from: '/projects/$id' })
    const navigate = useNavigate()
    const isHydrated = useProjectStore((s) => s.isHydrated)
    const project = useProjectStore((s) => s.projects.find((p) => p.id === id))
    const [gate, setGate] = useState<GateState>('loading')
    const [isCreating, setIsCreating] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const goWorkspace = useCallback(() => {
        void navigate({
            to: '/workspace',
            search: { view: 'graph', projectId: id },
        })
    }, [navigate, id])

    useEffect(() => {
        if (!isHydrated) {
            setGate('loading')
            return
        }
        if (!project) {
            setGate('missing-project')
            return
        }
        let cancelled = false
        setGate('loading')
        void hasZizhouContext(project.rootPath, onExists).then((ok) => {
            if (cancelled) return
            if (ok) {
                setGate('ready')
                goWorkspace()
            } else {
                setGate('needs-setup')
            }
        })
        return () => {
            cancelled = true
        }
    }, [isHydrated, project, onExists, goWorkspace])

    const handleCreate = async () => {
        if (!project) return
        setIsCreating(true)
        setError(null)
        try {
            await ensureZizhouContext(project.rootPath, { onExists, onMkdir })
            goWorkspace()
        } catch {
            setError('.zizhou/context の作成に失敗しました')
        } finally {
            setIsCreating(false)
        }
    }

    if (gate === 'missing-project' || !project) {
        return (
            <div
                data-testid="project-detail-route"
                className="flex items-center justify-center h-screen bg-background text-foreground"
            >
                <div
                    data-testid="project-detail-id"
                    className="font-mono text-sm text-muted-foreground"
                >
                    {id}
                </div>
            </div>
        )
    }

    if (gate === 'loading' || gate === 'ready') {
        return (
            <div
                data-testid="project-detail-route"
                className="flex items-center justify-center h-screen bg-background text-muted-foreground text-sm"
            >
                Loading…
            </div>
        )
    }

    return (
        <div data-testid="project-detail-route">
            <ProjectContextSetup
                projectName={project.name}
                rootPath={project.rootPath}
                onCreate={handleCreate}
                onBack={() => void navigate({ to: '/' })}
                isCreating={isCreating}
                error={error}
            />
        </div>
    )
}
