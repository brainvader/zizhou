import { expect, type Page } from '@playwright/test'

/** プロジェクト作成（rootPath 付き） */
export async function createProject(
    page: Page,
    name: string,
    rootPath = '/tmp/e2e-test',
): Promise<void> {
    const newProjectBtn = page.getByText('＋ new project')
    await expect(newProjectBtn).toBeEnabled({ timeout: 10_000 })
    await newProjectBtn.click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.getByPlaceholder('My Awesome App').fill(name)
    await page.getByPlaceholder('/Users/user/projects/my-app').fill(rootPath)
    await page.getByRole('button', { name: '作成' }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 10_000 })
}

/** カードから Workspace（graph）へ遷移し、シェル表示を待つ */
export async function openWorkspaceFromCard(
    page: Page,
    projectName: string,
): Promise<void> {
    await page.getByRole('link', { name: projectName }).click()
    await expect(page).toHaveURL(/\/workspace/)
    await expect(page.getByTestId('workspace-route')).toBeVisible({
        timeout: 10_000,
    })
}

/** fs モックの .zizhou/context 作成状態をリセット */
export async function resetFsMock(page: Page): Promise<void> {
    await page.evaluate(() => {
        ;(window as unknown as { __resetFsMock?: () => void }).__resetFsMock?.()
    })
}
