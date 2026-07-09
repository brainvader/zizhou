/**
 * @tauri-apps/plugin-fs のテスト用モック。
 * VITE_PLAYWRIGHT=true のとき vite.config.ts の alias で差し替えられる。
 *
 * RootPathInput 等の props DI デフォルト実装向け。
 * グラフ永続化用の localStorage バックエンドは削除済み。
 */

export const exists = async (_path: string): Promise<boolean> => true

export const readTextFile = async (_path: string): Promise<string> => '[]'

export const writeTextFile = async (_path: string, _contents: string): Promise<void> => {}

export const readDir = async (_path: string) => []

export const mkdir = async (): Promise<void> => {}

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
