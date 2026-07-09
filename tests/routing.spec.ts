/**
 * @context CTX-5: ROUTING / CTX-11: Root Layout
 * @note Projects ↔ Workspace の基本導線。詳細は workspace.spec.ts。
 */

import { test, expect } from '@playwright/test'
import { createProject, openWorkspaceFromCard } from './helpers'

const EVIDENCE = 'evidence'
const TEST_PROJECT_NAME = 'Routing Test Project'

test.describe('CTX-5 ROUTING — Visual Story (Playwright)', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/')
        await createProject(page, TEST_PROJECT_NAME, '/tmp/e2e-routing')
    })

    test('step 1: ProjectGrid and project card are visible on "/"', async ({
        page,
    }) => {
        await expect(
            page.getByRole('link', { name: TEST_PROJECT_NAME }),
        ).toBeVisible()

        await page.screenshot({
            path: `${EVIDENCE}/routing_step1_project_grid.png`,
            fullPage: true,
        })
    })

    test('step 2-3: clicking a card navigates to Workspace', async ({
        page,
    }) => {
        await openWorkspaceFromCard(page, TEST_PROJECT_NAME)

        await page.screenshot({
            path: `${EVIDENCE}/routing_step3_workspace.png`,
            fullPage: true,
        })
    })

    test('step 4: browser back() returns to ProjectGrid', async ({ page }) => {
        await openWorkspaceFromCard(page, TEST_PROJECT_NAME)

        await page.screenshot({
            path: `${EVIDENCE}/routing_step4_before_back.png`,
            fullPage: true,
        })

        await page.goBack()

        await expect(page).toHaveURL('/')
        await expect(
            page.getByRole('link', { name: TEST_PROJECT_NAME }),
        ).toBeVisible()

        await page.screenshot({
            path: `${EVIDENCE}/routing_step4_after_back.png`,
            fullPage: true,
        })
    })

    test('step 5: ‹ Projects link returns to ProjectGrid', async ({ page }) => {
        await openWorkspaceFromCard(page, TEST_PROJECT_NAME)
        await page.getByTestId('back-to-projects').click()
        await expect(page).toHaveURL('/')
        await expect(
            page.getByRole('link', { name: TEST_PROJECT_NAME }),
        ).toBeVisible()
    })
})
