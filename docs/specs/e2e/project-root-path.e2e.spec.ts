/**
 * @context CTX-16: PROJECT ROOT PATH — E2E
 * @bom     docs/bom/project.ts
 * @note    Storybook で確認できないことのみを検証する。
 *          - rootPath フィールドを含む New Project Dialog でのプロジェクト作成
 *          - 作成されたプロジェクトのカードに rootPath が表示される
 *          - rootPath が空のまま作成しようとするとバリデーションエラーが表示される
 *
 *          Tauri dialog.open（実ダイアログ）は E2E では呼び出せないため、
 *          テキスト直接入力でのパス設定のみ検証する。
 */
import { test, expect } from '@playwright/test'

const ROOT_PATH = '/tmp/e2e-test-project'
const PROJECT_NAME = 'CTX-16 E2E Project'

/** rootPath を含むプロジェクト作成ヘルパー */
const createProjectWithRootPath = async (
    page: import('@playwright/test').Page,
    name: string,
    rootPath: string,
) => {
    const newProjectBtn = page.getByText('＋ new project')
    await expect(newProjectBtn).toBeEnabled({ timeout: 10000 })
    await newProjectBtn.click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.getByPlaceholder('My Awesome App').fill(name)
    await page.getByPlaceholder('/Users/user/projects/my-app').fill(rootPath)
    await page.getByRole('button', { name: '作成' }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 10000 })
}

test.describe('CTX-16 PROJECT ROOT PATH — Integration', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto('/')
    })

    /**
     * rootPath を入力してプロジェクトを作成できる
     */
    test.skip('rootPath を入力してプロジェクトを作成できる', async ({ page }) => {
        await createProjectWithRootPath(page, PROJECT_NAME, ROOT_PATH)

        await expect(page.getByRole('link', { name: PROJECT_NAME })).toBeVisible()

        await page.screenshot({ path: 'evidence/ctx16_project_created.png', fullPage: true })
    })

    /**
     * rootPath が空のまま作成ボタンを押すとバリデーションエラーが表示される
     */
    test.skip('rootPath が空のときバリデーションエラーが表示される', async ({ page }) => {
        const newProjectBtn = page.getByText('＋ new project')
        await expect(newProjectBtn).toBeEnabled({ timeout: 10000 })
        await newProjectBtn.click()
        await expect(page.getByRole('dialog')).toBeVisible()

        await page.getByPlaceholder('My Awesome App').fill(PROJECT_NAME)
        // rootPath は空のまま
        await page.getByRole('button', { name: '作成' }).click()

        // ダイアログが閉じずエラーが表示される
        await expect(page.getByRole('dialog')).toBeVisible()
        await expect(page.getByText('root path は必須です')).toBeVisible()

        await page.screenshot({ path: 'evidence/ctx16_validation_error.png', fullPage: true })
    })

    /**
     * 作成したプロジェクトのカードに rootPath が短縮表示される
     */
    test.skip('プロジェクトカードに rootPath が表示される', async ({ page }) => {
        await createProjectWithRootPath(page, PROJECT_NAME, ROOT_PATH)

        const card = page.getByRole('link', { name: PROJECT_NAME })
        await expect(card).toBeVisible()

        // rootPath の短縮表示（~/... 形式 or フルパス）が含まれる
        await expect(card.getByTestId('card-root-path')).toBeVisible()

        await page.screenshot({ path: 'evidence/ctx16_card_root_path.png', fullPage: true })
    })

})