import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ProjectGrid } from './ProjectGrid'
import { useProjectStore } from '@/store/useProjectStore'

// Radix UI Dialog と TanStack Router Link をモックする。
// 視覚的な動作確認は ProjectGrid.stories.tsx に委ねる。
vi.mock('@/components/ui/dialog', () => ({
    Dialog: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
        open ? <div role="dialog">{children}</div> : null,
    DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
    DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
    DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const StubLink = ({ children, className, 'data-testid': testId }: {
    to: string
    params?: Record<string, string>
    children: React.ReactNode
    className?: string
    'data-testid'?: string
}) => <a className={className} data-testid={testId}>{children}</a>

const PROJECTS = [
    { id: '1', name: '地蔵 Core', description: 'コアシステム', rootPath: '/projects/zizhou' },
    { id: '2', name: 'Zizou Web', description: 'Webフロント', rootPath: '/projects/web' },
]

beforeEach(() => {
    useProjectStore.setState({ projects: [], isHydrated: true })
})

describe('ProjectGrid', () => {
    it('projects が空のとき「＋ new project」ボタンのみ表示される', () => {
        render(<ProjectGrid LinkComponent={StubLink} />)
        expect(screen.getByRole('button', { name: /new project/ })).toBeInTheDocument()
    })

    it('projects があるときカードが表示される', () => {
        useProjectStore.setState({ projects: PROJECTS, isHydrated: true })
        render(<ProjectGrid LinkComponent={StubLink} />)
        expect(screen.getByText('地蔵 Core')).toBeInTheDocument()
        expect(screen.getByText('Zizou Web')).toBeInTheDocument()
    })

    it('isHydrated が false のとき「＋ new project」は disabled になる', () => {
        useProjectStore.setState({ projects: [], isHydrated: false })
        render(<ProjectGrid LinkComponent={StubLink} />)
        expect(screen.getByRole('button', { name: /new project/ })).toBeDisabled()
    })

    it('「＋ new project」をクリックするとダイアログが開く', () => {
        render(<ProjectGrid LinkComponent={StubLink} />)
        fireEvent.click(screen.getByRole('button', { name: /new project/ }))
        expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('name 空で「作成」を押すとバリデーションエラーが表示される', () => {
        render(<ProjectGrid LinkComponent={StubLink} />)
        fireEvent.click(screen.getByRole('button', { name: /new project/ }))
        fireEvent.click(screen.getByRole('button', { name: '作成' }))
        expect(screen.getByText('name は必須です')).toBeInTheDocument()
        expect(screen.getByText('root path は必須です')).toBeInTheDocument()
    })

    it('onCreateProject 成功後にダイアログが閉じる', async () => {
        const onCreateProject = vi.fn().mockResolvedValue({ id: 'new', name: 'New Project', rootPath: '/tmp', description: '' })
        render(<ProjectGrid LinkComponent={StubLink} onCreateProject={onCreateProject} />)
        fireEvent.click(screen.getByRole('button', { name: /new project/ }))
        fireEvent.change(screen.getByPlaceholderText('My Awesome App'), { target: { value: 'New Project' } })
        fireEvent.change(screen.getByPlaceholderText('/Users/user/projects/my-app'), { target: { value: '/tmp/project' } })
        fireEvent.click(screen.getByRole('button', { name: '作成' }))
        await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    })

    it('onCreateProject 失敗時はダイアログが閉じない', async () => {
        const onCreateProject = vi.fn().mockRejectedValue(new Error('fail'))
        render(<ProjectGrid LinkComponent={StubLink} onCreateProject={onCreateProject} />)
        fireEvent.click(screen.getByRole('button', { name: /new project/ }))
        fireEvent.change(screen.getByPlaceholderText('My Awesome App'), { target: { value: 'New Project' } })
        fireEvent.change(screen.getByPlaceholderText('/Users/user/projects/my-app'), { target: { value: '/tmp/project' } })
        fireEvent.click(screen.getByRole('button', { name: '作成' }))
        await waitFor(() => expect(onCreateProject).toHaveBeenCalled())
        expect(screen.getByRole('dialog')).toBeInTheDocument()
    })
})