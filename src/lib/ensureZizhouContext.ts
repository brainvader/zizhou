import { exists, mkdir } from '@tauri-apps/plugin-fs'
import { zizhouContextPath } from '@/bom/zizhou-context'

export type ExistsFn = (path: string) => Promise<boolean>
export type MkdirFn = (
    path: string,
    options?: { recursive?: boolean },
) => Promise<void>

export type EnsureZizhouContextResult = 'created' | 'exists'

/**
 * .zizhou/context が存在するかを確認する。
 */
export async function hasZizhouContext(
    rootPath: string,
    onExists: ExistsFn = exists,
): Promise<boolean> {
    return onExists(zizhouContextPath(rootPath))
}

/**
 * .zizhou/context を冪等に用意する。
 * 既にあれば何もせず 'exists'。無ければ recursive mkdir して 'created'。
 * 既存ファイルは上書きしない。
 */
export async function ensureZizhouContext(
    rootPath: string,
    {
        onExists = exists,
        onMkdir = mkdir,
    }: {
        onExists?: ExistsFn
        onMkdir?: MkdirFn
    } = {},
): Promise<EnsureZizhouContextResult> {
    const path = zizhouContextPath(rootPath)
    if (await onExists(path)) return 'exists'
    await onMkdir(path, { recursive: true })
    return 'created'
}
