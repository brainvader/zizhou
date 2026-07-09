/**
 * @tauri-apps/plugin-fs のテスト用モック。
 * VITE_PLAYWRIGHT=true のとき vite.config.ts の alias で差し替えられる。
 *
 * .zizhou/context は mkdir されるまで exists=false（セットアップバナー検証用）。
 * それ以外のパスは exists=true。
 */

const createdDirs = new Set<string>()

function normalize(path: string): string {
    return path.replace(/\\/g, '/').replace(/\/+$/, '')
}

function isZizhouContextPath(path: string): boolean {
    return normalize(path).endsWith('/.zizhou/context')
}

/** E2E から状態をリセットする（window 経由） */
export function __resetFsMock(): void {
    createdDirs.clear()
}

if (typeof window !== 'undefined') {
    ;(window as unknown as { __resetFsMock?: () => void }).__resetFsMock =
        __resetFsMock
}

export const exists = async (path: string): Promise<boolean> => {
    const key = normalize(path)
    if (isZizhouContextPath(key)) {
        return createdDirs.has(key)
    }
    return true
}

export const readTextFile = async (_path: string): Promise<string> => '[]'

export const writeTextFile = async (
    _path: string,
    _contents: string,
): Promise<void> => {}

export const readDir = async (_path: string) => []

export const mkdir = async (
    path: string,
    _options?: { recursive?: boolean },
): Promise<void> => {
    createdDirs.add(normalize(path))
}

export const BaseDirectory = {
    AppData: 14,
}

export const watch = async (
    _path: string,
    _callback: () => void,
    _options?: { recursive?: boolean },
): Promise<() => void> => {
    return () => {}
}
