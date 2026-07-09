/**
 * ProjectContextSetup — プロジェクトに ContextMap 置き場を用意する
 *
 * @see docs/context/ContextMap.projects.html
 * @see src/lib/ensureZizhouContext.ts
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { ProjectContextSetup } from './ProjectContextSetup'
import {
    ensureZizhouContext,
    hasZizhouContext,
} from '@/lib/ensureZizhouContext'
import { zizhouContextPath } from '@/bom/zizhou-context'

describe('プロジェクトに ContextMap 置き場を用意する', () => {
    it('.zizhou/context が無いとき作成を促す UI を表示する', () => {
        render(
            <ProjectContextSetup
                projectName="地蔵 Core"
                rootPath="/projects/zizhou"
                onCreate={vi.fn()}
            />,
        )
        expect(screen.getByTestId('project-context-setup')).toBeInTheDocument()
        expect(screen.getByText(/ContextMap 置き場がありません/)).toBeInTheDocument()
        expect(screen.getByTestId('setup-target-path')).toHaveTextContent(
            zizhouContextPath('/projects/zizhou'),
        )
        expect(screen.getByTestId('ensure-zizhou-context')).toBeInTheDocument()
    })

    it('「作成する」で onCreate が呼ばれる', async () => {
        const user = userEvent.setup()
        const onCreate = vi.fn()
        render(
            <ProjectContextSetup
                projectName="地蔵 Core"
                rootPath="/projects/zizhou"
                onCreate={onCreate}
            />,
        )
        await user.click(screen.getByTestId('ensure-zizhou-context'))
        expect(onCreate).toHaveBeenCalledOnce()
    })

    it('ensureZizhouContext は無いとき mkdir して created を返す', async () => {
        const onExists = vi.fn().mockResolvedValue(false)
        const onMkdir = vi.fn().mockResolvedValue(undefined)
        const result = await ensureZizhouContext('/projects/zizhou', {
            onExists,
            onMkdir,
        })
        expect(result).toBe('created')
        expect(onMkdir).toHaveBeenCalledWith(
            zizhouContextPath('/projects/zizhou'),
            { recursive: true },
        )
    })

    it('作成は冪等（既にあるとき mkdir しない）', async () => {
        const onExists = vi.fn().mockResolvedValue(true)
        const onMkdir = vi.fn()
        const result = await ensureZizhouContext('/projects/zizhou', {
            onExists,
            onMkdir,
        })
        expect(result).toBe('exists')
        expect(onMkdir).not.toHaveBeenCalled()
        await expect(
            hasZizhouContext('/projects/zizhou', onExists),
        ).resolves.toBe(true)
    })
})
