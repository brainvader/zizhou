/**
 * @context Workspace（Graph / Pipeline / Chat / .zizhou setup）— E2E
 * @note 単一コンテキスト内の詳細は Vitest / Storybook。
 *       ここでは Projects ↔ Workspace をまたぐ導線と URL 切替を検証する。
 */
import { test, expect } from '@playwright/test'
import {
    createProject,
    openWorkspaceFromCard,
    resetFsMock,
} from './helpers'

const EVIDENCE = 'evidence'
const PROJECT = 'Workspace E2E Project'

test.describe('Workspace — Integration', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/')
        await resetFsMock(page)
        await createProject(page, PROJECT, `/tmp/e2e-ws-${Date.now()}`)
    })

    test('カードから Workspace(graph) へ遷移しグラフが表示される', async ({
        page,
    }) => {
        await openWorkspaceFromCard(page, PROJECT)

        await expect(page.getByTestId('workspace-topbar')).toBeVisible()
        await expect(page.getByTestId('context-sidebar')).toBeVisible()
        await expect(page.getByTestId('workspace-view-graph')).toBeVisible()
        await expect(page.getByTestId('graph-node-foundation')).toBeVisible()
        await expect(page.getByTestId('context-chat-panel')).not.toBeVisible()

        await page.screenshot({
            path: `${EVIDENCE}/workspace_graph.png`,
            fullPage: true,
        })
    })

    test('サイドバーで全 Context を OFF にすると空状態になる', async ({
        page,
    }) => {
        await openWorkspaceFromCard(page, PROJECT)

        await page.getByTestId('ctx-row-foundation').click()
        await expect(page.getByTestId('graph-empty')).toBeVisible()

        await page.screenshot({
            path: `${EVIDENCE}/workspace_graph_empty.png`,
            fullPage: true,
        })
    })

    test('view=pipeline で Pipeline と Chat が表示される', async ({ page }) => {
        await openWorkspaceFromCard(page, PROJECT)
        const url = new URL(page.url())
        const projectId = url.searchParams.get('projectId')
        expect(projectId).toBeTruthy()

        await page.goto(
            `/workspace?view=pipeline&projectId=${encodeURIComponent(projectId!)}`,
        )
        await expect(page.getByTestId('workspace-view-pipeline')).toBeVisible({
            timeout: 10_000,
        })
        await expect(page.getByTestId('context-chat-panel')).toBeVisible()
        await expect(page.getByTestId('workspace-view-graph')).not.toBeVisible()

        await page.getByPlaceholder('指示を入力…').fill('E2E 指示')
        await page.getByRole('button', { name: '送信' }).click()
        await expect(page.getByText('E2E 指示')).toBeVisible()

        await page.screenshot({
            path: `${EVIDENCE}/workspace_pipeline_chat.png`,
            fullPage: true,
        })
    })

    test('‹ Projects で一覧に戻れる', async ({ page }) => {
        await openWorkspaceFromCard(page, PROJECT)

        await page.getByTestId('back-to-projects').click()
        await expect(page).toHaveURL('/')
        await expect(page.getByRole('link', { name: PROJECT })).toBeVisible()

        await page.screenshot({
            path: `${EVIDENCE}/workspace_back_to_projects.png`,
            fullPage: true,
        })
    })

    test('.zizhou/context が無いときバナーが出て、作成で消える', async ({
        page,
    }) => {
        await openWorkspaceFromCard(page, PROJECT)

        const banner = page.getByTestId('project-context-setup')
        await expect(banner).toBeVisible({ timeout: 10_000 })
        await expect(page.getByTestId('setup-target-path')).toContainText(
            '.zizhou/context',
        )
        await expect(page.getByTestId('workspace-view-graph')).toBeVisible()

        await page.getByTestId('ensure-zizhou-context').click()
        await expect(banner).not.toBeVisible({ timeout: 10_000 })

        await page.screenshot({
            path: `${EVIDENCE}/workspace_context_created.png`,
            fullPage: true,
        })
    })

    test('/projects/$id は Workspace へリダイレクトする', async ({ page }) => {
        const card = page.getByRole('link', { name: PROJECT })
        const testId = await card.getAttribute('data-testid')
        expect(testId).toMatch(/^card-/)
        const projectId = testId!.replace(/^card-/, '')

        await page.goto(`/projects/${encodeURIComponent(projectId)}`)
        await expect(page).toHaveURL(/\/workspace/, { timeout: 10_000 })
        await expect(page.getByTestId('workspace-route')).toBeVisible()
        await expect(page).toHaveURL(new RegExp(`projectId=${encodeURIComponent(projectId)}`))
    })
})
