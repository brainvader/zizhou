/**
 * プロジェクト配下の .zizhou/context パス SSOT。
 * ContextMap 定義の置き場。AppData には置かない。
 *
 * @see docs/context/ContextMap.projects.html
 */

export const ZIZHOU_DIR = '.zizhou'
export const ZIZHOU_CONTEXT_DIR = 'context'

/** rootPath 配下の .zizhou/context 絶対パス（スラッシュ正規化） */
export function zizhouContextPath(rootPath: string): string {
    const root = rootPath.replace(/[/\\]+$/, '').replace(/\\/g, '/')
    return `${root}/${ZIZHOU_DIR}/${ZIZHOU_CONTEXT_DIR}`
}
